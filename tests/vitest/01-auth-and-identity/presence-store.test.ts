import { describe, it, expect, beforeEach } from 'vitest';
import { usePresenceStore } from '@/stores/presenceStore';

describe('Presence Store & Realtime Availability Map', () => {
  beforeEach(() => {
    usePresenceStore.setState({
      userStatuses: {},
    });
  });

  it('initializes with empty userStatuses map', () => {
    expect(usePresenceStore.getState().userStatuses).toEqual({});
  });

  it('updates individual peer statuses and custom status text', () => {
    usePresenceStore.setState({
      userStatuses: {
        'usr-alice': {
          status: 'ONLINE',
          customStatus: 'In a meeting',
          customStatusExpiresAt: '2026-10-26T12:00:00Z',
        },
        'usr-bob': {
          status: 'DND',
          customStatus: 'Focus mode',
        },
      },
    });

    const statuses = usePresenceStore.getState().userStatuses;
    expect(statuses['usr-alice'].status).toBe('ONLINE');
    expect(statuses['usr-alice'].customStatus).toBe('In a meeting');
    expect(statuses['usr-bob'].status).toBe('DND');
  });
});
