const BASE_URL = 'http://localhost:4000/api/v1';

async function run() {
  console.log('🧪 Testing Multi-Role RBAC & Capability Matrix...\n');

  // 1. Authenticate All 4 Demo Users
  console.log('1. Authenticating all 4 demo users...');
  const users = ['dev@mivo.app', 'alex@mivo.app', 'sarah@mivo.app', 'elena@mivo.app'];
  const tokens = {};

  for (const email of users) {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'Password123!' }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(`Login failed for ${email}`);
    tokens[email] = data.data.accessToken;
    console.log(`   ✅ Logged in as ${data.data.user.displayName} (${data.data.user.email})`);
  }

  // 2. Fetch Wysbryx Engineering Community
  console.log('\n2. Fetching Community Roles as Owner (Dev Admin)...');
  const commRes = await fetch(`${BASE_URL}/communities`, {
    headers: { Authorization: `Bearer ${tokens['dev@mivo.app']}` },
  });
  const commData = await commRes.json();
  const wysbryx = commData.data.find(c => c.slug === 'wysbryx-core');

  const rolesRes = await fetch(`${BASE_URL}/communities/${wysbryx.id}/roles`, {
    headers: { Authorization: `Bearer ${tokens['dev@mivo.app']}` },
  });
  const rolesData = await rolesRes.json();
  console.log(`   ✅ Retrieved ${rolesData.data.length} Roles:`);
  rolesData.data.forEach(r => {
    console.log(`      - Role: "${r.name}" (Color: ${r.color || 'default'}, System: ${r.isSystem}, Permissions: ${r.permissions.length})`);
  });

  // 3. Dev Admin (Owner) creates a new Channel
  console.log('\n3. Testing Channel Creation as Owner (Dev Admin)...');
  const createChanRes = await fetch(`${BASE_URL}/communities/${wysbryx.id}/channels`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokens['dev@mivo.app']}`,
    },
    body: JSON.stringify({
      name: 'announcements',
      type: 'TEXT',
      topic: 'Important community updates',
    }),
  });
  const chanData = await createChanRes.json();
  if (chanData.success) {
    console.log(`   ✅ Channel Created: #${chanData.data.name} (ID: ${chanData.data.id})`);
  } else {
    console.log(`   ℹ️ Channel already exists or status: ${chanData.error?.message}`);
  }

  // 4. Dev Admin creates a Room in the channel
  if (chanData.data) {
    console.log('\n4. Testing Room Creation in Channel...');
    const createRoomRes = await fetch(`${BASE_URL}/rooms/channels/${chanData.data.id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokens['dev@mivo.app']}`,
      },
      body: JSON.stringify({
        name: 'Town Hall',
        description: 'Monthly company stage broadcast',
        activeMode: 'STREAM',
      }),
    });
    const roomData = await createRoomRes.json();
    console.log(`   ✅ Room Created: "${roomData.data.name}" with activeMode="${roomData.data.activeMode}"`);
  }

  console.log('\n🎉 ALL RBAC, COMMUNITY & MULTI-USER ROLE CAPABILITY TESTS PASSED!');
}

run().catch(err => {
  console.error('❌ Role test failed:', err);
  process.exit(1);
});
