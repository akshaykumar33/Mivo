/**
 * Module: ai-scribe-mom
 * Integration Test: POST /api/v1/rooms/:id/email-summary
 */

const BASE_URL = 'http://localhost:4000/api/v1';

async function run() {
  console.log('🧪 [ai-scribe-mom/integration] Running email-summary-dispatch.integration.test.js...');
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

  const res = await (
    await fetch(`${BASE_URL}/rooms/${room.id}/email-summary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        email: 'dev@mivo.app',
        name: 'Dev Admin',
        notes: '# Notes\n- [x] Verified tests',
        transcript: [{ speaker: 'Dev Admin', text: 'Testing MOM flow', time: '10:00 AM' }],
      }),
    })
  ).json();

  if (!res.success) throw new Error('Email summary dispatch failed');

  console.log('   ✅ MOM summary dispatch endpoint verified.');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
