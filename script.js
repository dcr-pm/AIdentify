/*
 * script.js
 *
 * This script powers the unified AIdentify interface. It manages mode selection,
 * input handling for text, image, audio, and video links, triggers analysis
 * (stubbed functions that you can replace with real API calls), displays
 * results, manages history, and handles export actions like copy, JSON, and
 * PDF downloads.
 */

// State variables
let mode = "text";
let inputValue = "";
let selectedFile = null;
let results = null;
let history = [];

// DOM elements
const modeButtons = document.querySelectorAll('.mode-btn');
const textInput = document.getElementById('text-input');
const imageInput = document.getElementById('image-input');
const imageFile = document.getElementById('image-file');
const imageFileName = document.getElementById('image-file-name');
const audioInput = document.getElementById('audio-input');
const audioFile = document.getElementById('audio-file');
const audioFileName = document.getElementById('audio-file-name');
const videoInput = document.getElementById('video-input');
const analyseBtn = document.getElementById('analyse-btn');
const clearBtn = document.getElementById('clear-btn');
const placeholder = document.getElementById('placeholder');
const resultContainer = document.getElementById('result');
const resultVerdict = document.getElementById('result-verdict');
const resultConfidence = document.getElementById('result-confidence');
const evidenceContainer = document.getElementById('evidence-container');
const resultEvidence = document.getElementById('result-evidence');
const stakeholderContainer = document.getElementById('stakeholder-container');
const stakeholderList = document.getElementById('stakeholder-list');
const copyBtn = document.getElementById('copy-btn');
const jsonBtn = document.getElementById('json-btn');
const pdfBtn = document.getElementById('pdf-btn');
const historySection = document.getElementById('history');
const historyList = document.getElementById('history-list');

// Initialize event listeners
function init() {
  // Mode buttons
  modeButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const newMode = btn.getAttribute('data-mode');
      if (newMode !== mode) {
        setMode(newMode);
      }
    });
  });

  // Text input
  textInput.addEventListener('input', () => {
    inputValue = textInput.value;
    updateAnalyseButton();
  });

  // Image file input
  imageFile.addEventListener('change', () => {
    if (imageFile.files && imageFile.files[0]) {
      selectedFile = imageFile.files[0];
      imageFileName.textContent = selectedFile.name;
      inputValue = '';
    } else {
      selectedFile = null;
      imageFileName.textContent = '';
    }
    updateAnalyseButton();
  });

  // Audio file input
  audioFile.addEventListener('change', () => {
    if (audioFile.files && audioFile.files[0]) {
      selectedFile = audioFile.files[0];
      audioFileName.textContent = selectedFile.name;
      inputValue = '';
    } else {
      selectedFile = null;
      audioFileName.textContent = '';
    }
    updateAnalyseButton();
  });

  // Video link input
  videoInput.addEventListener('input', () => {
    inputValue = videoInput.value;
    updateAnalyseButton();
  });

  // Analyse button
  analyseBtn.addEventListener('click', handleAnalyse);

  // Clear button
  clearBtn.addEventListener('click', clearAll);

  // Export actions
  copyBtn.addEventListener('click', copyResult);
  jsonBtn.addEventListener('click', downloadJson);
  pdfBtn.addEventListener('click', downloadPdf);

  // Initialize UI
  setMode('text');
  updateAnalyseButton();
}

// Set the current mode and update UI accordingly
function setMode(newMode) {
  mode = newMode;
  // Toggle active class on mode buttons
  modeButtons.forEach((btn) => {
    btn.classList.toggle('active', btn.getAttribute('data-mode') === mode);
  });
  // Show/hide input areas
  textInput.classList.add('hidden');
  imageInput.classList.add('hidden');
  audioInput.classList.add('hidden');
  videoInput.classList.add('hidden');
  if (mode === 'text') {
    textInput.classList.remove('hidden');
  } else if (mode === 'image') {
    imageInput.classList.remove('hidden');
  } else if (mode === 'audio') {
    audioInput.classList.remove('hidden');
  } else if (mode === 'video') {
    videoInput.classList.remove('hidden');
  }
  // Reset inputs and results
  clearAll();
}

// Enable or disable the Analyse button
function updateAnalyseButton() {
  let disabled = false;
  if (mode === 'text' || mode === 'video') {
    disabled = !inputValue.trim();
  } else if (mode === 'image' || mode === 'audio') {
    disabled = !selectedFile;
  }
  analyseBtn.disabled = disabled;
}

// Clear all inputs, results, and reset state (except mode)
function clearAll() {
  inputValue = '';
  selectedFile = null;
  results = null;
  // Clear text input
  textInput.value = '';
  // Clear file inputs and labels
  imageFile.value = '';
  imageFileName.textContent = '';
  audioFile.value = '';
  audioFileName.textContent = '';
  videoInput.value = '';
  // Hide result area and show placeholder
  resultContainer.classList.add('hidden');
  placeholder.classList.remove('hidden');
  // Clear history if needed? (we keep history)
  updateAnalyseButton();
}

// Handle Analyse button click
async function handleAnalyse() {
  // Determine which analysis function to call
  if (mode === 'text') {
    results = await fakeAnalyseText(inputValue);
  } else if (mode === 'image') {
    results = await fakeAnalyseImage(selectedFile);
  } else if (mode === 'audio') {
    results = await fakeAnalyseAudio(selectedFile);
  } else if (mode === 'video') {
    results = await fakeAnalyseVideo(inputValue);
  }
  // Display the results
  displayResults(results);
  // Add to history
  const entry = {
    id: Date.now(),
    mode,
    input: selectedFile ? selectedFile.name : inputValue,
    timestamp: new Date().toLocaleString(),
    result: results,
  };
  history.unshift(entry);
  if (history.length > 8) {
    history.pop();
  }
  updateHistory();
}

// Display results in the output panel
function displayResults(res) {
  if (!res) return;
  placeholder.classList.add('hidden');
  resultContainer.classList.remove('hidden');
  // Verdict and confidence
  resultVerdict.textContent = res.verdict;
  resultConfidence.textContent = `${(res.confidence * 100).toFixed(1)}%`;
  // Evidence
  if (res.evidence && res.evidence.length) {
    evidenceContainer.classList.remove('hidden');
    resultEvidence.innerHTML = '';
    res.evidence.forEach((item) => {
      const li = document.createElement('li');
      li.textContent = item;
      resultEvidence.appendChild(li);
    });
  } else {
    evidenceContainer.classList.add('hidden');
  }
  // Stakeholders
  if (res.stakeholders && res.stakeholders.length) {
    stakeholderContainer.classList.remove('hidden');
    stakeholderList.innerHTML = '';
    res.stakeholders.forEach((person) => {
      const div = document.createElement('div');
      div.classList.add('stakeholder');
      const nameEl = document.createElement('p');
      nameEl.classList.add('stakeholder-name');
      nameEl.textContent = person.name;
      const sentimentEl = document.createElement('p');
      sentimentEl.classList.add('stakeholder-sentiment');
      sentimentEl.textContent = `Sentiment: ${person.sentiment}`;
      const pointEl = document.createElement('p');
      pointEl.classList.add('stakeholder-point');
      pointEl.textContent = `Point: ${person.point}`;
      div.appendChild(nameEl);
      div.appendChild(sentimentEl);
      div.appendChild(pointEl);
      stakeholderList.appendChild(div);
    });
  } else {
    stakeholderContainer.classList.add('hidden');
  }
}

// Update history UI
function updateHistory() {
  if (history.length) {
    historySection.classList.remove('hidden');
    // Clear list
    historyList.innerHTML = '';
    history.forEach((item) => {
      const li = document.createElement('li');
      li.classList.add('history-item');
      const infoDiv = document.createElement('div');
      infoDiv.classList.add('history-info');
      const nameP = document.createElement('p');
      nameP.classList.add('history-name');
      nameP.textContent = item.input || '(untitled)';
      const modeP = document.createElement('p');
      modeP.classList.add('history-mode');
      modeP.textContent = `${item.mode.toUpperCase()} • ${item.timestamp}`;
      infoDiv.appendChild(nameP);
      infoDiv.appendChild(modeP);
      const confP = document.createElement('p');
      confP.textContent = `${(item.result.confidence * 100).toFixed(0)}%`;
      li.appendChild(infoDiv);
      li.appendChild(confP);
      historyList.appendChild(li);
    });
  } else {
    historySection.classList.add('hidden');
  }
}

// Export results: copy to clipboard
function copyResult() {
  if (!results) return;
  const jsonStr = JSON.stringify(results, null, 2);
  navigator.clipboard.writeText(jsonStr).then(() => {
    alert('Results copied to clipboard');
  });
}

// Export results: download JSON
function downloadJson() {
  if (!results) return;
  const jsonStr = JSON.stringify(results, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'analysis_result.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Export results: download PDF (simple placeholder)
function downloadPdf() {
  if (!results) return;
  // This is a simple placeholder: create a PDF-like text file.
  const pdfContent = `Verdict: ${results.verdict}\nConfidence: ${(results.confidence * 100).toFixed(1)}%\nEvidence:\n${results.evidence?.join('\n')}\nStakeholders:\n${results.stakeholders?.map((s) => `${s.name} - ${s.sentiment} - ${s.point}`).join('\n')}`;
  const blob = new Blob([pdfContent], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'analysis_result.pdf';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Stub analysis functions (replace with real API calls)
async function fakeAnalyseText(text) {
  await sleep(600);
  return {
    verdict: 'Likely authentic',
    confidence: 0.86,
    evidence: [
      'Readability metrics within normal bounds',
      'No unusual idioms detected',
    ],
    stakeholders: [
      {
        name: 'Speaker A',
        sentiment: 'Neutral',
        point: 'Asks for clarity on an issue',
      },
    ],
  };
}

async function fakeAnalyseImage(file) {
  await sleep(800);
  return {
    verdict: 'Likely manipulated',
    confidence: 0.72,
    evidence: [
      'ELA highlights inconsistencies',
      'Noise levels vary significantly',
    ],
    stakeholders: [],
  };
}

async function fakeAnalyseAudio(file) {
  await sleep(1000);
  return {
    verdict: 'Likely authentic',
    confidence: 0.91,
    evidence: [
      'Smooth prosody',
      'No voiceprint mismatches',
    ],
    stakeholders: [],
  };
}

async function fakeAnalyseVideo(url) {
  await sleep(1200);
  // Basic platform detection stub
  let platform = 'video';
  try {
    const hostname = new URL(url).hostname;
    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
      platform = 'YouTube';
    } else if (hostname.includes('tiktok.com')) {
      platform = 'TikTok';
    } else if (hostname.includes('instagram.com')) {
      platform = 'Instagram';
    }
  } catch (e) {
    // Invalid URL, treat as generic
  }
  return {
    verdict: 'Likely deepfake',
    confidence: 0.64,
    evidence: [
      'Lip sync mismatch',
      'Temporal jitter across frames',
      `Detected platform: ${platform}`,
    ],
    stakeholders: [],
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Initialize the app on DOMContentLoaded
document.addEventListener('DOMContentLoaded', init);
