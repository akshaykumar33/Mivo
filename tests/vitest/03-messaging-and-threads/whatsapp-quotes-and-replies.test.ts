import { describe, it, expect } from 'vitest';

describe('Messaging & Chat Module — WhatsApp-Style Inline Quotes & Replies', () => {
  interface MessageWithReply {
    id: string;
    content: string;
    senderId: string;
    senderDisplayName: string;
    replyToId?: string;
    replyToMessage?: {
      id: string;
      senderDisplayName: string;
      content: string;
    };
  }

  function formatQuoteSnippet(content: string, maxLength = 80): string {
    const trimmed = content.trim();
    if (trimmed.length <= maxLength) return trimmed;
    return `${trimmed.slice(0, maxLength)}...`;
  }

  function buildReplyPayload(
    original: MessageWithReply,
    replyContent: string,
    replierId: string,
    replierName: string
  ): MessageWithReply {
    return {
      id: `reply-${Date.now()}`,
      content: replyContent,
      senderId: replierId,
      senderDisplayName: replierName,
      replyToId: original.id,
      replyToMessage: {
        id: original.id,
        senderDisplayName: original.senderDisplayName,
        content: formatQuoteSnippet(original.content),
      },
    };
  }

  it('correctly constructs a WhatsApp-style quote payload referencing parent message', () => {
    const originalMsg: MessageWithReply = {
      id: 'msg-root-1',
      content: 'Can you deploy the SFU update to the staging cluster tonight?',
      senderId: 'usr-alex',
      senderDisplayName: 'Alex Mercer',
    };

    const reply = buildReplyPayload(originalMsg, 'Sure, scheduled for 22:00 UTC.', 'usr-dev', 'Dev Admin');

    expect(reply.replyToId).toBe('msg-root-1');
    expect(reply.replyToMessage?.senderDisplayName).toBe('Alex Mercer');
    expect(reply.replyToMessage?.content).toBe(originalMsg.content);
    expect(reply.content).toBe('Sure, scheduled for 22:00 UTC.');
  });

  it('truncates long quoted parent messages with an ellipsis', () => {
    const longContent = 'A'.repeat(150);
    const snippet = formatQuoteSnippet(longContent, 80);
    expect(snippet).toHaveLength(83); // 80 + '...'
    expect(snippet.endsWith('...')).toBe(true);
  });

  it('preserves quotes when quoted content includes markdown or code blocks', () => {
    const codeContent = '```typescript\nconst sfu = new SFUEngine();\n```';
    const snippet = formatQuoteSnippet(codeContent);
    expect(snippet).toContain('```typescript');
  });
});
