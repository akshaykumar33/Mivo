/**
 * Master Unified Test Runner for Mivo Platform
 * Executes Unit Tests, Integration Tests, and E2E Tests with a formatted summary report.
 */

import { execSync } from 'child_process';
import path from 'path';

const TEST_FILES = [
  // 1. Unit Tests
  'tests/unit/translation-engine.test.js',
  'tests/unit/mom-compiler.test.js',
  'tests/unit/rbac-permissions.test.js',

  // 2. Integration Tests
  'tests/integration/auth-flow.test.js',
  'tests/integration/channel-room.test.js',
  'tests/integration/messaging-stream.test.js',

  // 3. E2E Tests
  'tests/e2e/multi-user-calling.test.js',
  'tests/e2e/host-moderation.test.js',
  'tests/e2e/recording-consent.test.js',
  'tests/e2e/whisper-mom-email.test.js',
];

console.log('═══════════════════════════════════════════════════════════════');
console.log('🧪 MIVO PLATFORM — MASTER UNIFIED TEST RUNNER');
console.log('═══════════════════════════════════════════════════════════════\n');

let passedCount = 0;
let failedCount = 0;

for (const file of TEST_FILES) {
  try {
    execSync(`node ${file}`, { stdio: 'inherit' });
    passedCount++;
  } catch (err) {
    console.error(`❌ Suite Failed: ${file}`);
    failedCount++;
  }
}

console.log('═══════════════════════════════════════════════════════════════');
console.log(`📊 FINAL TEST RUN RESULTS: ${passedCount}/${TEST_FILES.length} SUITES PASSED`);
if (failedCount === 0) {
  console.log('🎉 100% SUCCESS — ALL TEST SUITES VERIFIED OPERATIONAL!');
} else {
  console.error(`⚠️ ${failedCount} suite(s) failed.`);
}
console.log('═══════════════════════════════════════════════════════════════\n');

if (failedCount > 0) {
  process.exit(1);
}
