/**
 * Module: external-meetings
 * Integration Test: Google Meet & MS Teams Meeting Generation and Room Stage Bridge
 */

const BASE_URL = 'http://localhost:4000/api/v1';

async function run() {
  console.log('🧪 [external-meetings] Running external-meetings.integration.test.js...');

  // 1. Authenticate as dev admin
  const authRes = await (
    await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'dev@mivo.app', password: 'Password123!' }),
    })
  ).json();

  if (!authRes.success || !authRes.data?.accessToken) {
    throw new Error('Authentication failed');
  }
  const token = authRes.data.accessToken;

  // 2. Test Configuration Endpoint
  const configRes = await (
    await fetch(`${BASE_URL}/meetings/config`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  ).json();

  if (!configRes.success || !configRes.data?.google || !configRes.data?.teams) {
    throw new Error('Config retrieval failed');
  }
  console.log('   ✅ Integration configuration verified (Hybrid Mode ready).');

  // 3. Find a room
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

  // 4. Generate Google Meet Session
  const gMeetRes = await (
    await fetch(`${BASE_URL}/meetings/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        provider: 'GOOGLE_MEET',
        title: 'Weekly Sync on Google Meet',
        roomId: room.id,
        shareToChat: true,
        bridgeToRoom: true,
      }),
    })
  ).json();

  if (!gMeetRes.success || !gMeetRes.data?.meeting) {
    throw new Error('Google Meet generation failed');
  }

  const gMeet = gMeetRes.data.meeting;
  if (!gMeet.meetingUrl.includes('meet.google.com') || !gMeet.meetingCode) {
    throw new Error('Invalid Google Meet URL or code format');
  }
  console.log('   ✅ Google Meet generated & validated:', gMeet.meetingUrl);

  // 5. Verify Room Bridge status
  const bridgeRes = await (
    await fetch(`${BASE_URL}/meetings/room/${room.id}/bridge`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  ).json();

  if (!bridgeRes.success || bridgeRes.data?.bridge?.meeting?.id !== gMeet.id) {
    throw new Error('Meeting bridge verification failed');
  }
  console.log('   ✅ Stage bridge verified for Google Meet.');

  // 6. Generate MS Teams Session
  const teamsRes = await (
    await fetch(`${BASE_URL}/meetings/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        provider: 'MS_TEAMS',
        title: 'Executive Sync on Teams',
        roomId: room.id,
        shareToChat: true,
        bridgeToRoom: false,
      }),
    })
  ).json();

  if (!teamsRes.success || !teamsRes.data?.meeting) {
    throw new Error('MS Teams generation failed');
  }

  const teams = teamsRes.data.meeting;
  if (!teams.meetingUrl.includes('teams.microsoft.com') || !teams.conferenceId) {
    throw new Error('Invalid MS Teams URL or conference ID format');
  }
  console.log('   ✅ MS Teams generated & validated:', teams.meetingCode);

  // 7. Bridge MS Teams to room
  const setBridgeRes = await (
    await fetch(`${BASE_URL}/meetings/room/${room.id}/bridge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ meetingId: teams.id }),
    })
  ).json();

  if (!setBridgeRes.success || setBridgeRes.data?.meeting?.id !== teams.id) {
    throw new Error('Switching room bridge to MS Teams failed');
  }
  console.log('   ✅ Stage bridge switched to MS Teams.');

  // 8. Remove Room Bridge
  const removeRes = await (
    await fetch(`${BASE_URL}/meetings/room/${room.id}/bridge`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
  ).json();

  if (!removeRes.success) {
    throw new Error('Bridge removal failed');
  }

  const finalBridge = await (
    await fetch(`${BASE_URL}/meetings/room/${room.id}/bridge`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  ).json();

  if (finalBridge.data?.bridge !== null) {
    throw new Error('Bridge was not cleared properly');
  }
  console.log('   ✅ Stage bridge successfully disconnected.');

  // 9. Group Conversation Google Meet & MS Teams Integration
  console.log('   🧪 Testing Group Conversation external meetings...');
  
  // Find or create a group conversation
  let convRes = await (
    await fetch(`${BASE_URL}/conversations`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  ).json();

  let groupConv = convRes.data?.find((c) => c.type === 'GROUP');
  if (!groupConv) {
    // Create one
    const newGroupRes = await (
      await fetch(`${BASE_URL}/conversations/group`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: 'Core Strategy Group',
          memberIds: [],
        }),
      })
    ).json();
    groupConv = newGroupRes.data;
  }

  if (!groupConv?.id) {
    throw new Error('Could not find or create group conversation');
  }

  // 10. Generate Google Meet for Group Conversation with shareToChat and bridge
  const groupGMeetRes = await (
    await fetch(`${BASE_URL}/meetings/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        provider: 'GOOGLE_MEET',
        title: 'Group Strategy Sync on Google Meet',
        conversationId: groupConv.id,
        shareToChat: true,
        bridgeToConversation: true,
      }),
    })
  ).json();

  if (!groupGMeetRes.success || !groupGMeetRes.data?.meeting) {
    throw new Error('Group Google Meet generation failed');
  }
  const groupGMeet = groupGMeetRes.data.meeting;
  console.log('   ✅ Group Google Meet generated:', groupGMeet.meetingUrl);

  // 11. Verify Group Conversation Messages contains the Meeting Card Attachment
  const convMsgsRes = await (
    await fetch(`${BASE_URL}/conversations/${groupConv.id}/messages`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  ).json();

  const meetingMsg = convMsgsRes.data?.find((m) =>
    m.attachments?.some((att) => att.type === 'external-meeting' && att.meeting?.id === groupGMeet.id)
  );

  if (!meetingMsg) {
    throw new Error('Meeting card attachment not found in group conversation messages');
  }
  console.log('   ✅ Group chat received meeting invitation card with 1-click join link.');

  // 12. Verify Group Conversation Bridge
  const groupBridgeRes = await (
    await fetch(`${BASE_URL}/meetings/conversation/${groupConv.id}/bridge`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  ).json();

  if (!groupBridgeRes.success || groupBridgeRes.data?.bridge?.meeting?.id !== groupGMeet.id) {
    throw new Error('Group conversation bridge verification failed');
  }
  console.log('   ✅ Group conversation banner bridge active.');

  // 13. Generate MS Teams for Group and Switch Bridge
  const groupTeamsRes = await (
    await fetch(`${BASE_URL}/meetings/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        provider: 'MS_TEAMS',
        title: 'Group Quarterly Review on Teams',
        conversationId: groupConv.id,
        shareToChat: true,
        bridgeToConversation: false,
      }),
    })
  ).json();

  const groupTeams = groupTeamsRes.data.meeting;
  const switchGroupBridge = await (
    await fetch(`${BASE_URL}/meetings/conversation/${groupConv.id}/bridge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ meetingId: groupTeams.id }),
    })
  ).json();

  if (!switchGroupBridge.success || switchGroupBridge.data?.meeting?.id !== groupTeams.id) {
    throw new Error('Switching group conversation bridge to MS Teams failed');
  }
  console.log('   ✅ Group conversation bridge switched to MS Teams.');

  // 14. Disconnect Group Bridge
  const deleteGroupBridge = await (
    await fetch(`${BASE_URL}/meetings/conversation/${groupConv.id}/bridge`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
  ).json();

  if (!deleteGroupBridge.success) {
    throw new Error('Failed to delete group bridge');
  }
  console.log('   ✅ Group conversation bridge removed cleanly.');

  console.log('🎉 [external-meetings] All Google Meet & MS Teams integration tests (Rooms & Groups) PASSED!');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
