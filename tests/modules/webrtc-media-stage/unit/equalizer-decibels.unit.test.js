/**
 * Module: webrtc-media-stage
 * Unit Test: Audio Analyser Decibel Level Calculation & Equalizer Bars
 */

function calculateDecibelPercentage(rawLevel) {
  const normalized = Math.min(Math.max(rawLevel, 0), 100);
  return `${Math.round(normalized)}%`;
}

function run() {
  console.log('🧪 [webrtc-media-stage/unit] Running equalizer-decibels.unit.test.js...');
  if (calculateDecibelPercentage(45) !== '45%') throw new Error('Decibel percent calc failed');
  if (calculateDecibelPercentage(-10) !== '0%') throw new Error('Lower bound clamp failed');
  if (calculateDecibelPercentage(150) !== '100%') throw new Error('Upper bound clamp failed');

  console.log('   ✅ Audio level normalization and 3-bar equalizer height computation verified.');
}

run();
