import { describe, it, expect } from 'vitest';
import { RoomDTO, RoomMemberDTO } from '@mivo/shared';

export interface HostActionRequest {
  roomId: string;
  action: 'MUTE' | 'KICK' | 'TRANSFER_HOST';
  actorUserId: string;
  actorRole: 'OWNER' | 'ADMIN' | 'MEMBER' | 'GUEST';
  targetUserId: string;
}

export function authorizeHostAction(
  room: { id: string; hostId?: string },
  request: HostActionRequest
): { allowed: boolean; reason?: string } {
  const isHost = room.hostId === request.actorUserId || request.actorRole === 'OWNER' || request.actorRole === 'ADMIN';

  if (!isHost) {
    return { allowed: false, reason: 'Only the room host or organization administrator can perform moderation actions' };
  }

  if (request.action === 'KICK' && request.actorUserId === request.targetUserId) {
    return { allowed: false, reason: 'Host cannot kick themselves from their own room' };
  }

  if (request.action === 'TRANSFER_HOST' && request.actorUserId === request.targetUserId) {
    return { allowed: false, reason: 'Target is already the host' };
  }

  return { allowed: true };
}

export function applyHostActionToRoster(
  participants: RoomMemberDTO[],
  action: 'MUTE' | 'KICK',
  targetUserId: string
): RoomMemberDTO[] {
  if (action === 'KICK') {
    return participants.filter((p) => p.userId !== targetUserId);
  }
  if (action === 'MUTE') {
    return participants.map((p) => (p.userId === targetUserId ? { ...p, isMuted: true } : p));
  }
  return participants;
}

describe('Host Moderation and Governance Engine', () => {
  const room = { id: 'room-101', hostId: 'user-host' };
  const mockParticipants: RoomMemberDTO[] = [
    {
      id: 'm1',
      roomId: 'room-101',
      userId: 'user-host',
      isMuted: false,
      isDeafened: false,
      isCameraOn: true,
      isScreenOn: false,
      joinedAt: '2026-10-26T10:00:00Z',
      user: { id: 'user-host', username: 'host', displayName: 'Host User', avatarUrl: null, status: 'ONLINE' },
    },
    {
      id: 'm2',
      roomId: 'room-101',
      userId: 'user-disruptive',
      isMuted: false,
      isDeafened: false,
      isCameraOn: false,
      isScreenOn: false,
      joinedAt: '2026-10-26T10:05:00Z',
      user: { id: 'user-disruptive', username: 'badactor', displayName: 'Bad Actor', avatarUrl: null, status: 'ONLINE' },
    },
  ];

  it('permits authorized room host to mute and kick disruptive participants', () => {
    const authResult = authorizeHostAction(room, {
      roomId: 'room-101',
      action: 'KICK',
      actorUserId: 'user-host',
      actorRole: 'MEMBER',
      targetUserId: 'user-disruptive',
    });

    expect(authResult.allowed).toBe(true);

    const afterKick = applyHostActionToRoster(mockParticipants, 'KICK', 'user-disruptive');
    expect(afterKick).toHaveLength(1);
    expect(afterKick[0].userId).toBe('user-host');
  });

  it('rejects unauthorized moderation attempts from regular participants without host privilege', () => {
    const authResult = authorizeHostAction(room, {
      roomId: 'room-101',
      action: 'MUTE',
      actorUserId: 'user-disruptive',
      actorRole: 'MEMBER',
      targetUserId: 'user-host',
    });

    expect(authResult.allowed).toBe(false);
    expect(authResult.reason).toContain('Only the room host or organization administrator');
  });

  it('prevents hosts from kicking themselves or transferring host privilege to themselves', () => {
    const kickSelf = authorizeHostAction(room, {
      roomId: 'room-101',
      action: 'KICK',
      actorUserId: 'user-host',
      actorRole: 'ADMIN',
      targetUserId: 'user-host',
    });
    expect(kickSelf.allowed).toBe(false);
    expect(kickSelf.reason).toContain('Host cannot kick themselves');

    const transferSelf = authorizeHostAction(room, {
      roomId: 'room-101',
      action: 'TRANSFER_HOST',
      actorUserId: 'user-host',
      actorRole: 'ADMIN',
      targetUserId: 'user-host',
    });
    expect(transferSelf.allowed).toBe(false);
    expect(transferSelf.reason).toContain('Target is already the host');
  });

  it('mutes target participant in roster without ejecting them from the room', () => {
    const afterMute = applyHostActionToRoster(mockParticipants, 'MUTE', 'user-disruptive');
    expect(afterMute).toHaveLength(2);
    const mutedUser = afterMute.find((p) => p.userId === 'user-disruptive');
    expect(mutedUser?.isMuted).toBe(true);
  });
});
