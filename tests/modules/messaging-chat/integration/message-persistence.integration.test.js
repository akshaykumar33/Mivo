/**
 * Module: messaging-chat
 * Integration Test: Room Message Persistence in Postgres
 */

const BASE_URL = 'http://localhost:4000/api/v1';

async function run() {
  console.log('🧪 [messaging-chat/integration] Running message-persistence.integration.test.js...');
  const authRes = await (
    await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'dev@mivo.app', password: 'Password123!' }),
    })
  ).json();
  const token = authRes.data.accessToken;

  const commRes = await (
    await fetch(`${BASE_URL}/communities`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  ).json();
  const wysbryx = commRes.data.find((c) => c.slug === 'wysbryx-core');
  const details = await (
    await fetch(`${BASE_URL}/communities/${wysbryx.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  ).json();
  const room = details.data.channels[0].rooms[0];

  const content = `Test Message at ${Date.now()}`;
  const postRes = await (
    await fetch(`${BASE_URL}/rooms/${room.id}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ content }),
    })
  ).json();

  if (!postRes.success || postRes.data.content !== content) {
    throw new Error('Message persistence failed');
  }

  console.log('   ✅ Message persistence and immediate retrieval verified.');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
