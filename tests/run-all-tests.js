/**
 * Master Modular Test Runner for Mivo Platform
 * Traverses all module directories executing unit, integration, and e2e suites.
 * Automatically checks and manages backend server lifecycle if not running.
 */

import { execSync, spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

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
  { module: 'communities-rbac', file: 'tests/modules/communities-rbac/integration/single-org-tenancy.integration.test.js' },
  { module: 'communities-rbac', file: 'tests/modules/communities-rbac/e2e/community-lifecycle.e2e.test.js' },

  // 3. Messaging & Chat Module
  { module: 'messaging-chat', file: 'tests/modules/messaging-chat/unit/message-formatter.unit.test.js' },
  { module: 'messaging-chat', file: 'tests/modules/messaging-chat/unit/auto-disappearing-messages.unit.test.js' },
  { module: 'messaging-chat', file: 'tests/modules/messaging-chat/unit/replies-and-threads.unit.test.js' },
  { module: 'messaging-chat', file: 'tests/modules/messaging-chat/integration/message-retention-db.integration.test.js' },
  { module: 'messaging-chat', file: 'tests/modules/messaging-chat/integration/message-persistence.integration.test.js' },
  { module: 'messaging-chat', file: 'tests/modules/messaging-chat/integration/socket-realtime-flow.integration.test.js' },
  { module: 'messaging-chat', file: 'tests/modules/messaging-chat/integration/direct-group-messaging.integration.test.js' },
  { module: 'messaging-chat', file: 'tests/modules/messaging-chat/e2e/chat-translation-tts.e2e.test.js' },

  // 4. WebRTC Media Stage Module
  { module: 'webrtc-media-stage', file: 'tests/modules/webrtc-media-stage/unit/equalizer-decibels.unit.test.js' },
  { module: 'webrtc-media-stage', file: 'tests/modules/webrtc-media-stage/unit/auto-arranging-grid.unit.test.js' },
  { module: 'webrtc-media-stage', file: 'tests/modules/webrtc-media-stage/unit/floating-pip.unit.test.js' },
  { module: 'webrtc-media-stage', file: 'tests/modules/webrtc-media-stage/unit/spotlight-focus-mode.unit.test.js' },
  { module: 'webrtc-media-stage', file: 'tests/modules/webrtc-media-stage/unit/dynamic-audio-bitrate.unit.test.js' },
  { module: 'webrtc-media-stage', file: 'tests/modules/webrtc-media-stage/integration/room-mode-switcher.integration.test.js' },
  { module: 'webrtc-media-stage', file: 'tests/modules/webrtc-media-stage/integration/audio-bitrate-dynamic-switching.integration.test.js' },
  { module: 'webrtc-media-stage', file: 'tests/modules/webrtc-media-stage/e2e/hd-conference-audio-bitrates.e2e.test.js' },
  { module: 'webrtc-media-stage', file: 'tests/modules/webrtc-media-stage/e2e/spotlight-focus-mode.e2e.test.js' },
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

  // 9. Hyper Stage Features: 6th Mode Canvas, 3D Spatial Audio, Spoken Voice Tickets
  { module: 'canvas-spatial-tickets', file: 'tests/modules/canvas-spatial-tickets/integration/canvas-spatial-tickets.integration.test.js' },

  // 10. Futuristic & Architectural Hyper Features: SFU, E2EE, Code Stage, AI Twin, Ambient Focus, Mini-Apps, CRDT
  { module: 'hyper-architectural-features', file: 'tests/modules/hyper-architectural-features/hyper-architectural-features.integration.test.js' },
];

function checkServerLive() {
  return new Promise((resolve) => {
    const req = http.get('http://127.0.0.1:4000/health/live', (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1200, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForServer(timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await checkServerLive()) return true;
    await new Promise((r) => setTimeout(r, 600));
  }
  return false;
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🧪 MIVO PLATFORM — MASTER MODULAR TEST RUNNER');
  console.log('═══════════════════════════════════════════════════════════════\n');

  let serverProcess = null;
  const isRunning = await checkServerLive();

  if (!isRunning) {
    console.log('⚡ Server is offline. Booting Mivo backend server...');
    const distPath = path.resolve('apps/server/dist/main.js');
    if (!fs.existsSync(distPath)) {
      console.log('🔨 Building @mivo/server...');
      execSync('pnpm --filter @mivo/server build', { stdio: 'inherit' });
    }
    serverProcess = spawn('node', [distPath], {
      stdio: 'pipe',
      detached: false,
      env: process.env,
    });

    const isReady = await waitForServer(25000);
    if (!isReady) {
      console.error('❌ Failed to start Mivo backend server within timeout.');
      if (serverProcess) {
        try { process.kill(serverProcess.pid); } catch {}
      }
      process.exit(1);
    }
    console.log('✅ Server online and healthy on http://127.0.0.1:4000\n');
  } else {
    console.log('📡 Connected to active Mivo backend server on http://127.0.0.1:4000\n');
  }

  let passedCount = 0;
  let failedCount = 0;

  try {
    for (const test of MODULE_TESTS) {
      try {
        execSync(`node --experimental-strip-types ${test.file}`, { stdio: 'inherit' });
        passedCount++;
      } catch (err) {
        console.error(`❌ Test Failed: ${test.file}`);
        failedCount++;
      }
    }
  } finally {
    if (serverProcess) {
      console.log('\n🧹 Gracefully stopping ephemeral test server...');
      try {
        if (process.platform === 'win32') {
          execSync(`taskkill /pid ${serverProcess.pid} /T /F`, { stdio: 'ignore' });
        } else {
          serverProcess.kill('SIGTERM');
        }
      } catch {}
    }
  }

  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`📊 FINAL MODULAR TEST RUN RESULTS: ${passedCount}/${MODULE_TESTS.length} SUITES PASSED`);
  if (failedCount === 0) {
    console.log(`🎉 100% SUCCESS — ALL ${MODULE_TESTS.length} TEST SUITES VERIFIED OPERATIONAL!`);
  } else {
    console.error(`⚠️ ${failedCount} suite(s) failed.`);
  }
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
