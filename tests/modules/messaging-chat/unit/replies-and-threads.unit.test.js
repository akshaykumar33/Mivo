/**
 * Module: messaging-chat
 * Unit Test: WhatsApp-style Quote Reply & Slack-style Threading Contracts and Logic
 */

import assert from 'node:assert/strict';
import { SendMessageSchema } from '../../../../packages/shared/dist/schemas/message.schema.js';
import { SendDirectMessageSchema } from '../../../../packages/shared/dist/schemas/conversation.schema.js';

console.log('═══════════════════════════════════════════════════════════════');
console.log('🧪 [messaging-chat/unit] WhatsApp Reply & Slack Threading Test');
console.log('═══════════════════════════════════════════════════════════════\n');

// 1. WhatsApp Quote Reply Schema Validation
console.log('1. Validating SendMessageSchema with WhatsApp quote reply...');
const validReply = SendMessageSchema.safeParse({
  content: 'Replying to your comment about Redis queues',
  replyToId: '11111111-2222-4333-8444-555555555555',
});
assert.equal(validReply.success, true, 'Valid reply should parse successfully');
assert.equal(validReply.data.replyToId, '11111111-2222-4333-8444-555555555555');
console.log('   ✅ Valid replyToId parsed in SendMessageSchema');

// 2. Slack Thread Reply Schema Validation
console.log('2. Validating SendMessageSchema with Slack thread reply & broadcast...');
const validThreadReply = SendMessageSchema.safeParse({
  content: 'Here is the detailed thread explanation',
  threadId: '99999999-8888-4777-8666-555555555555',
  isThreadBroadcast: true,
});
assert.equal(validThreadReply.success, true, 'Valid thread reply should parse successfully');
assert.equal(validThreadReply.data.threadId, '99999999-8888-4777-8666-555555555555');
assert.equal(validThreadReply.data.isThreadBroadcast, true);
console.log('   ✅ Valid threadId and isThreadBroadcast parsed in SendMessageSchema');

// 3. Direct Message Schema Validation
console.log('3. Validating SendDirectMessageSchema for 1-on-1 & Group DMs...');
const validDmThread = SendDirectMessageSchema.safeParse({
  content: 'Direct message thread response',
  replyToId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
  threadId: 'ffffffff-0000-4111-8222-333333333333',
  isThreadBroadcast: false,
});
assert.equal(validDmThread.success, true, 'DM thread should parse successfully');
assert.equal(validDmThread.data.replyToId, 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee');
assert.equal(validDmThread.data.threadId, 'ffffffff-0000-4111-8222-333333333333');
assert.equal(validDmThread.data.isThreadBroadcast, false);
console.log('   ✅ Valid SendDirectMessageSchema verified');

// 4. Thread Metadata Aggregation Logic
console.log('4. Testing Slack Thread Metadata computation logic...');
function computeThreadStats(replies) {
  const replyCount = replies.length;
  const participantMap = new Map();
  for (const r of replies) {
    if (!participantMap.has(r.sender.id)) {
      participantMap.set(r.sender.id, {
        id: r.sender.id,
        username: r.sender.username,
        displayName: r.sender.displayName,
        avatarUrl: r.sender.avatarUrl,
      });
    }
  }
  const lastReply = replies[replies.length - 1];
  return {
    replyCount,
    participants: Array.from(participantMap.values()).slice(0, 5),
    lastReplyAt: lastReply ? lastReply.createdAt : null,
  };
}

const mockReplies = [
  { id: '1', sender: { id: 'u1', username: 'alice', displayName: 'Alice' }, createdAt: '2026-10-26T10:00:00Z' },
  { id: '2', sender: { id: 'u2', username: 'bob', displayName: 'Bob' }, createdAt: '2026-10-26T10:05:00Z' },
  { id: '3', sender: { id: 'u1', username: 'alice', displayName: 'Alice' }, createdAt: '2026-10-26T10:10:00Z' },
  { id: '4', sender: { id: 'u3', username: 'charlie', displayName: 'Charlie' }, createdAt: '2026-10-26T10:15:00Z' },
];

const stats = computeThreadStats(mockReplies);
assert.equal(stats.replyCount, 4, 'Should count 4 replies');
assert.equal(stats.participants.length, 3, 'Should have 3 unique participants (alice, bob, charlie)');
assert.equal(stats.lastReplyAt, '2026-10-26T10:15:00Z', 'Should track latest reply timestamp');
console.log('   ✅ Thread metadata computation verified: ' + stats.replyCount + ' replies, ' + stats.participants.length + ' participants');

// 5. WhatsApp Quote Card Formatting
console.log('5. Testing WhatsApp Quote snippet generator...');
function formatQuoteSnippet(msg) {
  if (msg.content && msg.content.trim()) {
    return msg.content.length > 80 ? msg.content.slice(0, 77) + '...' : msg.content;
  }
  if (msg.attachments && msg.attachments.length > 0) {
    return `Shared ${msg.attachments.length} attachment${msg.attachments.length > 1 ? 's' : ''}`;
  }
  return 'Message';
}

assert.equal(formatQuoteSnippet({ content: 'Short message' }), 'Short message');
assert.equal(
  formatQuoteSnippet({ content: 'A'.repeat(100) }),
  'A'.repeat(77) + '...',
  'Long content should truncate with ellipsis'
);
assert.equal(formatQuoteSnippet({ content: '', attachments: [{ id: '1' }] }), 'Shared 1 attachment');
assert.equal(formatQuoteSnippet({ content: '', attachments: [{ id: '1' }, { id: '2' }] }), 'Shared 2 attachments');
console.log('   ✅ WhatsApp Quote snippet formatting verified');

console.log('\n🎉 ALL REPLIES & THREADS UNIT TESTS PASSED SUCCESSFULLY!\n');
