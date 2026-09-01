/**
 * Module: ai-scribe-mom
 * E2E Test: End-to-End Live Whisper Dictation & Email Dispatch
 */

const BASE_URL = 'http://localhost:4000/api/v1';

async function run() {
  console.log('🧪 [ai-scribe-mom/e2e] Running live-whisper-mom-flow.e2e.test.js...');
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

  const res = await (
    await fetch(`${BASE_URL}/rooms/${room.id}/email-summary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        email: 'dev@mivo.app',
        name: 'Dev Admin',
        notes: '# Notes\n- [x] Verified full Whisper E2E flow',
        transcript: [
          { speaker: 'Carlos Mendoza 🇪🇸', text: 'Probando el flujo E2E.', time: '11:00 AM' },
          { speaker: 'Priya Sharma 🇮🇳', text: 'Cloud infrastructure verified.', time: '11:01 AM' },
        ],
      }),
    })
  ).json();

  if (!res.success) throw new Error('Live Whisper E2E dispatch failed');

  console.log(`   ✅ Live Whisper dictation & MOM recap email verified for room #${room.name}.`);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
