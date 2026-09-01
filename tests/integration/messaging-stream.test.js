/**
 * Integration Test: Real-Time Messaging Stream & History
 */

const BASE_URL = 'http://localhost:4000/api/v1';

async function runTests() {
  console.log('🧪 Running Integration Test: messaging-stream.test.js...');

  // 1. Authenticate
  const authRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'carlos@mivo.app', password: 'Password123!' }),
  });
  const authData = await authRes.json();
  const token = authData.data.accessToken;

  // 2. Fetch Room
  const commRes = await (
    await fetch(`${BASE_URL}/communities`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  ).json();
  const wysbryx = commRes.data.find((c) => c.slug === 'wysbryx-core');
  const fullComm = await (
    await fetch(`${BASE_URL}/communities/${wysbryx.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  ).json();
  const testRoom = fullComm.data.channels[0].rooms[0];

  // 3. Post Message
  const testContent = `Integration Test Message timestamp: ${Date.now()}`;
  const postRes = await fetch(`${BASE_URL}/rooms/${testRoom.id}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ content: testContent }),
  });
  const postData = await postRes.json();

  if (!postData.success || postData.data.content !== testContent) {
    throw new Error('Message posting failed');
  }
  console.log('   ✅ Test 1: Message successfully posted to room stream.');

  // 4. Fetch Messages
  const getRes = await fetch(`${BASE_URL}/rooms/${testRoom.id}/messages`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const getData = await getRes.json();

  const found = getData.data.some((m) => m.content === testContent);
  if (!found) {
    throw new Error('Posted message not retrieved in room message stream');
  }
  console.log(`   ✅ Test 2: Message verified in room history (${getData.data.length} messages).`);

  console.log('   🎉 Messaging Stream Integration Tests: 2/2 PASSED\n');
}

runTests().catch((e) => {
  console.error('❌ messaging-stream.test.js failed:', e);
  process.exit(1);
});
