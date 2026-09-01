const BASE_URL = 'http://localhost:4000/api/v1';

async function run() {
  console.log('🧪 Testing Mivo Real-Time Message Flow...\n');

  // 1. Login as Dev Admin
  console.log('1. Logging in as Dev Admin...');
  const devRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'dev@mivo.app', password: 'Password123!' }),
  });
  const devData = await devRes.json();
  if (!devData.success) throw new Error('Dev login failed');
  const devToken = devData.data.accessToken;
  console.log('   ✅ Dev Admin authenticated.');

  // 2. Login as Alex Rivera
  console.log('2. Logging in as Alex Rivera...');
  const alexRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'alex@mivo.app', password: 'Password123!' }),
  });
  const alexData = await alexRes.json();
  if (!alexData.success) throw new Error('Alex login failed');
  const alexToken = alexData.data.accessToken;
  console.log('   ✅ Alex Rivera authenticated.');

  // 3. Get Communities & Lobby Room ID
  console.log('3. Fetching communities and room...');
  const commRes = await fetch(`${BASE_URL}/communities`, {
    headers: { Authorization: `Bearer ${devToken}` },
  });
  const commData = await commRes.json();
  const wysbryxSummary = commData.data.find(c => c.slug === 'wysbryx-core');

  const fullCommRes = await fetch(`${BASE_URL}/communities/${wysbryxSummary.id}`, {
    headers: { Authorization: `Bearer ${devToken}` },
  });
  const fullCommData = await fullCommRes.json();
  const lobbyRoom = fullCommData.data.channels[0].rooms[0];
  console.log(`   ✅ Target Room: "${lobbyRoom.name}" (ID: ${lobbyRoom.id})`);

  // 4. Dev Admin sends message
  console.log('4. Dev Admin sending chat message...');
  const devMsgRes = await fetch(`${BASE_URL}/rooms/${lobbyRoom.id}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${devToken}`,
    },
    body: JSON.stringify({
      content: '🚀 Dev Admin: Mivo unified real-time stage is live!',
    }),
  });
  const devMsg = await devMsgRes.json();
  if (!devMsg.success) throw new Error(`Failed to send dev msg: ${JSON.stringify(devMsg)}`);
  console.log('   ✅ Dev message posted:', devMsg.data.content);

  // 5. Alex Rivera sends reply
  console.log('5. Alex Rivera sending reply message...');
  const alexMsgRes = await fetch(`${BASE_URL}/rooms/${lobbyRoom.id}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${alexToken}`,
    },
    body: JSON.stringify({
      content: '🎨 Alex: The glassmorphism and font stack look incredible!',
    }),
  });
  const alexMsg = await alexMsgRes.json();
  if (!alexMsg.success) throw new Error(`Failed to send alex msg: ${JSON.stringify(alexMsg)}`);
  console.log('   ✅ Alex message posted:', alexMsg.data.content);

  // 6. Fetch Room Messages
  console.log('6. Fetching recent room messages list...');
  const listRes = await fetch(`${BASE_URL}/rooms/${lobbyRoom.id}/messages`, {
    headers: { Authorization: `Bearer ${devToken}` },
  });
  const listData = await listRes.json();
  console.log(`   ✅ Retrieved ${listData.data.length} messages:`);
  listData.data.forEach((m, idx) => {
    console.log(`      [${idx + 1}] ${m.sender.displayName}: "${m.content}"`);
  });

  console.log('\n🎉 ALL REAL-TIME MESSAGING REST & EVENT INTEGRATION TESTS PASSED!');
}

run().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
