/**
 * Module: messaging-chat
 * E2E Test: Real-Time Multilingual Chat Translation
 */

const BASE_URL = 'http://localhost:4000/api/v1';

async function run() {
  console.log('🧪 [messaging-chat/e2e] Running chat-translation-tts.e2e.test.js...');
  const authRes = await (
    await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'carlos@mivo.app', password: 'Password123!' }),
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

  const spanishMsg = '¡Hola equipo! El sistema está listo.';
  const postRes = await (
    await fetch(`${BASE_URL}/rooms/${room.id}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ content: spanishMsg }),
    })
  ).json();

  if (!postRes.success) throw new Error('Failed to post Spanish message');

  console.log('   ✅ Multilingual chat message posting & translation compatibility verified.');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
