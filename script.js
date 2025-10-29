// Helper: map numeric confidence to verdict label
function scoreToLabel(score) {
  if (score < 40) return "Likely Human";
  if (score < 60) return "Mixed";
  if (score < 80) return "Possibly AI";
  return "Likely AI";
}

// Text detection
function detectText(text) {
  const cleaned = text.trim();
  const wordMatches = cleaned.match(/\b\w+\b/g) || [];
  const sentences = cleaned.split(/[.!?]+/).map(s => s.trim()).filter(Boolean);

  const flags = [];
  const reasons = [];

  // Average sentence length
  if (sentences.length) {
    const wordCounts = sentences.map(s => (s.match(/\b\w+\b/g) || []).length);
    const avgLen = wordCounts.reduce((a, b) => a + b, 0) / wordCounts.length;
    if (avgLen < 10 || avgLen > 25) {
      flags.push("unusual average sentence length");
      reasons.push(`Average sentence length is ${avgLen.toFixed(1)} words`);
    }
  }

  // Lexical diversity
  const uniqueWords = new Set(wordMatches.map(w => w.toLowerCase()));
  const lexDiv = uniqueWords.size / Math.max(wordMatches.length, 1);
  if (lexDiv < 0.4) {
    flags.push("low lexical diversity");
    reasons.push(`Lexical diversity is ${lexDiv.toFixed(2)}`);
  }

  // Generic transitions
  const transitions = (cleaned.match(/\b(Furthermore|Moreover|Additionally|However|In conclusion|On the other hand)\b/gi) || []).length;
  if (transitions >= 3) {
    flags.push("overuse of generic transitions");
    reasons.push(`${transitions} generic transitions detected`);
  }

  // Capitalised words as proxy for named entities
  const capitals = (cleaned.match(/\b[A-Z][a-z]{2,}\b/g) || []).length;
  if (capitals < 2) {
    flags.push("few named entities");
    reasons.push(`Only ${capitals} capitalised terms detected`);
  }

  const confidence = Math.min(30 + 15 * flags.length, 100);
  return {
    modality: "text",
    verdict: scoreToLabel(confidence),
    confidence,
    flags,
    key_reasons: reasons,
    notes_for_user: flags.length ? "Request sources or a draft-with-prompts disclosure." : "None"
  };
}

// Image detection (simple edge density heuristic)
function detectImage(file) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, img.width, img.height).data;
      let edges = 0;
      const width = img.width;
      const height = img.height;
      const sobel = [
        [-1, 0, 1],
        [-2, 0, 2],
        [-1, 0, 1]
      ];
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          let gxR = 0, gxG = 0, gxB = 0;
          let gyR = 0, gyG = 0, gyB = 0;
          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              const px = (y + ky) * width + (x + kx);
              const idx = px * 4;
              const r = data[idx], g = data[idx + 1], b = data[idx + 2];
              gxR += sobel[ky + 1][kx + 1] * r;
              gxG += sobel[ky + 1][kx + 1] * g;
              gxB += sobel[ky + 1][kx + 1] * b;
              gyR += sobel[kx + 1][ky + 1] * r;
              gyG += sobel[kx + 1][ky + 1] * g;
              gyB += sobel[kx + 1][ky + 1] * b;
            }
          }
          const mag = Math.sqrt((gxR * gxR + gyR * gyR) + (gxG * gxG + gyG * gyG) + (gxB * gxB + gyB * gyB));
          if (mag > 1000) edges++;
        }
      }
      const edgeRatio = edges / (width * height);
      const flags = [];
      const reasons = [];
      if (edgeRatio < 0.01) {
        flags.push("unnaturally smooth image");
        reasons.push("Edge density extremely low, suggesting synthetic rendering");
      } else if (edgeRatio > 0.25) {
        flags.push("excessive fine detail");
        reasons.push("Edge density very high, atypical of natural photos");
      }
      const confidence = Math.min(50 + 15 * flags.length, 95);
      resolve({
        modality: "image",
        verdict: scoreToLabel(confidence),
        confidence,
        flags,
        key_reasons: reasons,
        notes_for_user: flags.length ? "Ask for the original file or a burst sequence from the camera." : "None"
      });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve({
        modality: "image",
        verdict: "Mixed",
        confidence: 50,
        flags: ["unreadable image data"],
        key_reasons: ["Image could not be parsed"],
        notes_for_user: "Provide a valid image file."
      });
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

// Video detection (sample 5 frames and aggregate)
function detectVideo(file) {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    const url = URL.createObjectURL(file);
    video.onloadedmetadata = () => {
      const duration = video.duration;
      const sampleTimes = [];
      for (let i = 0; i < 5; i++) {
        sampleTimes.push((duration / 4) * i);
      }
      const frameResults = [];
      let processed = 0;

      function captureFrame(time) {
        video.currentTime = Math.min(time, duration - 0.1);
      }

      video.onseeked = () => {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          detectImage(blob).then((res) => {
            frameResults.push(res);
            processed++;
            if (processed < sampleTimes.length) {
              captureFrame(sampleTimes[processed]);
            } else {
              const avgConf = frameResults.reduce((s, r) => s + r.confidence, 0) / frameResults.length;
              const flags = [...new Set(frameResults.flatMap(r => r.flags))];
              const reasons = [...new Set(frameResults.flatMap(r => r.key_reasons))];
              resolve({
                modality: "video",
                verdict: scoreToLabel(avgConf),
                confidence: avgConf,
                flags,
                key_reasons: reasons,
                notes_for_user: flags.length ? "Ask for an alternate angle or longer continuous take." : "None"
              });
              URL.revokeObjectURL(url);
            }
          });
        }, "image/png");
      };
      captureFrame(sampleTimes[0]);
    };
    video.onerror = () => {
      resolve({
        modality: "video",
        verdict: "Mixed",
        confidence: 50,
        flags: ["unreadable video file"],
        key_reasons: ["Video could not be parsed"],
        notes_for_user: "Provide a valid video file."
      });
      URL.revokeObjectURL(url);
    };
    video.src = url;
  });
}

// Audio detection (variance of waveform)
function detectAudio(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = function (e) {
      const arrayBuffer = e.target.result;
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioContext();
      audioCtx.decodeAudioData(arrayBuffer).then((audioBuffer) => {
        const channelData = audioBuffer.getChannelData(0);
        let sum = 0, sumSq = 0;
        for (let i = 0; i < channelData.length; i++) {
          sum += channelData[i];
          sumSq += channelData[i] * channelData[i];
        }
        const mean = sum / channelData.length;
        const variance = sumSq / channelData.length - mean * mean;
        const flags = [];
        const reasons = [];
        if (variance < 0.001) {
          flags.push("very low amplitude variability");
          reasons.push(`Amplitude variance is ${variance.toFixed(4)}`);
        }
        if (variance > 0.1) {
          flags.push("excessive amplitude variability");
          reasons.push(`Amplitude variance is ${variance.toFixed(4)}`);
        }
        const confidence = Math.min(50 + 15 * flags.length, 95);
        resolve({
          modality: "audio",
          verdict: scoreToLabel(confidence),
          confidence,
          flags,
          key_reasons: reasons,
          notes_for_user: flags.length ? "Ask for a live verification phrase." : "None"
        });
      }).catch(() => {
        resolve({
          modality: "audio",
          verdict: "Mixed",
          confidence: 50,
          flags: ["unreadable or unsupported audio file"],
          key_reasons: ["Audio could not be parsed"],
          notes_for_user: "Provide a valid audio file."
        });
      });
    };
    reader.onerror = () => {
      resolve({
        modality: "audio",
        verdict: "Mixed",
        confidence: 50,
        flags: ["unreadable or unsupported audio file"],
        key_reasons: ["Audio could not be parsed"],
        notes_for_user: "Provide a valid audio file."
      });
    };
    reader.readAsArrayBuffer(file);
  });
}

// UI logic
document.addEventListener("DOMContentLoaded", () => {
  const tabs = document.querySelectorAll(".tab");
  const panels = document.querySelectorAll(".panel");
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      const targetId = tab.dataset.target;
      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      panels.forEach(p => p.classList.remove("active"));
      document.getElementById(targetId).classList.add("active");
      document.getElementById("result-container").classList.add("hidden");
    });
  });
  document.getElementById("year").textContent = new Date().getFullYear();
  function displayResult(data) {
    const container = document.getElementById("result-container");
    const card = document.getElementById("result-card");
    const lines = [];
    lines.push(`Modality: ${data.modality}`);
    lines.push(`Verdict: ${data.verdict} (${Math.round(data.confidence)}%)`);
    if (data.flags && data.flags.length) lines.push(`Flags: ${data.flags.join(", ")}`);
    if (data.key_reasons && data.key_reasons.length) {
      lines.push("Key reasons:");
      data.key_reasons.forEach(r => lines.push("  - " + r));
    }
    if (data.notes_for_user && data.notes_for_user !== "None") {
      lines.push("Next steps: " + data.notes_for_user);
    }
    card.textContent = lines.join("\n");
    container.classList.remove("hidden");
  }
  document.getElementById("analyze-text").addEventListener("click", () => {
    const text = document.getElementById("text-input").value;
    if (!text.trim()) {
      alert("Please provide some text to analyse.");
      return;
    }
    const result = detectText(text);
    displayResult(result);
  });
  document.getElementById("analyze-image").addEventListener("click", () => {
    const input = document.getElementById("image-file");
    if (!input.files || !input.files.length) {
      alert("Please select an image file.");
      return;
    }
    detectImage(input.files[0]).then(displayResult);
  });
  document.getElementById("analyze-video").addEventListener("click", () => {
    const input = document.getElementById("video-file");
    if (!input.files || !input.files.length) {
      alert("Please select a video file.");
      return;
    }
    detectVideo(input.files[0]).then(displayResult);
  });
  document.getElementById("analyze-audio").addEventListener("click", () => {
    const input = document.getElementById("audio-file");
    if (!input.files || !input.files.length) {
      alert("Please select an audio file.");
      return;
    }
    detectAudio(input.files[0]).then(displayResult);
  });
  document.getElementById("close-result").addEventListener("click", () => {
    document.getElementById("result-container").classList.add("hidden");
  });
});