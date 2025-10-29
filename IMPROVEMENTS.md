# Future Improvements

## Dedicated detection modules

- **Text**: Integrate detectors like GPTZero, Copyleaks or Turnitin to analyze perplexity, burstiness and other stylistic features. Present confidence scores and highlight suspected AI-generated sentences.
- **Images**: Use pixel-level anomaly detectors (e.g., Hive or Sensity) that analyze color patterns and textures to flag signs of AI generation. Provide heatmaps showing suspicious regions.
- **Video**: Detect deepfakes by analyzing frame-to-frame consistency, lip-sync and audio–visual alignment. Combine visual and audio analysis to identify unnatural motion or mismatched speech.
- **Audio**: Incorporate voice-fraud detectors that examine speech flow, prosody, tone and breathing patterns, and compare recordings to known voice prints.

## Use-case: Essay detection for educators

- Provide a colour-coded breakdown of student essays showing which sentences likely originate from AI and which are human-written. Include readability, perplexity and burstiness metrics.
- Compare the style of an assignment to a student’s previous writing samples to flag abrupt style shifts.
- Offer guidance on designing assignments that minimise AI misuse, such as requiring personal reflection, creative tasks and in-class writing.

## Deepfake detection for video and images

- Identify unnatural facial movements, lighting inconsistencies and missing camera metadata in videos and images.
- Cross-check for digital watermarks or fingerprints inserted by generative models.
- Present evidence, such as flagged frames or anomaly maps, so users can understand why a clip or image is suspicious.

## AI voice detection to prevent deception

- Implement voice-print verification to confirm the identity of known speakers.
- Analyse background noise, breathing patterns and prosody for anomalies indicative of synthetic voices.

## Architectural considerations

- Keep each detection type modular so that services can be swapped or combined. Use separate API endpoints for text, image, video and audio analysis.
- Update detection models regularly to handle new AI-generation techniques.
- Report results as probabilities or confidence scores rather than definitive judgements, and include explanations so users understand the limitations of detection.
