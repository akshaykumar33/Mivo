import { describe, it, expect } from 'vitest';

export interface ThreadMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
  threadId?: string | null;
  replyToId?: string | null;
  isThreadBroadcast?: boolean;
  expiresAt?: string | null;
}

export function buildThreadSummary(parentMessageId: string, messages: ThreadMessage[]) {
  const replies = messages.filter((m) => m.threadId === parentMessageId);
  const replyCount = replies.length;
  const lastReply = replyCount > 0 ? replies[replies.length - 1] : null;
  const participantIds = Array.from(new Set(replies.map((m) => m.senderId)));

  return {
    parentMessageId,
    replyCount,
    lastReplyAt: lastReply?.createdAt || null,
    participantIds,
    replies,
  };
}

export function computeMessageExpiration(
  createdAt: Date,
  retentionPolicy: '24h' | '7d' | '30d' | '90d' | 'off'
): Date | null {
  if (retentionPolicy === 'off') return null;

  const msMap: Record<string, number> = {
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
    '90d': 90 * 24 * 60 * 60 * 1000,
  };

  return new Date(createdAt.getTime() + msMap[retentionPolicy]);
}

export function isMessageExpired(message: { expiresAt?: string | null }, now: Date = new Date()): boolean {
  if (!message.expiresAt) return false;
  return new Date(message.expiresAt).getTime() <= now.getTime();
}

export function filterActiveMessages(messages: ThreadMessage[], now: Date = new Date()): ThreadMessage[] {
  return messages.filter((m) => !isMessageExpired(m, now));
}

describe('Messaging & Slack Threads with Retention Engine', () => {
  it('correctly associates thread replies with parent message and computes metadata', () => {
    const parentId = '11111111-1111-4111-8111-111111111111';
    const messages: ThreadMessage[] = [
      {
        id: parentId,
        conversationId: 'conv-1',
        senderId: 'user-alice',
        content: 'Original thread root inquiry',
        createdAt: '2026-10-26T10:00:00.000Z',
      },
      {
        id: '22222222-2222-4222-8222-222222222222',
        conversationId: 'conv-1',
        senderId: 'user-bob',
        content: 'Replying in thread 1',
        createdAt: '2026-10-26T10:05:00.000Z',
        threadId: parentId,
      },
      {
        id: '33333333-3333-4333-8333-333333333333',
        conversationId: 'conv-1',
        senderId: 'user-charlie',
        content: 'Replying in thread 2 with broadcast',
        createdAt: '2026-10-26T10:10:00.000Z',
        threadId: parentId,
        isThreadBroadcast: true,
      },
      {
        id: '44444444-4444-4444-8444-444444444444',
        conversationId: 'conv-1',
        senderId: 'user-dave',
        content: 'Different top-level message',
        createdAt: '2026-10-26T10:15:00.000Z',
      },
    ];

    const summary = buildThreadSummary(parentId, messages);
    expect(summary.replyCount).toBe(2);
    expect(summary.lastReplyAt).toBe('2026-10-26T10:10:00.000Z');
    expect(summary.participantIds).toEqual(['user-bob', 'user-charlie']);
    expect(summary.replies[1].isThreadBroadcast).toBe(true);
  });

  it('calculates accurate auto-disappearing expiration timestamps across policies', () => {
    const baseDate = new Date('2026-10-26T12:00:00.000Z');

    const exp24h = computeMessageExpiration(baseDate, '24h');
    expect(exp24h?.toISOString()).toBe('2026-10-27T12:00:00.000Z');

    const exp7d = computeMessageExpiration(baseDate, '7d');
    expect(exp7d?.toISOString()).toBe('2026-11-02T12:00:00.000Z');

    const exp90d = computeMessageExpiration(baseDate, '90d');
    expect(exp90d?.toISOString()).toBe('2027-01-24T12:00:00.000Z');

    const expOff = computeMessageExpiration(baseDate, 'off');
    expect(expOff).toBeNull();
  });

  it('filters out expired messages and retains active messages based on expiration epoch', () => {
    const now = new Date('2026-10-26T15:00:00.000Z');
    const messages: ThreadMessage[] = [
      {
        id: 'msg-1',
        conversationId: 'c1',
        senderId: 'u1',
        content: 'Permanent message',
        createdAt: '2026-10-26T10:00:00.000Z',
        expiresAt: null,
      },
      {
        id: 'msg-2',
        conversationId: 'c1',
        senderId: 'u2',
        content: 'Already expired message',
        createdAt: '2026-10-26T10:00:00.000Z',
        expiresAt: '2026-10-26T14:59:59.000Z',
      },
      {
        id: 'msg-3',
        conversationId: 'c1',
        senderId: 'u3',
        content: 'Still active ephemeral message',
        createdAt: '2026-10-26T14:30:00.000Z',
        expiresAt: '2026-10-26T15:30:00.000Z',
      },
    ];

    expect(isMessageExpired(messages[0], now)).toBe(false);
    expect(isMessageExpired(messages[1], now)).toBe(true);
    expect(isMessageExpired(messages[2], now)).toBe(false);

    const active = filterActiveMessages(messages, now);
    expect(active.length).toBe(2);
    expect(active.map((m) => m.id)).toEqual(['msg-1', 'msg-3']);
  });
});
