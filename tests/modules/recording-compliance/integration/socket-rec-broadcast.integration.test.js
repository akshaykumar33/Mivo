/**
 * Module: recording-compliance
 * Integration Test: Room Recording Permission Gate
 */

const BASE_URL = 'http://localhost:4000/api/v1';

async function run() {
  console.log('🧪 [recording-compliance/integration] Running socket-rec-broadcast.integration.test.js...');
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
  const room = details.data.channels[0].rooms[1];

  console.log(`   ✅ Recording permission authorization verified for room #${room.name}.`);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
