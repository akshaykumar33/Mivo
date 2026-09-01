const BASE_URL = 'http://localhost:4000/api/v1';

async function run() {
  console.log('🧪 Testing Whisper AI Meeting Scribe & Email Digest Flow...\n');

  // 1. Login as Dev Admin
  console.log('1. Logging in as Dev Admin...');
  const devRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'dev@mivo.app', password: 'Password123!' }),
  });
  const devData = await devRes.json();
  const devToken = devData.data.accessToken;
  console.log('   ✅ Authenticated.');

  // 2. Fetch Lobby room
  console.log('2. Fetching Lobby room...');
  const commRes = await fetch(`${BASE_URL}/communities`, {
    headers: { Authorization: `Bearer ${devToken}` },
  });
  const commData = await commRes.json();
  const wysbryx = commData.data.find(c => c.slug === 'wysbryx-core');
  const fullComm = await (await fetch(`${BASE_URL}/communities/${wysbryx.id}`, {
    headers: { Authorization: `Bearer ${devToken}` },
  })).json();
  const lobbyRoom = fullComm.data.channels[0].rooms[0];
  console.log(`   ✅ Target Room: "${lobbyRoom.name}" (ID: ${lobbyRoom.id})`);

  // 3. Dispatch Email Meeting Summary
  console.log('3. Triggering Whisper AI Email Summary Dispatch...');
  const emailRes = await fetch(`${BASE_URL}/rooms/${lobbyRoom.id}/email-summary`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${devToken}`,
    },
    body: JSON.stringify({
      email: 'dev@mivo.app',
      name: 'Dev Admin',
      notes: '### Action Items:\n- Deployed WebRTC Mesh for video calls\n- Added Whisper AI real-time transcription',
      transcript: [
        { speaker: 'Elena Rostova', text: 'Live WebRTC signaling is operational.', time: '1:00 PM' },
        { speaker: 'Dev Admin', text: 'Generating meeting summary and emailing notes.', time: '1:01 PM' },
      ],
    }),
  });

  const emailData = await emailRes.json();
  if (!emailData.success) throw new Error(`Email dispatch failed: ${JSON.stringify(emailData)}`);
  console.log('   ✅ Email Dispatch Response:', emailData.data.message);
  console.log('   ✅ Transcripts processed:', emailData.data.transcriptCount);
  console.log('   ✅ Status:', emailData.data.status);

  console.log('\n🎉 ALL WHISPER AI MEETING SCRIBE & EMAIL FLOW TESTS PASSED!');
}

run().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
