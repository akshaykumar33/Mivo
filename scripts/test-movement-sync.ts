import { io, Socket } from 'socket.io-client';
import jwt from 'jsonwebtoken';

const SERVER_URL = 'http://localhost:4000';
const ROOM_CODE = `JAMTEST${Math.floor(100 + Math.random() * 900)}`;
const JWT_SECRET = process.env.JWT_ACCESS_SECRET || 'dev_jwt_access_secret_super_secure_32chars_min';

console.log(`\n======================================================`);
console.log(`🚀 Starting Co-Op Jam 2-Player Realtime Movement Test`);
console.log(`Target: ${SERVER_URL} | Test Room: ${ROOM_CODE}`);
console.log(`======================================================\n`);

async function runTest() {
  const token1 = jwt.sign({ sub: 'user_test_p1_' + Date.now(), email: 'p1@test.local', isGuest: true }, JWT_SECRET);
  const token2 = jwt.sign({ sub: 'user_test_p2_' + Date.now(), email: 'p2@test.local', isGuest: true }, JWT_SECRET);

  const socket1: Socket = io(SERVER_URL, {
    transports: ['websocket'],
    auth: { token: token1 },
    reconnection: false,
  });

  const socket2: Socket = io(SERVER_URL, {
    transports: ['websocket'],
    auth: { token: token2 },
    reconnection: false,
  });

  await Promise.all([
    new Promise<void>((resolve) => socket1.on('connect', () => {
      console.log(`[P1 Connected] Socket ID: ${socket1.id}`);
      resolve();
    })),
    new Promise<void>((resolve) => socket2.on('connect', () => {
      console.log(`[P2 Connected] Socket ID: ${socket2.id}`);
      resolve();
    })),
  ]);

  // Set up match promises
  let sessionP1: any = null;
  let sessionP2: any = null;

  const matchP1Promise = new Promise<any>((resolve) => {
    socket1.on('anon:matched', (data) => {
      console.log(`[P1 Matched] Partner: ${data.partner.pseudonym}, isHost: ${data.isHost}, Session: ${data.sessionId}`);
      sessionP1 = data;
      resolve(data);
    });
  });

  const matchP2Promise = new Promise<any>((resolve) => {
    socket2.on('anon:matched', (data) => {
      console.log(`[P2 Matched] Partner: ${data.partner.pseudonym}, isHost: ${data.isHost}, Session: ${data.sessionId}`);
      sessionP2 = data;
      resolve(data);
    });
  });

  // P1 creates/registers room
  console.log(`[P1] Registering private room ${ROOM_CODE}...`);
  socket1.emit('anon:queue_join', {
    mode: 'TEXT',
    pseudonym: 'Player 1 (Host)',
    roomCode: ROOM_CODE,
  });

  await new Promise((r) => setTimeout(r, 300));

  // P2 joins same room
  console.log(`[P2] Joining private room ${ROOM_CODE}...`);
  socket2.emit('anon:queue_join', {
    mode: 'TEXT',
    pseudonym: 'Player 2 (Guest)',
    roomCode: ROOM_CODE,
  });

  // Wait for both to be matched
  await Promise.all([matchP1Promise, matchP2Promise]);

  if (!sessionP1 || !sessionP2 || sessionP1.sessionId !== sessionP2.sessionId) {
    throw new Error(`Session ID mismatch: P1=${sessionP1?.sessionId}, P2=${sessionP2?.sessionId}`);
  }
  console.log(`\n✅ Match Verified! Both players successfully connected into Session: ${sessionP1.sessionId}\n`);

  const sessionId = sessionP1.sessionId;

  // 1. TEST RETRO PONG MOVEMENTS (P1 -> P2 and P2 -> P1)
  console.log(`--- [TEST 1: Retro Pong Paddle & Ball Movements] ---`);
  const p2ReceivedMove = new Promise<any>((resolve) => {
    socket2.on('anon:game_action', (data) => {
      if (data.action === 'PONG_MOVE') {
        resolve(data);
      }
    });
  });

  console.log(`[P1] Moving paddle to Y: 185...`);
  const tStart1 = Date.now();
  socket1.emit('anon:game_action', {
    sessionId,
    game: 'PONG',
    action: 'PONG_MOVE',
    payload: { y: 185 },
  });

  const p2MoveAction = await p2ReceivedMove;
  const latency1 = Date.now() - tStart1;
  console.log(`[P2 Received P1 Movement] y=${p2MoveAction.payload.y} (Latency: ${latency1}ms)`);
  if (p2MoveAction.payload.y !== 185) throw new Error('PONG_MOVE Y mismatch on P2');

  const p1ReceivedMove = new Promise<any>((resolve) => {
    socket1.on('anon:game_action', (data) => {
      if (data.action === 'PONG_MOVE') {
        resolve(data);
      }
    });
  });

  console.log(`[P2] Moving paddle to Y: 92...`);
  const tStart2 = Date.now();
  socket2.emit('anon:game_action', {
    sessionId,
    game: 'PONG',
    action: 'PONG_MOVE',
    payload: { y: 92 },
  });

  const p1MoveAction = await p1ReceivedMove;
  const latency2 = Date.now() - tStart2;
  console.log(`[P1 Received P2 Movement] y=${p1MoveAction.payload.y} (Latency: ${latency2}ms)`);
  if (p1MoveAction.payload.y !== 92) throw new Error('PONG_MOVE Y mismatch on P1');

  // Test Pong Ball Sync from Host
  const p2ReceivedBall = new Promise<any>((resolve) => {
    socket2.on('anon:game_action', (data) => {
      if (data.action === 'PONG_BALL_SYNC') {
        resolve(data);
      }
    });
  });

  console.log(`[P1 (Host)] Syncing ball physics (x: 320, y: 180, vx: 5, vy: -3)...`);
  socket1.emit('anon:game_action', {
    sessionId,
    game: 'PONG',
    action: 'PONG_BALL_SYNC',
    payload: {
      ball: { x: 320, y: 180, vx: 5, vy: -3 },
      p1Score: 2,
      p2Score: 1,
      gameOver: false,
    },
  });

  const p2BallAction = await p2ReceivedBall;
  console.log(`[P2 Received Ball Sync] Ball: (${p2BallAction.payload.ball.x}, ${p2BallAction.payload.ball.y}), Score: ${p2BallAction.payload.p1Score}-${p2BallAction.payload.p2Score}`);
  if (p2BallAction.payload.ball.x !== 320 || p2BallAction.payload.p1Score !== 2) throw new Error('Ball sync data mismatch');
  console.log(`✅ Retro Pong Movements Verified!\n`);

  // 2. TEST SPEED DOODLING REALTIME STROKE DRAWING
  console.log(`--- [TEST 2: Speed Doodling Cursor/Drawing Movements] ---`);
  const pointsToSend = [
    { x: 100, y: 120, type: 'start', color: '#FFFFFF', width: 4 },
    { x: 105, y: 125, type: 'draw', color: '#FFFFFF', width: 4 },
    { x: 110, y: 130, type: 'draw', color: '#FFFFFF', width: 4 },
    { x: 120, y: 140, type: 'draw', color: '#FFFFFF', width: 4 },
    { x: 0, y: 0, type: 'end' },
  ];

  let receivedPoints: any[] = [];
  const doodlePromise = new Promise<void>((resolve) => {
    socket2.on('anon:game_action', (data) => {
      if (data.action === 'DOODLE_DRAW') {
        receivedPoints.push(data.payload);
        if (receivedPoints.length === pointsToSend.length) {
          resolve();
        }
      }
    });
  });

  console.log(`[P1] Drawing continuous stroke (${pointsToSend.length} points)...`);
  for (const pt of pointsToSend) {
    socket1.emit('anon:game_action', {
      sessionId,
      game: 'DOODLE',
      action: 'DOODLE_DRAW',
      payload: pt,
    });
  }

  await doodlePromise;
  console.log(`[P2 Received All ${receivedPoints.length} Stroke Points]:`);
  receivedPoints.forEach((p, idx) => console.log(`   Point ${idx + 1}: ${p.type} at (${p.x}, ${p.y})`));
  console.log(`✅ Speed Doodling Stroke Movement Verified!\n`);

  // 3. TEST CONNECT-4 DISCS
  console.log(`--- [TEST 3: Connect-4 Disc Placement] ---`);
  const c4PromiseP2 = new Promise<any>((resolve) => {
    socket2.on('anon:game_action', (data) => {
      if (data.action === 'CONNECT4_MOVE') {
        resolve(data);
      }
    });
  });

  console.log(`[P1] Dropping disc in column 3 (Player 1)...`);
  socket1.emit('anon:game_action', {
    sessionId,
    game: 'CONNECT4',
    action: 'CONNECT4_MOVE',
    payload: { col: 3, player: 1 },
  });

  const c4Action = await c4PromiseP2;
  console.log(`[P2 Received Connect-4 Disc Drop] Column: ${c4Action.payload.col}, Player: ${c4Action.payload.player}`);
  if (c4Action.payload.col !== 3) throw new Error('Connect-4 column mismatch');
  console.log(`✅ Connect-4 Move Verified!\n`);

  // 4. TEST GAME TAB SWITCHING
  console.log(`--- [TEST 4: Game Tab Switching Synchronization] ---`);
  const switchPromise = new Promise<any>((resolve) => {
    socket1.on('anon:game_action', (data) => {
      if (data.action === 'SWITCH_GAME') {
        resolve(data);
      }
    });
  });

  console.log(`[P2] Switching active game to 'WORD_CHAIN'...`);
  socket2.emit('anon:game_action', {
    sessionId,
    game: 'WORD_CHAIN',
    action: 'SWITCH_GAME',
    payload: { gameId: 'WORD_CHAIN' },
  });

  const switchAction = await switchPromise;
  console.log(`[P1 Received Switch Game] Switched to: ${switchAction.payload.gameId}`);
  if (switchAction.payload.gameId !== 'WORD_CHAIN') throw new Error('SWITCH_GAME mismatch');
  console.log(`✅ Game Tab Switch Verified!\n`);

  // Clean up
  socket1.disconnect();
  socket2.disconnect();

  console.log(`======================================================`);
  console.log(`🎉 ALL 2-PLAYER MOVEMENTS & ACTIONS VERIFIED SUCCESSFULLY!`);
  console.log(`   - Retro Pong Paddle & Ball Sync: PASS (Avg Latency: ${Math.round((latency1 + latency2) / 2)}ms)`);
  console.log(`   - Speed Doodling Stroke Sync: PASS (100% points received)`);
  console.log(`   - Connect-4 Tactical Moves: PASS`);
  console.log(`   - Game Switching Sync: PASS`);
  console.log(`======================================================\n`);
  process.exit(0);
}

runTest().catch((err) => {
  console.error('\n❌ Test failed:', err);
  process.exit(1);
});
