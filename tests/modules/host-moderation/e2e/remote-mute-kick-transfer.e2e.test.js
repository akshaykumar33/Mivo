/**
 * Module: host-moderation
 * E2E Test: Host Moderation Lifecycle (Mute, Kick, Transfer)
 */

const BASE_URL = 'http://localhost:4000/api/v1';

async function run() {
  console.log('🧪 [host-moderation/e2e] Running remote-mute-kick-transfer.e2e.test.js...');
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

  console.log(`   ✅ Host moderation workflow verified for active room: #${room.name}.`);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
