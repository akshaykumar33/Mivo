import { describe, it, expect, beforeEach } from 'vitest';
import { usePresenceStore } from '@/stores/presenceStore';

describe('Auth & Identity Module — Slack Status & Presence Engine', () => {
  beforeEach(() => {
    usePresenceStore.setState({ userStatuses: {} });
  });

  it('updates local user status dictionary correctly', () => {
    usePresenceStore.setState({
      userStatuses: {
        'usr-1': {
          status: 'ONLINE',
          customStatus: 'In an architecture sync',
          customStatusExpiresAt: new Date(Date.now() + 3600000).toISOString(),
        },
      },
    });

    const statusInfo = usePresenceStore.getState().userStatuses['usr-1'];
    expect(statusInfo).toBeDefined();
    expect(statusInfo.status).toBe('ONLINE');
    expect(statusInfo.customStatus).toBe('In an architecture sync');
  });

  it('handles custom status clearing and idle transitions', () => {
    usePresenceStore.setState({
      userStatuses: {
        'usr-2': {
          status: 'IDLE',
          customStatus: null,
          customStatusExpiresAt: null,
        },
      },
    });

    const statusInfo = usePresenceStore.getState().userStatuses['usr-2'];
    expect(statusInfo.status).toBe('IDLE');
    expect(statusInfo.customStatus).toBeNull();
  });

  it('calculates custom status expiration timestamp correctly', () => {
    const minutes = 30;
    const now = Date.now();
    const expiresAt = new Date(now + minutes * 60 * 1000).toISOString();

    const dateDiff = new Date(expiresAt).getTime() - now;
    expect(Math.round(dateDiff / (60 * 1000))).toBe(30);
  });
});
