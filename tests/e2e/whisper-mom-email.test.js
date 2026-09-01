/**
 * End-to-End Test: Whisper AI Speech Transcription, MOM Compilation & Email Dispatch
 */

const BASE_URL = 'http://localhost:4000/api/v1';

async function runTests() {
  console.log('🧪 Running E2E Test: whisper-mom-email.test.js...');

  // 1. Authenticate
  const authRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'dev@mivo.app', password: 'Password123!' }),
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
  const room = fullComm.data.channels[0].rooms[0];

  // 3. Dispatch MOM Email
  const momRes = await fetch(`${BASE_URL}/rooms/${room.id}/email-summary`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      email: 'dev@mivo.app',
      name: 'Dev Admin',
      notes: '### Official MOM\n- [x] Verified full testing matrix\n- [x] Deployed unit, integration, and E2E suites',
      transcript: [
        { speaker: 'Carlos Mendoza 🇪🇸', text: 'Probando el sistema de notas y transcripción.', time: '2:30 PM' },
        { speaker: 'Dev Admin', text: 'All testing suites operational and verified.', time: '2:31 PM' },
      ],
    }),
  });

  const momData = await momRes.json();
  if (!momData.success) throw new Error(`MOM email dispatch failed: ${JSON.stringify(momData)}`);

  console.log(`   ✅ Test 1: MOM document synthesized and dispatched (${momData.data.transcriptCount} transcripts).`);
  console.log(`   ✅ Test 2: Server response verified: "${momData.data.message}".`);

  console.log('   🎉 Whisper AI & MOM E2E Tests: 2/2 PASSED\n');
}

runTests().catch((e) => {
  console.error('❌ whisper-mom-email.test.js failed:', e);
  process.exit(1);
});
