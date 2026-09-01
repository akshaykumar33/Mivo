/**
 * Integration Test: Channel & Room Hierarchy and Mode Transitions
 */

const BASE_URL = 'http://localhost:4000/api/v1';

async function runTests() {
  console.log('🧪 Running Integration Test: channel-room.test.js...');

  // 1. Authenticate as Owner
  const authRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'dev@mivo.app', password: 'Password123!' }),
  });
  const authData = await authRes.json();
  const token = authData.data.accessToken;

  // 2. Fetch Community & Channels
  const commRes = await fetch(`${BASE_URL}/communities`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const commData = await commRes.json();
  const wysbryx = commData.data.find((c) => c.slug === 'wysbryx-core');

  const fullComm = await (
    await fetch(`${BASE_URL}/communities/${wysbryx.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  ).json();

  if (!fullComm.data.channels || fullComm.data.channels.length === 0) {
    throw new Error('Community channels not found');
  }
  console.log(`   ✅ Test 1: Loaded ${fullComm.data.channels.length} channels from workspace.`);

  const testRoom = fullComm.data.channels[0].rooms[0];

  // 3. Test Room Mode Switching
  for (const mode of ['TEXT', 'VOICE', 'VIDEO', 'SCREEN_SHARE']) {
    const res = await fetch(`${BASE_URL}/rooms/${testRoom.id}/mode`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ activeMode: mode }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(`Mode switch to ${mode} failed`);
  }
  console.log('   ✅ Test 2: Cycled room through TEXT, VOICE, VIDEO, and SCREEN_SHARE modes.');

  console.log('   🎉 Channel & Room Integration Tests: 2/2 PASSED\n');
}

runTests().catch((e) => {
  console.error('❌ channel-room.test.js failed:', e);
  process.exit(1);
});
