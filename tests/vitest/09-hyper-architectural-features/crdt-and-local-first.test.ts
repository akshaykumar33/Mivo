import { describe, it, expect } from 'vitest';

export interface CRDTMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  lamportTime: number;
  createdAt: number;
}

export class LocalFirstOutbox {
  private queue: CRDTMessage[] = [];

  enqueue(msg: CRDTMessage) {
    this.queue.push(msg);
  }

  getPending(): CRDTMessage[] {
    return [...this.queue];
  }

  acknowledge(messageId: string) {
    this.queue = this.queue.filter((m) => m.id !== messageId);
  }

  clear() {
    this.queue = [];
  }
}

export function sortMessagesByLamport(messages: CRDTMessage[]): CRDTMessage[] {
  return [...messages].sort((a, b) => {
    if (a.lamportTime !== b.lamportTime) {
      return a.lamportTime - b.lamportTime;
    }
    // Tie-break deterministically using lexical comparison of message IDs
    return a.id.localeCompare(b.id);
  });
}

export function deduplicateMessages(messages: CRDTMessage[]): CRDTMessage[] {
  const seen = new Set<string>();
  const deduped: CRDTMessage[] = [];
  for (const m of messages) {
    if (!seen.has(m.id)) {
      seen.add(m.id);
      deduped.push(m);
    }
  }
  return deduped;
}

describe('CRDT Synchronization & Local-First Messaging Engine', () => {
  it('enqueues offline mutations in outbox and flushes upon server acknowledgment', () => {
    const outbox = new LocalFirstOutbox();
    const msg1: CRDTMessage = {
      id: 'msg-local-1',
      conversationId: 'c1',
      senderId: 'u1',
      content: 'Offline draft 1',
      lamportTime: 1,
      createdAt: 1000,
    };
    const msg2: CRDTMessage = {
      id: 'msg-local-2',
      conversationId: 'c1',
      senderId: 'u1',
      content: 'Offline draft 2',
      lamportTime: 2,
      createdAt: 1005,
    };

    outbox.enqueue(msg1);
    outbox.enqueue(msg2);
    expect(outbox.getPending()).toHaveLength(2);

    // Reconnect: server acknowledges msg1
    outbox.acknowledge('msg-local-1');
    expect(outbox.getPending()).toHaveLength(1);
    expect(outbox.getPending()[0].id).toBe('msg-local-2');

    // Final acknowledgment
    outbox.acknowledge('msg-local-2');
    expect(outbox.getPending()).toHaveLength(0);
  });

  it('orders concurrent messages strictly by Lamport logical clock with deterministic tie-breaking', () => {
    const messages: CRDTMessage[] = [
      { id: 'msg-c', conversationId: 'c1', senderId: 'u1', content: 'C', lamportTime: 5, createdAt: 1010 },
      { id: 'msg-a', conversationId: 'c1', senderId: 'u2', content: 'A', lamportTime: 2, createdAt: 1000 },
      { id: 'msg-b2', conversationId: 'c1', senderId: 'u3', content: 'B2', lamportTime: 3, createdAt: 1005 },
      { id: 'msg-b1', conversationId: 'c1', senderId: 'u4', content: 'B1', lamportTime: 3, createdAt: 1004 },
    ];

    const sorted = sortMessagesByLamport(messages);
    expect(sorted.map((m) => m.id)).toEqual(['msg-a', 'msg-b1', 'msg-b2', 'msg-c']);
  });

  it('enforces idempotency and eliminates duplicate message arrivals', () => {
    const streamWithDuplicates: CRDTMessage[] = [
      { id: 'dup-1', conversationId: 'c1', senderId: 'u1', content: 'First arrival', lamportTime: 1, createdAt: 100 },
      { id: 'dup-2', conversationId: 'c1', senderId: 'u2', content: 'Unique message', lamportTime: 2, createdAt: 200 },
      { id: 'dup-1', conversationId: 'c1', senderId: 'u1', content: 'Duplicate delivery', lamportTime: 1, createdAt: 100 },
    ];

    const deduped = deduplicateMessages(streamWithDuplicates);
    expect(deduped).toHaveLength(2);
    expect(deduped[0].id).toBe('dup-1');
    expect(deduped[1].id).toBe('dup-2');
  });
});
