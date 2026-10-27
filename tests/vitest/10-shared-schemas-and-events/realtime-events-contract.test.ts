import { describe, it, expect } from 'vitest';
import { REALTIME_EVENTS } from '@mivo/shared';

describe('Realtime Events Contract & Namespace Integrity', () => {
  it('defines unique event strings across all keys without collision', () => {
    const eventValues = Object.values(REALTIME_EVENTS);
    const uniqueValues = new Set(eventValues);

    expect(eventValues.length).toBeGreaterThan(30);
    expect(uniqueValues.size).toBe(eventValues.length);
  });

  it('enforces canonical namespace:action structure on all realtime events', () => {
    const eventValues = Object.values(REALTIME_EVENTS);

    for (const eventName of eventValues) {
      expect(eventName).toMatch(/^[a-z0-9_]+:[a-z0-9_]+$/);
    }
  });

  it('covers all mission-critical domains within the platform contract', () => {
    const eventValues = Object.values(REALTIME_EVENTS);
    const prefixes = new Set(eventValues.map((e) => e.split(':')[0]));

    expect(prefixes.has('presence')).toBe(true);
    expect(prefixes.has('room')).toBe(true);
    expect(prefixes.has('chat')).toBe(true);
    expect(prefixes.has('dm')).toBe(true);
    expect(prefixes.has('call')).toBe(true);
    expect(prefixes.has('meeting')).toBe(true);
    expect(prefixes.has('signaling')).toBe(true);
    expect(prefixes.has('notification')).toBe(true);
    expect(prefixes.has('ticket')).toBe(true);
  });

  it('exposes essential E2EE, Host Moderation, and Audio Calling constants', () => {
    expect(REALTIME_EVENTS.ROOM_HOST_ACTION).toBe('room:host_action');
    expect(REALTIME_EVENTS.CALL_INVITE).toBe('call:invite');
    expect(REALTIME_EVENTS.CALL_INCOMING).toBe('call:incoming');
    expect(REALTIME_EVENTS.CALL_END).toBe('call:end');
    expect(REALTIME_EVENTS.MEETING_BRIDGE_ACTIVATED).toBe('meeting:bridge_activated');
  });
});
