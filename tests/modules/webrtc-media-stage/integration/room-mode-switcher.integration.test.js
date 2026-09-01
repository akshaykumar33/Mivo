/**
 * Module: webrtc-media-stage
 * Integration Test: Dynamic Stage Mode Transitioning
 */

const BASE_URL = 'http://localhost:4000/api/v1';

async function run() {
  console.log('🧪 [webrtc-media-stage/integration] Running room-mode-switcher.integration.test.js...');
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

  for (const mode of ['TEXT', 'VOICE', 'VIDEO', 'SCREEN_SHARE']) {
    const res = await (
      await fetch(`${BASE_URL}/rooms/${room.id}/mode`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ activeMode: mode }),
      })
    ).json();
    if (!res.success) throw new Error(`Mode switch to ${mode} failed`);
  }

  console.log('   ✅ Dynamic stage mode switching (TEXT, VOICE, VIDEO, SCREEN) verified.');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
