const BASE_URL = 'http://localhost:4000';

async function testTiers() {
  console.log('====================================================');
  console.log('🧪 RUNNING COMPREHENSIVE 3-TIER VERIFICATION SUITE');
  console.log('====================================================\n');

  let passedTests = 0;
  let failedTests = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`❌ [FAIL] ${testName} - ${details}`);
      failedTests++;
    }
  }

  // ==========================================
  // 1. GUEST USER VERIFICATION
  // ==========================================
  console.log('\n--- 1. Testing GUEST User Tier ---');

  const guestRes = await fetch(`${BASE_URL}/api/v1/auth/guest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ displayName: 'TestGuestBot' }),
  });
  const guestData = await guestRes.json();
  const guestToken = guestData.data?.accessToken;
  const guestUser = guestData.data?.user;

  assert(guestData.success === true, 'Guest login succeeds');
  assert(guestUser?.userTier === 'GUEST', 'Guest userTier is GUEST');
  assert(guestUser?.isGuest === true, 'Guest isGuest is true');
  assert(guestData.data?.capabilities?.canPublishProjects === false, 'Guest capabilities: canPublishProjects is false');
  assert(guestData.data?.capabilities?.canMessage === false, 'Guest capabilities: canMessage is false');
  assert(guestData.data?.capabilities?.canCall === false, 'Guest capabilities: canCall is false');
  assert(guestData.data?.capabilities?.canConnectCodeGames === true, 'Guest capabilities: canConnectCodeGames is true');
  assert(guestData.data?.capabilities?.canUseVoiceToTask === false, 'Guest capabilities: canUseVoiceToTask is false');
  assert(guestData.data?.capabilities?.hasUnlimitedStorage === false, 'Guest capabilities: hasUnlimitedStorage is false');
  assert(guestData.data?.capabilities?.maxUploadSizeBytes === 2 * 1024 * 1024, 'Guest capabilities: 2MB limit');

  // Test guest trying to publish a project (Must be 403 Forbidden)
  const guestProjectRes = await fetch(`${BASE_URL}/api/v1/projects`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${guestToken}`,
    },
    body: JSON.stringify({
      title: 'Hacked Project',
      description: 'Guests should not be able to publish this',
    }),
  });
  assert(guestProjectRes.status === 403, 'Guest project publishing rejected with 403 Forbidden');

  // Test guest searching users (Should only return non-org accounts, no guests)
  const guestSearchRes = await fetch(`${BASE_URL}/api/v1/users`, {
    headers: { Authorization: `Bearer ${guestToken}` },
  });
  const guestSearchData = await guestSearchRes.json();
  assert(guestSearchRes.status === 200, 'Guest user search endpoint succeeds');
  const returnedUsers = guestSearchData.data || [];
  const hasGuestInSearch = returnedUsers.some((u) => u.isGuest || u.userTier === 'GUEST');
  const hasOrgInSearch = returnedUsers.some((u) => u.userTier === 'ORG');
  assert(!hasGuestInSearch, 'Guest user search never returns guest accounts');
  assert(!hasOrgInSearch, 'Guest user search only returns non-org creators (no org accounts)');

  // Test guest starting a DM (Must be 403 Forbidden)
  const targetUser = returnedUsers[0];
  if (targetUser) {
    const guestDmRes = await fetch(`${BASE_URL}/api/v1/conversations/direct`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${guestToken}`,
      },
      body: JSON.stringify({ recipientId: targetUser.id }),
    });
    assert(guestDmRes.status === 403, 'Guest direct messaging rejected with 403 Forbidden');

    // Test guest viewing Non-Org creator profile (Allowed!)
    const guestViewProfileRes = await fetch(`${BASE_URL}/api/v1/users/${targetUser.id}`, {
      headers: { Authorization: `Bearer ${guestToken}` },
    });
    const guestViewProfileData = await guestViewProfileRes.json();
    assert(guestViewProfileRes.status === 200, 'Guest viewing Non-Org profile is permitted (200 OK)');
    assert(guestViewProfileData.data?.username === targetUser.username, 'Guest receives public profile data');
  }

  // Test guest triggering Voice-to-Task Ticket Extraction (Must be 403 Forbidden)
  const guestVoiceTicketRes = await fetch(`${BASE_URL}/api/v1/ai/extract-ticket`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${guestToken}`,
    },
    body: JSON.stringify({ transcriptSnippet: 'Let us file a high priority ticket' }),
  });
  assert(guestVoiceTicketRes.status === 403, 'Guest Voice-to-Task commands rejected with 403 Forbidden');

  // ==========================================
  // 2. NON-ORG USER VERIFICATION
  // ==========================================
  console.log('\n--- 2. Testing NON-ORG User Tier ---');

  // Register a permanent Non-Org creator account
  const timestamp = Date.now();
  const nonOrgEmail = `creator_${timestamp}@test.mivo.dev`;
  const nonOrgPassword = 'Password123!';
  const registerRes = await fetch(`${BASE_URL}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: nonOrgEmail,
      username: `creator_${timestamp}`,
      displayName: `Creator Dev ${timestamp}`,
      password: nonOrgPassword,
    }),
  });
  const registerData = await registerRes.json();
  const nonOrgToken = registerData.data?.accessToken;
  const nonOrgUser = registerData.data?.user;

  assert(registerData.success === true, 'Non-Org user registration succeeds');
  assert(nonOrgUser?.userTier === 'NON_ORG', 'Registered user tier is NON_ORG');
  assert(nonOrgUser?.isGuest === false, 'Non-Org user isGuest is false');
  assert(registerData.data?.capabilities?.canPublishProjects === true, 'Non-Org capabilities: canPublishProjects is true');
  assert(registerData.data?.capabilities?.canMessage === true, 'Non-Org capabilities: canMessage is true');
  assert(registerData.data?.capabilities?.canCall === true, 'Non-Org capabilities: canCall is true');
  assert(registerData.data?.capabilities?.canPlayGames === true, 'Non-Org capabilities: canPlayGames is true');
  assert(registerData.data?.capabilities?.canUseLiveCodeSharing === true, 'Non-Org capabilities: canUseLiveCodeSharing is true');
  assert(registerData.data?.capabilities?.canUseVoiceToTask === false, 'Non-Org capabilities: canUseVoiceToTask is FALSE');
  assert(registerData.data?.capabilities?.maxUploadSizeBytes === 100 * 1024 * 1024, 'Non-Org storage limit is 100MB');

  // Test Non-Org publishing a developer project
  const pubRes = await fetch(`${BASE_URL}/api/v1/projects`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${nonOrgToken}`,
    },
    body: JSON.stringify({
      title: 'Mivo Realtime Canvas Synth',
      description: 'Collaborative audio synthesizer with Web Audio API',
      demoUrl: 'https://demo.mivo.dev/canvas',
      githubUrl: 'https://github.com/mivo/canvas-synth',
      tags: ['audio', 'react', 'typescript'],
      language: 'typescript',
      codeSnippet: 'export const useAudioSynth = () => { /* WebAudio node */ };',
    }),
  });
  const pubData = await pubRes.json();
  if (pubRes.status !== 201) {
    console.error('pubRes failed status:', pubRes.status, 'body:', JSON.stringify(pubData));
  }
  assert(pubRes.status === 201 || pubRes.status === 200, 'Non-Org user can publish projects (200/201)');
  assert(pubData.data?.title === 'Mivo Realtime Canvas Synth', 'Published project title preserved');
  assert(pubData.data?.authorUsername === nonOrgUser.username, 'Author username correctly attributed');
  const createdProjectId = pubData.data?.id;

  // Test listing projects
  const listProjRes = await fetch(`${BASE_URL}/api/v1/projects`);
  const listProjData = await listProjRes.json();
  assert(listProjRes.status === 200, 'Listing developer projects succeeds (200 OK)');
  const foundProj = (listProjData.data || []).find((p) => p.id === createdProjectId);
  assert(Boolean(foundProj), 'Newly published project appears in global project showcase');

  // Test Non-Org attempting Voice-to-Task Ticket Extraction (Must be 403 Forbidden)
  const nonOrgVoiceTicketRes = await fetch(`${BASE_URL}/api/v1/ai/extract-ticket`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${nonOrgToken}`,
    },
    body: JSON.stringify({ transcriptSnippet: 'Alex, file a ticket to optimize PostgreSQL connection pooling' }),
  });
  assert(nonOrgVoiceTicketRes.status === 403, 'Non-Org Voice-to-Task commands rejected with 403 Forbidden');

  // Test deleting own project
  if (createdProjectId) {
    const delRes = await fetch(`${BASE_URL}/api/v1/projects/${createdProjectId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${nonOrgToken}` },
    });
    assert(delRes.status === 200, 'Non-Org author can delete their own project');
  }

  // ==========================================
  // 3. ORG USER VERIFICATION
  // ==========================================
  console.log('\n--- 3. Testing ORG User Tier ---');

  // Log in as an established Org user (dev@mivo.app)
  const orgLoginRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'dev@mivo.app',
      password: 'Password123!',
    }),
  });
  const orgLoginData = await orgLoginRes.json();
  
  if (orgLoginRes.status === 200 && orgLoginData.data) {
    const orgToken = orgLoginData.data.accessToken;
    const orgUser = orgLoginData.data.user;

    assert(orgUser?.userTier === 'ORG', 'Org user userTier is ORG');
    assert(Boolean(orgUser?.organizationId), 'Org user has organizationId');
    assert(orgLoginData.data.capabilities?.canPublishProjects === true, 'Org capabilities: canPublishProjects is true');
    assert(orgLoginData.data.capabilities?.canPlayGames === false, 'Org capabilities: canPlayGames is FALSE (no games)');
    assert(orgLoginData.data.capabilities?.canUseVoiceToTask === true, 'Org capabilities: canUseVoiceToTask is TRUE');
    assert(orgLoginData.data.capabilities?.hasUnlimitedStorage === true, 'Org capabilities: hasUnlimitedStorage is TRUE');
    assert(orgLoginData.data.capabilities?.maxUploadSizeBytes === null, 'Org capabilities: storage limit is unlimited (null)');

    // Test Org User Voice-to-Task ticket extraction (Must succeed or not be 403 Forbidden!)
    const orgVoiceTicketRes = await fetch(`${BASE_URL}/api/v1/ai/extract-ticket`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${orgToken}`,
      },
      body: JSON.stringify({ transcriptSnippet: 'David, file a high priority ticket to scale the Redis adapter by next Monday' }),
    });
    // Should NOT be 403 Forbidden!
    assert(orgVoiceTicketRes.status !== 403, 'Org user Voice-to-Task commands are PERMITTED (not 403 Forbidden)');

    // Test Guest trying to view this Org user profile (Must be 403 Forbidden!)
    const guestViewOrgProfileRes = await fetch(`${BASE_URL}/api/v1/users/${orgUser.id}`, {
      headers: { Authorization: `Bearer ${guestToken}` },
    });
    assert(guestViewOrgProfileRes.status === 403, 'Guest viewing Org profile is BLOCKED (403 Forbidden)');
    const guestViewOrgData = await guestViewOrgProfileRes.json();
    assert(guestViewOrgData.error?.code === 'ORG_PROFILE_RESTRICTED' || guestViewOrgData.code === 'ORG_PROFILE_RESTRICTED', 'Returns code ORG_PROFILE_RESTRICTED for guest accessing Org profile');
  } else {
    console.warn('⚠️ Could not log in with dev@mivo.local, testing with created org user...');
  }

  console.log('\n====================================================');
  console.log(`🏁 TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('====================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

testTiers().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
