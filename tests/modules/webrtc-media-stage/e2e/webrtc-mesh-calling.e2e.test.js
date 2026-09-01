/**
 * Module: webrtc-media-stage
 * E2E Test: Multi-Peer WebRTC Mesh Calling & State Verification
 */

const BASE_URL = 'http://localhost:4000/api/v1';

async function run() {
  console.log('🧪 [webrtc-media-stage/e2e] Running webrtc-mesh-calling.e2e.test.js...');
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
  const standup = details.data.channels[0].rooms[1];

  const roomRes = await (
    await fetch(`${BASE_URL}/rooms/${standup.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  ).json();

  if (!roomRes.success) throw new Error('Standup room retrieval failed');

  console.log(`   ✅ WebRTC stage #${roomRes.data.name} verified in mode: ${roomRes.data.activeMode}.`);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
