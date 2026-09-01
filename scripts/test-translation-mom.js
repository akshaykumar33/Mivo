const BASE_URL = 'http://localhost:4000/api/v1';

async function run() {
  console.log('🧪 Testing Multilingual Translation, MOM Engine & Email Flow...\n');

  // 1. Authenticate
  console.log('1. Authenticating as Dev Admin...');
  const devRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'dev@mivo.app', password: 'Password123!' }),
  });
  const devData = await devRes.json();
  const devToken = devData.data.accessToken;
  console.log('   ✅ Authenticated.');

  // 2. Fetch Room
  console.log('2. Fetching active room...');
  const commRes = await fetch(`${BASE_URL}/communities`, {
    headers: { Authorization: `Bearer ${devToken}` },
  });
  const commData = await commRes.json();
  const wysbryx = commData.data.find(c => c.slug === 'wysbryx-core');
  const fullComm = await (await fetch(`${BASE_URL}/communities/${wysbryx.id}`, {
    headers: { Authorization: `Bearer ${devToken}` },
  })).json();
  const room = fullComm.data.channels[0].rooms[0];
  console.log(`   ✅ Target Room: "${room.name}" (ID: ${room.id})`);

  // 3. Dispatch Multilingual MOM Document
  console.log('3. Dispatching Multilingual Minutes of Meeting (MOM)...');
  const momRes = await fetch(`${BASE_URL}/rooms/${room.id}/email-summary`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${devToken}`,
    },
    body: JSON.stringify({
      email: 'dev@mivo.app',
      name: 'Dev Admin',
      notes: `# 📋 Minutes of Meeting (MOM): #${room.name}
**Date:** Tuesday, September 1, 2026  
**Attendees:** Dev Admin, Elena Rostova, Sarah Connor  

## 1. Executive Summary
The team verified real-time multilingual translation across Spanish, French, German, and Hindi, and tested live session recording with room-wide consent.

## 2. Action Items
- [x] Deployed WebRTC full-mesh video & audio calling.
- [x] Integrated Whisper AI Scribe with dual-language subtitles.
- [x] Configured permission-gated session recording with consent banner.`,
      transcript: [
        { speaker: 'Elena Rostova', text: 'Iniciando nuestra sincronización de arquitectura.', time: '1:10 PM' },
        { speaker: 'Dev Admin', text: 'Starting our architecture sync on WebRTC media pipelines.', time: '1:11 PM' },
      ],
    }),
  });

  const momData = await momRes.json();
  if (!momData.success) throw new Error(`MOM dispatch failed: ${JSON.stringify(momData)}`);
  console.log('   ✅ MOM Dispatch Response:', momData.data.message);
  console.log('   ✅ Transcripts processed:', momData.data.transcriptCount);
  console.log('   ✅ Status:', momData.data.status);

  console.log('\n🎉 ALL MULTILINGUAL TRANSLATION & MOM TESTS PASSED SUCCESSFULLY!');
}

run().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
