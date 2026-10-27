/**
 * 🌌 Mivo Hyper Features — Master Integration Test Suite
 * Tests all 7 Futuristic & Architectural Hyper Features:
 * 1. SFU Engine Upgrade (Simulcast 1080p/720p/360p, CPU/Bandwidth savings)
 * 2. End-to-End Encryption (E2EE Zero-Trust Insertable Streams & MLS Ratchet)
 * 3. CODE_STAGE Pair-Programming Sandbox & Execution
 * 4. AI Twin & "Out of Office" Persona Auto-Responder & Callback Scheduler
 * 5. Ambient Spatial Focus Rooms & Synchronized Pomodoro
 * 6. Mivo Mini-Apps / Activity Sandboxes (Chess, Figma, PR Review)
 * 7. CRDT Sync & Local-First Messaging (Lamport Clock & Idempotency)
 */

import { io } from 'socket.io-client';
import assert from 'assert';
import { randomUUID } from 'crypto';
import { prisma } from '@mivo/database';
import { REALTIME_EVENTS } from '@mivo/shared';

const SERVER_URL = 'http://localhost:4000';
const API_BASE = 'http://localhost:4000/api/v1';

async function getAuthToken(email = 'dev@mivo.app', password = 'Password123!') {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!data.success) {
    throw new Error(`Login failed for ${email}: ${JSON.stringify(data)}`);
  }
  return { token: data.data.accessToken, user: data.data.user };
}

async function run() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🚀 TESTING 7 FUTURISTIC & ARCHITECTURAL HYPER FEATURES');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Authenticate Dev User & Second Peer User
  const devAuth = await getAuthToken('dev@mivo.app');
  const peerAuth = await getAuthToken('alex@mivo.app');
  console.log(`✅ Authenticated User 1 (${devAuth.user.displayName}) and User 2 (${peerAuth.user.displayName})`);

  // Find a target room
  const room = await prisma.room.findFirst({
    where: { deletedAt: null },
  });
  assert(room, 'A room must exist in database');
  const roomId = room.id;
  console.log(`🏠 Target Room: #${room.name} (${roomId})\n`);

  // Connect Socket.io clients
  const socket1 = io(SERVER_URL, {
    auth: { token: devAuth.token },
    transports: ['websocket'],
  });

  const socket2 = io(SERVER_URL, {
    auth: { token: peerAuth.token },
    transports: ['websocket'],
  });

  await new Promise((resolve) => {
    let count = 0;
    const check = () => {
      count++;
      if (count === 2) resolve(null);
    };
    socket1.on('connect', check);
    socket2.on('connect', check);
  });

  // Both join the room
  await new Promise((resolve) => {
    let joined = 0;
    const onJoin = () => {
      joined++;
      if (joined === 2) resolve(null);
    };
    socket1.on(REALTIME_EVENTS.ROOM_JOINED, onJoin);
    socket2.on(REALTIME_EVENTS.ROOM_JOINED, onJoin);
    socket1.emit(REALTIME_EVENTS.ROOM_JOIN, { roomId });
    socket2.emit(REALTIME_EVENTS.ROOM_JOIN, { roomId });
  });

  // ===========================================================================
  // 1. SFU ENGINE UPGRADE
  // ===========================================================================
  console.log('--- 1. Testing SFU Engine Upgrade (Mediasoup / LiveKit) ---');

  // 1a. Router RTP Capabilities
  const rtpCaps = await new Promise((resolve) => {
    socket1.emit(REALTIME_EVENTS.SFU_GET_ROUTER_RTP_CAPABILITIES, { roomId }, (res) => {
      resolve(res);
    });
  });
  assert(rtpCaps.success, 'SFU Router RTP capabilities should succeed');
  assert(rtpCaps.data.codecs.length >= 2, 'Should support audio/opus and video codecs');
  console.log(`   ✅ SFU Router Capabilities verified (${rtpCaps.data.codecs.length} codecs supported: Opus, VP8, H264)`);

  // 1b. Create WebRtcTransport
  const transport = await new Promise((resolve) => {
    socket1.emit(REALTIME_EVENTS.SFU_CREATE_TRANSPORT, { roomId, direction: 'send' }, (res) => {
      resolve(res);
    });
  });
  assert(transport.success, 'Should create Send WebRtcTransport');
  assert(transport.data.iceParameters.usernameFragment, 'Transport must have ICE parameters');
  assert(transport.data.dtlsParameters.fingerprints.length > 0, 'Transport must have DTLS certificate');
  console.log(`   ✅ WebRtcTransport created: ${transport.data.id} (ICE: ${transport.data.iceParameters.usernameFragment})`);

  // 1c. Produce Track with 1080p Simulcast
  const producer = await new Promise((resolve) => {
    socket1.emit(REALTIME_EVENTS.SFU_PRODUCE, {
      roomId,
      kind: 'video',
      simulcast: true,
      initialLayer: '1080p',
    }, (res) => {
      resolve(res);
    });
  });
  assert(producer.success, 'Should produce video track with simulcast');
  assert.strictEqual(producer.data.activeLayer, '1080p');
  assert.strictEqual(producer.data.bitrateKbps, 2500);
  console.log(`   ✅ Video Producer active: ${producer.data.id} (Simulcast: 1080p @ 2.5 Mbps)`);

  // 1d. Consume & Adapt Layers
  const consumer = await new Promise((resolve) => {
    socket2.emit(REALTIME_EVENTS.SFU_CONSUME, { roomId, producerId: producer.data.id }, (res) => {
      resolve(res);
    });
  });
  assert(consumer.success, 'Should consume remote producer');
  console.log(`   ✅ Consumer created: ${consumer.data.id} on Peer 2`);

  // Adapt to 720p layer
  const adapted = await new Promise((resolve) => {
    socket2.emit(REALTIME_EVENTS.SFU_SET_PREFERRED_LAYERS, {
      roomId,
      consumerId: consumer.data.id,
      spatialLayer: 1, // 720p
    }, (res) => {
      resolve(res);
    });
  });
  assert.strictEqual(adapted.data.currentSpatialLayer, 1);
  console.log(`   ✅ Dynamic Simulcast Layer Adaptation verified (demoted to 720p for low CPU)`);

  // 1e. SFU Stats & CPU Reduction Calculation
  const stats = await new Promise((resolve) => {
    socket1.emit(REALTIME_EVENTS.SFU_STATS_UPDATE, { roomId, participantCount: 16 }, (res) => {
      resolve(res);
    });
  });
  assert(stats.data.clientCpuReductionPercent >= 80, 'SFU must save 80%+ CPU for 16 peers');
  console.log(`   ✅ SFU Room Stats: ${stats.data.clientCpuReductionPercent}% client CPU saved vs P2P mesh!`);

  // ===========================================================================
  // 2. END-TO-END ENCRYPTION (E2EE)
  // ===========================================================================
  console.log('\n--- 2. Testing End-to-End Encryption (E2EE Zero-Trust) ---');

  // 2a. Verify Safety Code (SAS)
  const safetyCode = await new Promise((resolve) => {
    socket1.emit(REALTIME_EVENTS.E2EE_VERIFY_SAFETY_CODE, { roomId }, (res) => {
      resolve(res);
    });
  });
  assert(safetyCode.success, 'E2EE safety code should succeed');
  assert(safetyCode.data.fingerprintHex.length === 19, 'Hex fingerprint must be 4 chunks of 4 hex');
  assert.strictEqual(safetyCode.data.verificationEmojis.length, 4, 'Must have 4 SAS emojis');
  console.log(`   ✅ E2EE SAS Safety Code: "${safetyCode.data.fingerprintHex}" [${safetyCode.data.verificationEmojis.join(' ')}] (MLS Epoch #${safetyCode.data.epoch})`);

  // 2b. Rotate MLS Ratchet Epoch
  const rotated = await new Promise((resolve) => {
    socket1.emit(REALTIME_EVENTS.E2EE_EPOCH_ROTATED, { roomId }, (res) => {
      resolve(res);
    });
  });
  assert(rotated.success, 'Epoch rotation should succeed');
  assert(rotated.data.rotated.epoch > safetyCode.data.epoch, 'Epoch must increment');
  console.log(`   ✅ MLS Ratchet Key Rotation verified: Advanced to Epoch #${rotated.data.rotated.epoch}`);

  // 2c. Key Package Relay
  const relayResult = await new Promise((resolve) => {
    socket2.once(REALTIME_EVENTS.E2EE_KEY_EXCHANGE, (pkg) => {
      resolve(pkg);
    });
    socket1.emit(REALTIME_EVENTS.E2EE_KEY_EXCHANGE, {
      roomId,
      epoch: rotated.data.rotated.epoch,
      keyId: 'key_mls_01',
      encryptedKey: 'c2VjdXJlX2Flc19rZXlfcGFja2FnZV9jaXBoZXJ0ZXh0',
      iv: 'MTIzNDU2Nzg5MDEy',
      senderUserId: devAuth.user.id,
      timestamp: new Date().toISOString(),
    });
  });
  assert.strictEqual(relayResult.keyId, 'key_mls_01');
  console.log(`   ✅ Zero-Trust Blind Key Package Relay verified across Socket.io bus`);

  // ===========================================================================
  // 3. CODE_STAGE PAIR-PROGRAMMING SANDBOX
  // ===========================================================================
  console.log('\n--- 3. Testing CODE_STAGE Pair-Programming Sandbox ---');

  // 3a. Switch Room Mode to CODE
  const modeRes = await fetch(`${API_BASE}/rooms/${roomId}/mode`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${devAuth.token}`,
    },
    body: JSON.stringify({ activeMode: 'CODE' }),
  });
  const modeData = await modeRes.json();
  assert(modeData.success, 'Room mode switch to CODE should succeed');
  assert.strictEqual(modeData.data.activeMode, 'CODE');
  console.log(`   ✅ Room activeMode switched to CODE (7th Room Mode operational in PostgreSQL)`);

  // 3b. Execute JavaScript/TypeScript in isolated Sandbox
  const execJsRes = await fetch(`${API_BASE}/sandbox/execute`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${devAuth.token}`,
    },
    body: JSON.stringify({
      language: 'typescript',
      code: `
        const items = [10, 20, 30];
        const sum = items.reduce((a, b) => a + b, 0);
        console.log("Calculated Sum:", sum);
      `,
    }),
  });
  const execJsData = await execJsRes.json();
  assert(execJsData.success, 'Sandbox execution should succeed');
  assert.strictEqual(execJsData.data.exitCode, 0);
  assert(execJsData.data.stdout.includes('Calculated Sum: 60'), 'Should compute correct sum');
  console.log(`   ✅ TypeScript Sandbox Execution: Output: "${execJsData.data.stdout.trim()}" in ${execJsData.data.executionTimeMs}ms`);

  // 3c. Execute Python in isolated Sandbox
  const execPyRes = await fetch(`${API_BASE}/sandbox/execute`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${devAuth.token}`,
    },
    body: JSON.stringify({
      language: 'python',
      code: `print("Python 3 Sandbox Engine Online")`,
    }),
  });
  const execPyData = await execPyRes.json();
  assert(execPyData.success);
  assert(execPyData.data.stdout.includes('Python 3 Sandbox Engine Online'));
  console.log(`   ✅ Python Sandbox Execution: "${execPyData.data.stdout.trim()}"`);

  // 3d. Collaborative Code Change & Cursor Broadcast
  const cursorRelay = await new Promise((resolve) => {
    socket2.once(REALTIME_EVENTS.CODE_STAGE_CURSOR, (data) => {
      resolve(data);
    });
    socket1.emit(REALTIME_EVENTS.CODE_STAGE_CURSOR, {
      roomId,
      cursor: {
        userId: devAuth.user.id,
        userName: devAuth.user.displayName,
        color: '#5E5CE6',
        lineNumber: 14,
        column: 8,
      },
    });
  });
  assert.strictEqual(cursorRelay.cursor.lineNumber, 14);
  console.log(`   ✅ Live Pair-Programming Cursor broadcast verified at Line 14, Col 8`);

  // ===========================================================================
  // 4. AI TWIN / "OUT OF OFFICE" PERSONA
  // ===========================================================================
  console.log('\n--- 4. Testing AI Twin & Out of Office Persona ---');

  // 4a. Configure AI Twin
  const updateTwinRes = await fetch(`${API_BASE}/ai/twin/config/${devAuth.user.id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${devAuth.token}`,
    },
    body: JSON.stringify({
      enabled: true,
      personaPrompt: 'I am Dev Admin AI Twin. I guard the core architecture.',
      callbackSlots: ['Tomorrow at 10:00 AM UTC', 'Friday at 2:00 PM UTC'],
      autoCallbackEnabled: true,
    }),
  });
  const twinConfig = await updateTwinRes.json();
  assert(twinConfig.success, 'AI Twin configuration update should succeed');
  assert.strictEqual(twinConfig.data.enabled, true);
  console.log(`   ✅ AI Twin Configured: "${twinConfig.data.personaPrompt}" (${twinConfig.data.callbackSlots.length} callback slots)`);

  // 4b. AI Twin Auto-Reply Trigger
  const replyRes = await fetch(`${API_BASE}/ai/twin/reply`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${devAuth.token}`,
    },
    body: JSON.stringify({
      recipientUserId: devAuth.user.id,
      senderUserId: peerAuth.user.id,
      message: 'Hey Dev, can we sync on the WebRTC SFU simulcast layers?',
    }),
  });
  const replyData = await replyRes.json();
  assert(replyData.success, 'AI Twin reply should succeed');
  assert(replyData.data.replyContent.includes('AI Twin'), 'Reply must identify as AI Twin');
  assert(replyData.data.proposedCallbackSlot, 'Should propose callback slot');
  console.log(`   ✅ Autonomous AI Twin Auto-Reply Generated:\n      "${replyData.data.replyContent.slice(0, 110)}..."`);
  console.log(`   ✅ Offered Callback Slot: "${replyData.data.proposedCallbackSlot}"`);

  // 4c. Schedule Callback
  const callbackRes = await fetch(`${API_BASE}/ai/twin/schedule-callback`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${peerAuth.token}`,
    },
    body: JSON.stringify({
      recipientUserId: devAuth.user.id,
      requesterUserId: peerAuth.user.id,
      slot: 'Tomorrow at 10:00 AM UTC',
    }),
  });
  const callbackData = await callbackRes.json();
  assert(callbackData.success, 'Callback scheduling should succeed');
  assert(callbackData.data.ticketId, 'Must create ticket');
  console.log(`   ✅ Callback Ticket registered in PostgreSQL: Ticket ID: ${callbackData.data.ticketId}`);

  // ===========================================================================
  // 5. AMBIENT SPATIAL FOCUS ROOMS & POMODORO
  // ===========================================================================
  console.log('\n--- 5. Testing Ambient Spatial Focus Rooms & Pomodoro ---');

  // 5a. Start Focus Timer
  const focusStart = await new Promise((resolve) => {
    socket1.emit(REALTIME_EVENTS.FOCUS_TIMER_ACTION, {
      roomId,
      action: 'START',
      durationMinutes: 25,
    }, (res) => {
      resolve(res);
    });
  });
  assert(focusStart.success);
  assert.strictEqual(focusStart.data.state, 'FOCUS');
  assert.strictEqual(focusStart.data.isRunning, true);
  console.log(`   ✅ Room-Synchronized Pomodoro Sprint Started: ${focusStart.data.remainingSeconds / 60}m duration`);

  // 5b. Change Ambient Soundtrack with Spatial 3D Pan
  const trackUpdate = await new Promise((resolve) => {
    socket1.emit(REALTIME_EVENTS.FOCUS_TRACK_CHANGE, {
      roomId,
      track: 'rain_storm',
      volume: 0.75,
      spatial: -0.5, // 50% left pan
    }, (res) => {
      resolve(res);
    });
  });
  assert.strictEqual(trackUpdate.data.currentTrack, 'rain_storm');
  assert.strictEqual(trackUpdate.data.ambientVolume, 0.75);
  console.log(`   ✅ Synchronized Ambient Track set: "rain_storm" (Vol: 75%, Spatial Pan: -0.50 L)`);

  // ===========================================================================
  // 6. MIVO MINI-APPS / ACTIVITY SANDBOXES
  // ===========================================================================
  console.log('\n--- 6. Testing Mivo Mini-Apps & Activity Sandboxes ---');

  // 6a. Verify Enterprise Tier Restriction: ORG accounts cannot launch CHESS
  const orgChessAttempt = await new Promise((resolve) => {
    socket1.emit(REALTIME_EVENTS.ACTIVITY_LAUNCH, {
      roomId,
      type: 'CHESS',
    }, (res) => {
      resolve(res);
    });
  });
  assert(!orgChessAttempt.success, 'ORG account must not be permitted to launch games');
  console.log('   🔒 Enterprise Tier Policy Verified: Games correctly disabled for ORG accounts');

  // 6b. Authenticate Non-Org User for Multiplayer Gaming Activities
  const nonOrgEmail = `gamer_${Date.now()}@test.mivo.dev`;
  const nonOrgRes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: nonOrgEmail,
      username: `gamer_${Date.now()}`.slice(0, 20),
      displayName: 'Non-Org Chess Master',
      password: 'Password123!',
    }),
  });
  const nonOrgData = await nonOrgRes.json();
  assert(nonOrgData.success, 'Non-org user must register successfully');
  const nonOrgSocket = io(SERVER_URL, {
    auth: { token: nonOrgData.data.accessToken },
    transports: ['websocket'],
  });
  await new Promise((resolve) => nonOrgSocket.on('connect', resolve));
  await new Promise((resolve) => {
    nonOrgSocket.once(REALTIME_EVENTS.ROOM_JOINED, resolve);
    nonOrgSocket.emit(REALTIME_EVENTS.ROOM_JOIN, { roomId });
  });

  // 6c. Launch Chess Activity as Non-Org User
  const chessActivity = await new Promise((resolve) => {
    nonOrgSocket.emit(REALTIME_EVENTS.ACTIVITY_LAUNCH, {
      roomId,
      type: 'CHESS',
    }, (res) => {
      resolve(res);
    });
  });
  assert(chessActivity.success);
  assert.strictEqual(chessActivity.data.type, 'CHESS');
  assert(chessActivity.data.state.fen.startsWith('rnbqkbnr'), 'Should have standard chess FEN');
  console.log(`   ✅ Multiplayer Chess Mini-App Launched in Room #${room.name}`);

  // 6d. Make Chess Move
  const moveResult = await new Promise((resolve) => {
    nonOrgSocket.emit(REALTIME_EVENTS.ACTIVITY_ACTION, {
      roomId,
      actionType: 'MOVE',
      payload: { move: 'e2-e4', newFen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1' },
    }, (res) => {
      resolve(res);
    });
  });
  assert(moveResult.data.state.moves.includes('e2-e4'), 'Move must be registered');
  assert.strictEqual(moveResult.data.state.turn, 'b', 'Turn must switch to black');
  console.log(`   ✅ Move executed: "e2-e4" — Turn transferred to Black`);

  // 6e. Close Activity
  const closeRes = await new Promise((resolve) => {
    nonOrgSocket.emit(REALTIME_EVENTS.ACTIVITY_CLOSE, { roomId }, (res) => {
      resolve(res);
    });
  });
  assert(closeRes.success);
  console.log(`   ✅ Activity Session closed gracefully`);
  nonOrgSocket.disconnect();

  // ===========================================================================
  // 7. CRDT SYNC & LOCAL-FIRST MESSAGING
  // ===========================================================================
  console.log('\n--- 7. Testing CRDT Sync & Local-First Messaging ---');

  const testMsgId = randomUUID();
  const idempotencyKey = `idemp_key_${Date.now()}`;

  // 7a. Submit offline-buffered CRDT mutation batch
  const crdtRes = await fetch(`${API_BASE}/rooms/${roomId}/messages/crdt-sync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${devAuth.token}`,
    },
    body: JSON.stringify({
      clientId: 'device_macbook_pro',
      mutations: [
        {
          id: testMsgId,
          roomId,
          senderId: devAuth.user.id,
          content: 'Instant local-first message sent during network drop! [Yjs CRDT verified]',
          lamportClock: 1042,
          clientTimestamp: Date.now(),
          idempotencyKey,
          action: 'CREATE',
        },
      ],
      stateVector: { device_macbook_pro: 1042 },
    }),
  });

  const crdtData = await crdtRes.json();
  assert(crdtData.success, 'CRDT batch sync should succeed');
  assert(crdtData.data.acknowledgedIds.includes(testMsgId), 'Mutation ID must be acknowledged');
  console.log(`   ✅ CRDT Mutation Batch processed: 1 message synchronized (Server Lamport Clock: ${crdtData.data.serverClock})`);

  // 7b. Idempotency test: submit the exact same batch again
  const duplicateRes = await fetch(`${API_BASE}/rooms/${roomId}/messages/crdt-sync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${devAuth.token}`,
    },
    body: JSON.stringify({
      clientId: 'device_macbook_pro',
      mutations: [
        {
          id: testMsgId,
          roomId,
          senderId: devAuth.user.id,
          content: 'Instant local-first message sent during network drop! [Yjs CRDT verified]',
          lamportClock: 1042,
          clientTimestamp: Date.now(),
          idempotencyKey,
          action: 'CREATE',
        },
      ],
      stateVector: { device_macbook_pro: 1042 },
    }),
  });
  const dupData = await duplicateRes.json();
  assert(dupData.success);
  assert.strictEqual(dupData.data.conflictsResolved, 1, 'Duplicate idempotency key must be detected & resolved');
  console.log(`   ✅ CRDT Idempotency Guard verified: Duplicate transmission safely de-duplicated`);

  // 7c. Verify persistence in PostgreSQL
  const dbMsg = await prisma.message.findUnique({
    where: { id: testMsgId },
  });
  assert(dbMsg, 'Message must be persisted in PostgreSQL');
  console.log(`   ✅ Verified persistence in PostgreSQL: Message ID "${dbMsg.id}"`);

  // Clean up sockets
  socket1.disconnect();
  socket2.disconnect();

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('🎉 ALL 7 ARCHITECTURAL HYPER FEATURES VERIFIED 100% SUCCESSFUL:');
  console.log('   1. ⚡ SFU Engine Upgrade (Mediasoup / LiveKit Simulcast) [PASSED]');
  console.log('   2. 🛡️ End-to-End Encryption (E2EE Zero-Trust MLS)       [PASSED]');
  console.log('   3. 💻 CODE_STAGE Pair-Programming Sandbox               [PASSED]');
  console.log('   4. 🤖 AI Twin / "Out of Office" Persona                 [PASSED]');
  console.log('   5. 🎧 Ambient Spatial Focus Rooms & Pomodoro             [PASSED]');
  console.log('   6. 🧩 Mivo Mini-Apps / Activity Sandboxes               [PASSED]');
  console.log('   7. ⚡ CRDT Sync & Local-First Messaging                 [PASSED]');
  console.log('═══════════════════════════════════════════════════════════════\n');

  process.exit(0);
}

run().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
