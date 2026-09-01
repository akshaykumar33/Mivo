/**
 * Module: recording-compliance
 * Unit Test: Recording Elapsed Duration Formatting
 */

function formatRecordingTimer(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function run() {
  console.log('🧪 [recording-compliance/unit] Running recording-duration-timer.unit.test.js...');
  if (formatRecordingTimer(0) !== '00:00') throw new Error('0s format failed');
  if (formatRecordingTimer(65) !== '01:05') throw new Error('65s format failed');
  if (formatRecordingTimer(3600) !== '60:00') throw new Error('3600s format failed');

  console.log('   ✅ Recording elapsed timer formatting (mm:ss) verified.');
}

run();
