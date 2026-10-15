/**
 * Module: messaging-chat
 * Integration Test: Direct Messaging, Custom Group Creation, Attachments, and Audio Calling Signaling
 */

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { io } = require('../../../../apps/web/node_modules/socket.io-client');

const BASE_HTTP_URL = 'http://localhost:4000/api/v1';
const WS_URL = 'http://localhost:4000';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function loginUser(email, password) {
  const res = await fetch(`${BASE_HTTP_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(`Login failed for ${email}: ${JSON.stringify(data)}`);
  return data.data;
}

function connectSocket(token) {
  return new Promise((resolve, reject) => {
    const socket = io(WS_URL, {
      auth: { token },
      transports: ['websocket'],
      forceNew: true,
      timeout: 5000,
    });

    socket.on('connect', () => resolve(socket));
    socket.on('connect_error', (err) => reject(err));
  });
}

async function run() {
  console.log('🧪 [messaging-chat/integration] Running direct-group-messaging.integration.test.js...');

  // 1. Authenticate two test users
  const user1 = await loginUser('dev@mivo.app', 'Password123!');
  const user2 = await loginUser('alex@mivo.app', 'Password123!');

  if (!user1.user?.id || !user2.user?.id) {
    throw new Error('Failed to retrieve user profiles for testing');
  }

  // 2. Test User Discovery Search (GET /api/v1/users?q=alex)
  const searchRes = await (
    await fetch(`${BASE_HTTP_URL}/users?q=alex`, {
      headers: { Authorization: `Bearer ${user1.accessToken}` },
    })
  ).json();

  if (!searchRes.success || !Array.isArray(searchRes.data)) {
    throw new Error('User search endpoint failed');
  }
  const foundAlex = searchRes.data.some((u) => u.id === user2.user.id || u.username === 'alex');
  if (!foundAlex) {
    throw new Error('User search did not return target user');
  }
  console.log('   ✅ User discovery and search endpoint verified.');

  // 3. Test 1-to-1 Direct Conversation Creation (POST /api/v1/conversations/direct)
  const dmRes1 = await (
    await fetch(`${BASE_HTTP_URL}/conversations/direct`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user1.accessToken}`,
      },
      body: JSON.stringify({ recipientId: user2.user.id }),
    })
  ).json();

  if (!dmRes1.success || dmRes1.data.type !== 'DIRECT') {
    throw new Error(`Direct conversation creation failed: ${JSON.stringify(dmRes1)}`);
  }
  const directConvId = dmRes1.data.id;

  // Verify idempotency (calling again returns the exact same conversation)
  const dmRes2 = await (
    await fetch(`${BASE_HTTP_URL}/conversations/direct`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user1.accessToken}`,
      },
      body: JSON.stringify({ recipientId: user2.user.id }),
    })
  ).json();

  if (dmRes2.data.id !== directConvId) {
    throw new Error('Direct conversation creation is not idempotent');
  }
  console.log('   ✅ Direct conversation creation & idempotency verified.');

  // 4. Test Custom Group Creation (POST /api/v1/conversations/group)
  const groupRes = await (
    await fetch(`${BASE_HTTP_URL}/conversations/group`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user1.accessToken}`,
      },
      body: JSON.stringify({
        name: 'Alpha Engineering Sync',
        memberIds: [user2.user.id],
        iconUrl: 'https://mivo.app/icons/eng.png',
      }),
    })
  ).json();

  if (
    !groupRes.success ||
    groupRes.data.type !== 'GROUP' ||
    groupRes.data.name !== 'Alpha Engineering Sync' ||
    groupRes.data.members.length < 2
  ) {
    throw new Error(`Custom group creation failed: ${JSON.stringify(groupRes)}`);
  }
  const groupConvId = groupRes.data.id;
  console.log('   ✅ Custom group conversation creation with member selection verified.');

  // 5. Connect Socket.IO clients for User 1 & User 2
  const socket1 = await connectSocket(user1.accessToken);
  const socket2 = await connectSocket(user2.accessToken);

  // Join DM room on socket
  await new Promise((resolve) => {
    socket1.emit('dm:join', { conversationId: directConvId }, (res) => resolve(res));
  });
  await new Promise((resolve) => {
    socket2.emit('dm:join', { conversationId: directConvId }, (res) => resolve(res));
  });

  // 6. Test Real-time Direct Messaging with Attachments
  const testContent = `Direct Message with Attachment at ${Date.now()}`;
  const testAttachment = {
    name: 'architecture-spec.pdf',
    url: 'https://storage.supabase.co/mivo-files/architecture-spec.pdf',
    type: 'application/pdf',
    size: 20480,
  };

  const messagePromise = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timeout waiting for dm:new_message')), 5000);
    socket2.on('dm:new_message', (msg) => {
      clearTimeout(timer);
      resolve(msg);
    });
  });

  socket1.emit('dm:send_message', {
    conversationId: directConvId,
    content: testContent,
    attachments: [testAttachment],
  });

  const receivedMsg = await messagePromise;
  if (receivedMsg.content !== testContent || !receivedMsg.attachments || receivedMsg.attachments.length === 0) {
    throw new Error('Received DM message does not match sent content and attachments');
  }

  // Verify persistence via REST API
  const messagesListRes = await (
    await fetch(`${BASE_HTTP_URL}/conversations/${directConvId}/messages`, {
      headers: { Authorization: `Bearer ${user2.accessToken}` },
    })
  ).json();

  if (!messagesListRes.success || !messagesListRes.data.some((m) => m.content === testContent)) {
    throw new Error('Direct message was not persisted to database');
  }
  console.log('   ✅ Real-time DM delivery and database persistence verified.');

  // 7. Test Typing Indicators & Reactions
  const typingPromise = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timeout waiting for dm:typing')), 4000);
    socket2.on('dm:typing', (data) => {
      clearTimeout(timer);
      resolve(data);
    });
  });

  socket1.emit('dm:typing', { conversationId: directConvId });
  const typingData = await typingPromise;
  if (typingData.conversationId !== directConvId) {
    throw new Error('Typing indicator data mismatch');
  }

  const reactionPromise = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timeout waiting for dm:reaction_added')), 4000);
    socket2.on('dm:reaction_added', (data) => {
      clearTimeout(timer);
      resolve(data);
    });
  });

  socket1.emit('dm:reaction_add', {
    conversationId: directConvId,
    messageId: receivedMsg.id,
    emoji: '🔥',
  });
  const reactionData = await reactionPromise;
  if (reactionData.emoji !== '🔥' || reactionData.messageId !== receivedMsg.id) {
    throw new Error('Reaction broadcast data mismatch');
  }
  console.log('   ✅ Real-time typing indicators and emoji reactions verified.');

  // 8. Test Direct Audio Call Signaling (Invite -> Ring -> Accept -> WebRTC Relay -> End)
  const incomingCallPromise = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timeout waiting for call:incoming')), 5000);
    socket2.on('call:incoming', (data) => {
      clearTimeout(timer);
      resolve(data);
    });
  });

  socket1.emit('call:invite', { conversationId: directConvId });
  const incomingCall = await incomingCallPromise;
  if (incomingCall.conversationId !== directConvId || incomingCall.callerId !== user1.user.id) {
    throw new Error('Incoming call broadcast data mismatch');
  }

  // Socket 2 accepts the call
  const callAcceptedPromise = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timeout waiting for call:accepted')), 5000);
    socket1.on('call:accepted', (data) => {
      clearTimeout(timer);
      resolve(data);
    });
  });

  socket2.emit('call:accept', { conversationId: directConvId });
  const acceptedData = await callAcceptedPromise;
  if (acceptedData.conversationId !== directConvId) {
    throw new Error('Call accepted payload mismatch');
  }

  // Test WebRTC Signaling Relay for Audio Call
  const signalingPromise = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timeout waiting for signaling:offer')), 5000);
    socket2.on('signaling:offer', (data) => {
      clearTimeout(timer);
      resolve(data);
    });
  });

  socket1.emit('signaling:offer', {
    conversationId: directConvId,
    targetUserId: user2.user.id,
    sdp: { type: 'offer', sdp: 'v=0\r\no=MivoAudioCall 1 1 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0' },
  });

  const offerData = await signalingPromise;
  if (offerData.conversationId !== directConvId || !offerData.sdp) {
    throw new Error('Signaling offer relay mismatch');
  }

  // End Call
  const callEndedPromise = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timeout waiting for call:ended')), 5000);
    socket2.on('call:ended', (data) => {
      clearTimeout(timer);
      resolve(data);
    });
  });

  socket1.emit('call:end', { conversationId: directConvId });
  await callEndedPromise;
  console.log('   ✅ Direct audio call lifecycle & WebRTC signaling relay verified.');

  // 9. Test Group Audio Call (Invite -> Decline)
  const groupCallPromise = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timeout waiting for group call:incoming')), 5000);
    socket2.on('call:incoming', (data) => {
      clearTimeout(timer);
      resolve(data);
    });
  });

  socket1.emit('call:invite', { conversationId: groupConvId });
  const groupCall = await groupCallPromise;
  if (!groupCall.isGroup || groupCall.groupName !== 'Alpha Engineering Sync') {
    throw new Error('Group call incoming payload mismatch');
  }

  const groupDeclinePromise = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timeout waiting for call:declined')), 5000);
    socket1.on('call:declined', (data) => {
      clearTimeout(timer);
      resolve(data);
    });
  });

  socket2.emit('call:decline', { conversationId: groupConvId });
  await groupDeclinePromise;
  console.log('   ✅ Group audio call invitation & decline verified.');

  // Cleanup
  socket1.disconnect();
  socket2.disconnect();

  console.log('   🎉 All Direct & Group Messaging + Audio Calling features fully verified!');
}

run().catch((e) => {
  console.error('❌ Direct & Group Messaging Test Error:', e);
  process.exit(1);
});
