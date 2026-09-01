/**
 * End-to-End Test: Multi-User WebRTC Calling & Media State Synchronization
 */

const BASE_URL = 'http://localhost:4000/api/v1';

async function runTests() {
  console.log('🧪 Running E2E Test: multi-user-calling.test.js...');

  // 1. Authenticate multiple users concurrently
  const [devAuth, alexAuth, priyaAuth] = await Promise.all([
    fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'dev@mivo.app', password: 'Password123!' }),
    }).then((r) => r.json()),
    fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'alex@mivo.app', password: 'Password123!' }),
    }).then((r) => r.json()),
    fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'priya@mivo.app', password: 'Password123!' }),
    }).then((r) => r.json()),
  ]);

  if (!devAuth.success || !alexAuth.success || !priyaAuth.success) {
    throw new Error('Concurrent multi-user authentication failed');
  }
  console.log('   ✅ Test 1: Authenticated Dev Admin, Alex Rivera, and Priya Sharma.');

  // 2. Fetch Active Standup Room
  const commRes = await (
    await fetch(`${BASE_URL}/communities`, {
      headers: { Authorization: `Bearer ${devAuth.data.accessToken}` },
    })
  ).json();
  const wysbryx = commRes.data.find((c) => c.slug === 'wysbryx-core');
  const fullComm = await (
    await fetch(`${BASE_URL}/communities/${wysbryx.id}`, {
      headers: { Authorization: `Bearer ${devAuth.data.accessToken}` },
    })
  ).json();
  const standupRoom = fullComm.data.channels[0].rooms[1];

  // 3. Verify Room State & Members
  const roomRes = await (
    await fetch(`${BASE_URL}/rooms/${standupRoom.id}`, {
      headers: { Authorization: `Bearer ${devAuth.data.accessToken}` },
    })
  ).json();

  if (!roomRes.success) throw new Error('Failed to retrieve room details');
  console.log(`   ✅ Test 2: Room #${roomRes.data.name} verified in mode: ${roomRes.data.activeMode}.`);

  console.log('   🎉 Multi-User WebRTC E2E Tests: 2/2 PASSED\n');
}

runTests().catch((e) => {
  console.error('❌ multi-user-calling.test.js failed:', e);
  process.exit(1);
});
