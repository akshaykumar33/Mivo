/**
 * Module: communities-rbac
 * Integration Test: Channel & Room Hierarchy Retrieval
 */

const BASE_URL = 'http://localhost:4000/api/v1';

async function run() {
  console.log('🧪 [communities-rbac/integration] Running channel-privacy.integration.test.js...');
  const authRes = await (
    await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'dev@mivo.app', password: 'Password123!' }),
    })
  ).json();

  const commRes = await (
    await fetch(`${BASE_URL}/communities`, {
      headers: { Authorization: `Bearer ${authRes.data.accessToken}` },
    })
  ).json();

  const wysbryx = commRes.data.find((c) => c.slug === 'wysbryx-core');
  const details = await (
    await fetch(`${BASE_URL}/communities/${wysbryx.id}`, {
      headers: { Authorization: `Bearer ${authRes.data.accessToken}` },
    })
  ).json();

  if (!details.data.channels || details.data.channels.length === 0) {
    throw new Error('No channels found for community');
  }

  // Verify documented contract: POST /api/v1/channels/:channelId/rooms
  const testChannelId = details.data.channels[0].id;
  const createRoomRes = await (
    await fetch(`${BASE_URL}/channels/${testChannelId}/rooms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authRes.data.accessToken}`,
      },
      body: JSON.stringify({
        name: `Contract Test Room ${Date.now()}`,
        activeMode: 'TEXT',
      }),
    })
  ).json();

  if (!createRoomRes.success || !createRoomRes.data?.id) {
    throw new Error(`POST /channels/:channelId/rooms failed: ${JSON.stringify(createRoomRes)}`);
  }

  console.log(`   ✅ Community channels & room hierarchy verified (${details.data.channels.length} channels).`);
  console.log(`   ✅ Contract POST /api/v1/channels/:channelId/rooms verified (Created room: ${createRoomRes.data.name}).`);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
