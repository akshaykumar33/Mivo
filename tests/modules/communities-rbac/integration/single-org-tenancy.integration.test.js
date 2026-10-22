/**
 * Module: communities-rbac
 * Integration Test: Single-Org Tenancy Enforcement & Room Member Management
 *
 * Verifies:
 * 1. Users can only belong to one organization.
 * 2. Cross-org membership addition is rejected with single-org violation.
 * 3. Adding members to rooms requires the user to belong to that room's organization.
 * 4. Room eligible members list correctly excludes members already in the room.
 */

const BASE_URL = 'http://localhost:4000/api/v1';

async function run() {
  console.log('🧪 [communities-rbac/integration] Running single-org-tenancy.integration.test.js...');

  // 1. Authenticate dev admin (owner of Wysbryx Engineering)
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'dev@mivo.app', password: 'Password123!' }),
  }).then((r) => r.json());

  if (!loginRes.success || !loginRes.data?.accessToken) {
    throw new Error('Failed to log in as dev admin: ' + JSON.stringify(loginRes));
  }
  const token = loginRes.data.accessToken;

  // 2. Fetch communities for dev admin
  const commRes = await fetch(`${BASE_URL}/communities`, {
    headers: { Authorization: `Bearer ${token}` },
  }).then((r) => r.json());

  if (!commRes.success || commRes.data.length === 0) {
    throw new Error('No communities found for dev admin');
  }

  const wysbryxOrg = commRes.data.find((c) => c.slug === 'wysbryx-core') || commRes.data[0];
  console.log(`   🏢 Found active org: ${wysbryxOrg.name} (${wysbryxOrg.id})`);

  // 3. Test listing eligible users for Wysbryx org
  const eligibleRes = await fetch(`${BASE_URL}/communities/${wysbryxOrg.id}/eligible-users`, {
    headers: { Authorization: `Bearer ${token}` },
  }).then((r) => r.json());

  if (!eligibleRes.success) {
    throw new Error('Failed to fetch eligible users: ' + JSON.stringify(eligibleRes));
  }
  console.log(`   ✅ Eligible users endpoint active (found ${eligibleRes.data.length} candidates)`);

  // 4. Test Single-Org Violation: Attempt to add an existing member of Design Guild into Wysbryx org
  // designer@mivo.app belongs to design-guild.
  const crossOrgAddRes = await fetch(`${BASE_URL}/communities/${wysbryxOrg.id}/members`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      identifier: 'designer@mivo.app',
      roleName: 'Member',
    }),
  }).then((r) => r.json());

  if (crossOrgAddRes.success) {
    throw new Error('FAILURE: Cross-org membership was permitted! Single-org tenancy rule violated.');
  }

  const errorMsg = crossOrgAddRes.error?.message || '';
  if (!errorMsg.includes('already belongs to')) {
    throw new Error(`Unexpected error message on single-org violation: ${JSON.stringify(crossOrgAddRes)}`);
  }
  console.log(`   🔒 Single-Org Tenancy verified: Rejected adding user who already belongs to another org.`);
  console.log(`      Reason: "${errorMsg}"`);

  // 5. Test Room/Group Member Management
  // Get community details to find a room
  const detailsRes = await fetch(`${BASE_URL}/communities/${wysbryxOrg.id}`, {
    headers: { Authorization: `Bearer ${token}` },
  }).then((r) => r.json());

  const channel = detailsRes.data?.channels?.[0];
  const room = channel?.rooms?.[0];
  if (!room) {
    throw new Error('No test room found in community channels');
  }
  console.log(`   🎙️ Testing Room / Group: #${room.name} (${room.id})`);

  // 6. Test listing eligible room members
  const eligibleRoomRes = await fetch(`${BASE_URL}/rooms/${room.id}/eligible-members`, {
    headers: { Authorization: `Bearer ${token}` },
  }).then((r) => r.json());

  if (!eligibleRoomRes.success) {
    throw new Error('Failed to list eligible room members: ' + JSON.stringify(eligibleRoomRes));
  }
  console.log(`   ✅ Eligible room members listed (${eligibleRoomRes.data.length} org members outside room)`);

  // 7. Test Single-Org Group Boundary: Attempt to add user who is NOT in this org into the room
  // Find designer@mivo.app user ID
  const designerLogin = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'designer@mivo.app', password: 'Password123!' }),
  }).then((r) => r.json());

  if (designerLogin.success && designerLogin.data?.user?.id) {
    const designerUserId = designerLogin.data.user.id;
    const addOutsideUserRes = await fetch(`${BASE_URL}/rooms/${room.id}/members`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ userId: designerUserId }),
    }).then((r) => r.json());

    if (addOutsideUserRes.success) {
      throw new Error('FAILURE: Outside user was added to room without belonging to the organization!');
    }
    console.log(`   🔒 Room Organization Boundary verified: Outside user rejected from room.`);
    console.log(`      Reason: "${addOutsideUserRes.error?.message}"`);
  }

  // 8. Test adding an eligible org member into the room
  if (eligibleRoomRes.data.length > 0) {
    const candidate = eligibleRoomRes.data[0];
    const addRoomMemberRes = await fetch(`${BASE_URL}/rooms/${room.id}/members`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ userId: candidate.id }),
    }).then((r) => r.json());

    if (!addRoomMemberRes.success) {
      throw new Error('Failed to add eligible org member into room: ' + JSON.stringify(addRoomMemberRes));
    }
    console.log(`   ✅ Successfully added org member "${candidate.displayName}" into room #${room.name}`);

    // Verify candidate is now in room and no longer in eligible list
    const updatedEligibleRes = await fetch(`${BASE_URL}/rooms/${room.id}/eligible-members`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((r) => r.json());

    const stillEligible = updatedEligibleRes.data.some((u) => u.id === candidate.id);
    if (stillEligible) {
      throw new Error('User still listed in eligible room members after being added!');
    }
    console.log(`   ✅ Verified user no longer in eligible list (properly deduplicated).`);
  }

  console.log('🎉 Single-Org Tenancy & Group Member Management integration test PASSED perfectly!\n');
}

run().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
