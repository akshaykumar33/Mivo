/**
 * Master Modular Test Runner for Mivo Platform
 * Traverses all 7 module directories executing unit, integration, and e2e suites.
 */

import { execSync } from 'child_process';

const MODULE_TESTS = [
  // 1. Auth & Identity Module
  { module: 'auth-identity', file: 'tests/modules/auth-identity/unit/password-hash.unit.test.js' },
  { module: 'auth-identity', file: 'tests/modules/auth-identity/unit/slack-status-availability.unit.test.js' },
  { module: 'auth-identity', file: 'tests/modules/auth-identity/integration/login-session.integration.test.js' },
  { module: 'auth-identity', file: 'tests/modules/auth-identity/integration/slack-status-availability.integration.test.js' },
  { module: 'auth-identity', file: 'tests/modules/auth-identity/e2e/multi-user-auth.e2e.test.js' },

  // 2. Communities & RBAC Module
  { module: 'communities-rbac', file: 'tests/modules/communities-rbac/unit/permission-matrix.unit.test.js' },
  { module: 'communities-rbac', file: 'tests/modules/communities-rbac/integration/channel-privacy.integration.test.js' },
  { module: 'communities-rbac', file: 'tests/modules/communities-rbac/e2e/community-lifecycle.e2e.test.js' },

  // 3. Messaging & Chat Module
  { module: 'messaging-chat', file: 'tests/modules/messaging-chat/unit/message-formatter.unit.test.js' },
  { module: 'messaging-chat', file: 'tests/modules/messaging-chat/unit/auto-disappearing-messages.unit.test.js' },
  { module: 'messaging-chat', file: 'tests/modules/messaging-chat/integration/message-retention-db.integration.test.js' },
  { module: 'messaging-chat', file: 'tests/modules/messaging-chat/integration/message-persistence.integration.test.js' },
  { module: 'messaging-chat', file: 'tests/modules/messaging-chat/integration/socket-realtime-flow.integration.test.js' },
  { module: 'messaging-chat', file: 'tests/modules/messaging-chat/integration/direct-group-messaging.integration.test.js' },
  { module: 'messaging-chat', file: 'tests/modules/messaging-chat/e2e/chat-translation-tts.e2e.test.js' },

  // 4. WebRTC Media Stage Module
  { module: 'webrtc-media-stage', file: 'tests/modules/webrtc-media-stage/unit/equalizer-decibels.unit.test.js' },
  { module: 'webrtc-media-stage', file: 'tests/modules/webrtc-media-stage/integration/room-mode-switcher.integration.test.js' },
  { module: 'webrtc-media-stage', file: 'tests/modules/webrtc-media-stage/e2e/webrtc-mesh-calling.e2e.test.js' },

  // 5. Host Moderation Module
  { module: 'host-moderation', file: 'tests/modules/host-moderation/unit/host-action-validator.unit.test.js' },
  { module: 'host-moderation', file: 'tests/modules/host-moderation/integration/host-permission-gate.integration.test.js' },
  { module: 'host-moderation', file: 'tests/modules/host-moderation/e2e/remote-mute-kick-transfer.e2e.test.js' },

  // 6. AI Scribe & MOM Module
  { module: 'ai-scribe-mom', file: 'tests/modules/ai-scribe-mom/unit/translation-dictionary.unit.test.js' },
  { module: 'ai-scribe-mom', file: 'tests/modules/ai-scribe-mom/unit/mom-markdown-generator.unit.test.js' },
  { module: 'ai-scribe-mom', file: 'tests/modules/ai-scribe-mom/integration/email-summary-dispatch.integration.test.js' },
  { module: 'ai-scribe-mom', file: 'tests/modules/ai-scribe-mom/integration/stage-cohost-duplex.integration.test.js' },
  { module: 'ai-scribe-mom', file: 'tests/modules/ai-scribe-mom/e2e/live-whisper-mom-flow.e2e.test.js' },

  // 7. Recording & Compliance Module
  { module: 'recording-compliance', file: 'tests/modules/recording-compliance/unit/recording-duration-timer.unit.test.js' },
  { module: 'recording-compliance', file: 'tests/modules/recording-compliance/integration/socket-rec-broadcast.integration.test.js' },
  { module: 'recording-compliance', file: 'tests/modules/recording-compliance/e2e/consent-banner-download.e2e.test.js' },

  // 8. Universal File Viewer & Media Streamer Module
  { module: 'file-viewer', file: 'tests/modules/files/unit/file-viewer.unit.test.js' },
  { module: 'file-viewer', file: 'tests/modules/files/unit/video-optimizer.unit.test.js' },
];

console.log('═══════════════════════════════════════════════════════════════');
console.log('🧪 MIVO PLATFORM — MASTER MODULAR TEST RUNNER');
console.log('═══════════════════════════════════════════════════════════════\n');

let passedCount = 0;
let failedCount = 0;

for (const test of MODULE_TESTS) {
  try {
    execSync(`node --experimental-strip-types ${test.file}`, { stdio: 'inherit' });
    passedCount++;
  } catch (err) {
    console.error(`❌ Test Failed: ${test.file}`);
    failedCount++;
  }
}

console.log('═══════════════════════════════════════════════════════════════');
console.log(`📊 FINAL MODULAR TEST RUN RESULTS: ${passedCount}/${MODULE_TESTS.length} SUITES PASSED`);
if (failedCount === 0) {
  console.log(`🎉 100% SUCCESS — ALL 7 MODULES & ${MODULE_TESTS.length} TEST SUITES VERIFIED OPERATIONAL!`);
} else {
  console.error(`⚠️ ${failedCount} suite(s) failed.`);
}
console.log('═══════════════════════════════════════════════════════════════\n');

if (failedCount > 0) {
  process.exit(1);
}
