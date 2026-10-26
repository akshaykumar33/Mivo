import { describe, it, expect } from 'vitest';
import { AiTwinConfigDTO } from '@mivo/shared';

export function shouldAiTwinAutoReply(
  config: AiTwinConfigDTO,
  userPresence: 'ONLINE' | 'DND' | 'IDLE' | 'OFFLINE'
): boolean {
  if (!config.enabled) return false;
  if (userPresence === 'ONLINE') return false;
  if (userPresence === 'DND' && config.autoReplyDnd) return true;
  if (userPresence === 'OFFLINE' && config.autoReplyOffline) return true;
  if (userPresence === 'IDLE' && (config.autoReplyDnd || config.autoReplyOffline)) return true;
  return false;
}

export function addCallbackSlot(slots: string[], newSlot: string): string[] {
  const trimmed = newSlot.trim();
  if (!trimmed || slots.includes(trimmed)) return slots;
  return [...slots, trimmed];
}

export function removeCallbackSlot(slots: string[], slotToRemove: string): string[] {
  return slots.filter((s) => s !== slotToRemove);
}

export function formatAiTwinResponse(
  twinName: string,
  userName: string,
  message: string,
  proposedSlot?: string
): string {
  let reply = `[AI Twin for ${userName}]: ${message}`;
  if (proposedSlot) {
    reply += `\nWould you like to schedule a callback for: ${proposedSlot}?`;
  }
  return reply;
}

describe('AI Twin & Out-of-Office Persona Engine', () => {
  const defaultConfig: AiTwinConfigDTO = {
    userId: 'user-elena',
    enabled: true,
    personaPrompt: 'I am Elena Rostova AI Twin. I answer engineering inquiries when she is away.',
    autoReplyDnd: true,
    autoReplyOffline: true,
    autoCallbackEnabled: true,
    callbackSlots: [
      'Tomorrow at 10:00 AM - 10:30 AM (UTC)',
      'Tomorrow at 2:00 PM - 2:30 PM (UTC)',
    ],
    indexedContextSummary: 'Indexed 48 chat messages and 12 pull requests.',
  };

  it('triggers auto-reply conditionally based on recipient presence status', () => {
    // When user is ONLINE, AI Twin should not intercept
    expect(shouldAiTwinAutoReply(defaultConfig, 'ONLINE')).toBe(false);

    // When user is in DND and autoReplyDnd is true
    expect(shouldAiTwinAutoReply(defaultConfig, 'DND')).toBe(true);

    // When user is OFFLINE and autoReplyOffline is true
    expect(shouldAiTwinAutoReply(defaultConfig, 'OFFLINE')).toBe(true);

    // When AI Twin is globally disabled
    const disabledConfig = { ...defaultConfig, enabled: false };
    expect(shouldAiTwinAutoReply(disabledConfig, 'DND')).toBe(false);
    expect(shouldAiTwinAutoReply(disabledConfig, 'OFFLINE')).toBe(false);
  });

  it('manages available callback calendar slots idempotently without duplicates', () => {
    let slots = [...defaultConfig.callbackSlots];

    // Add unique slot
    slots = addCallbackSlot(slots, 'Friday at 3:00 PM (UTC)');
    expect(slots).toHaveLength(3);
    expect(slots).toContain('Friday at 3:00 PM (UTC)');

    // Attempt to add duplicate
    slots = addCallbackSlot(slots, 'Friday at 3:00 PM (UTC)');
    expect(slots).toHaveLength(3); // no change

    // Remove slot
    slots = removeCallbackSlot(slots, 'Tomorrow at 10:00 AM - 10:30 AM (UTC)');
    expect(slots).toHaveLength(2);
    expect(slots).not.toContain('Tomorrow at 10:00 AM - 10:30 AM (UTC)');
  });

  it('formats AI Twin automated responses with persona attribution and callback proposals', () => {
    const responseWithSlot = formatAiTwinResponse(
      'Elena Twin',
      'Elena Rostova',
      'I am currently deep in a focus sprint.',
      'Tomorrow at 2:00 PM UTC'
    );

    expect(responseWithSlot).toContain('[AI Twin for Elena Rostova]:');
    expect(responseWithSlot).toContain('I am currently deep in a focus sprint.');
    expect(responseWithSlot).toContain('Would you like to schedule a callback for: Tomorrow at 2:00 PM UTC?');
  });
});
