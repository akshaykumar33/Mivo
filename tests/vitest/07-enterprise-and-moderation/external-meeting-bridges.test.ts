import { describe, it, expect } from 'vitest';
import { ExternalMeetingProvider, ExternalMeetingBridgeDTO } from '@mivo/shared';

export function validateExternalMeetingUrl(url: string, provider: ExternalMeetingProvider): boolean {
  if (!url || typeof url !== 'string') return false;

  if (provider === 'GOOGLE_MEET') {
    // Format: https://meet.google.com/abc-defg-hij
    const gmeetRegex = /^https:\/\/meet\.google\.com\/[a-z0-9]{3}-[a-z0-9]{4}-[a-z0-9]{3}(\?.*)?$/i;
    return gmeetRegex.test(url.trim());
  }

  if (provider === 'MICROSOFT_TEAMS') {
    // Format: https://teams.microsoft.com/l/meetup-join/...
    const teamsRegex = /^https:\/\/(?:[a-z0-9-]+\.)?teams\.(?:microsoft|live)\.com\/.+$/i;
    return teamsRegex.test(url.trim());
  }

  return false;
}

export function buildExternalBridgeDTO(
  id: string,
  provider: ExternalMeetingProvider,
  url: string,
  title: string,
  creatorName: string,
  roomId?: string,
  conversationId?: string
): ExternalMeetingBridgeDTO {
  return {
    id,
    provider,
    url,
    title,
    creatorName,
    roomId: roomId || null,
    conversationId: conversationId || null,
    createdAt: new Date().toISOString(),
    isActive: true,
  };
}

describe('External Meeting Bridges (Google Meet & Microsoft Teams)', () => {
  it('validates canonical Google Meet join URLs and flags malformed URLs', () => {
    expect(validateExternalMeetingUrl('https://meet.google.com/abc-defg-hij', 'GOOGLE_MEET')).toBe(true);
    expect(validateExternalMeetingUrl('https://meet.google.com/xyz-uvwx-rst?authuser=1', 'GOOGLE_MEET')).toBe(true);
    expect(validateExternalMeetingUrl('https://google.com/search?q=meet', 'GOOGLE_MEET')).toBe(false);
    expect(validateExternalMeetingUrl('https://meet.zoom.us/j/123456789', 'GOOGLE_MEET')).toBe(false);
  });

  it('validates Microsoft Teams enterprise meetup links', () => {
    const validTeams = 'https://teams.microsoft.com/l/meetup-join/19%3ameeting_OTYxNzE0?context=%7b%22Tid%22%3a%22123%22%7d';
    expect(validateExternalMeetingUrl(validTeams, 'MICROSOFT_TEAMS')).toBe(true);

    const validTeamsLive = 'https://teams.live.com/meet/9382173192';
    expect(validateExternalMeetingUrl(validTeamsLive, 'MICROSOFT_TEAMS')).toBe(true);

    expect(validateExternalMeetingUrl('https://office.com/launch/teams', 'MICROSOFT_TEAMS')).toBe(false);
  });

  it('constructs active ExternalMeetingBridgeDTO with metadata and association pointers', () => {
    const bridge = buildExternalBridgeDTO(
      'bridge-alpha-1',
      'GOOGLE_MEET',
      'https://meet.google.com/abc-defg-hij',
      'Quarterly Board Sync',
      'Elena Rostova',
      'room-war-room'
    );

    expect(bridge.id).toBe('bridge-alpha-1');
    expect(bridge.provider).toBe('GOOGLE_MEET');
    expect(bridge.title).toBe('Quarterly Board Sync');
    expect(bridge.creatorName).toBe('Elena Rostova');
    expect(bridge.roomId).toBe('room-war-room');
    expect(bridge.conversationId).toBeNull();
    expect(bridge.isActive).toBe(true);
  });
});
