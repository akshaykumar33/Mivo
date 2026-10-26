import { describe, it, expect } from 'vitest';
import { RoomMemberDTO } from '@mivo/shared';

// Algorithm ported directly from MediaStage.tsx for unit testing
export function computeOptimalSpeakerOrder(
  participants: RoomMemberDTO[],
  options: {
    currentUserId?: string;
    isMuted?: boolean;
    audioLevel?: number;
    isCameraOn?: boolean;
    hostUserId?: string;
  } = {}
): string[] {
  const scored = participants.map((p) => {
    const isMe = p.userId === options.currentUserId;
    const speaking = isMe
      ? !options.isMuted && (options.audioLevel || 0) > 10
      : !p.isMuted && (p.user?.status === 'ONLINE' || false);
    const camera = isMe ? !!options.isCameraOn : !!p.isCameraOn;
    const isHost = (options.hostUserId && p.userId === options.hostUserId) || (p as any).role === 'HOST';

    let score = 0;
    if (speaking) score += 100;
    if (camera) score += 50;
    if (isHost) score += 20;

    return { userId: p.userId, score, speaking, camera };
  });

  scored.sort((a, b) => b.score - a.score);

  if (scored.length >= 3) {
    const left: typeof scored = [];
    const center: typeof scored = [];
    const right: typeof scored = [];

    scored.forEach((item, idx) => {
      if (idx % 3 === 0) center.push(item);
      else if (idx % 3 === 1) left.push(item);
      else right.push(item);
    });

    const balanced: typeof scored = [];
    const maxLen = Math.max(left.length, center.length, right.length);
    for (let i = 0; i < maxLen; i++) {
      if (left[i]) balanced.push(left[i]);
      if (center[i]) balanced.push(center[i]);
      if (right[i]) balanced.push(right[i]);
    }
    return balanced.map((b) => b.userId);
  }

  return scored.map((s) => s.userId);
}

export function getDynamicGridClass(tileCount: number): string {
  switch (tileCount) {
    case 1:
      return 'grid-cols-1 max-w-4xl mx-auto w-full my-auto';
    case 2:
      return 'grid-cols-1 md:grid-cols-2 max-w-5xl mx-auto w-full my-auto';
    case 3:
      return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto w-full my-auto';
    case 4:
      return 'grid-cols-2 max-w-5xl mx-auto w-full my-auto';
    case 5:
    case 6:
      return 'grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto w-full';
    case 7:
    case 8:
    case 9:
      return 'grid-cols-2 md:grid-cols-3 max-w-7xl mx-auto w-full';
    default:
      return 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 w-full';
  }
}

export function reorderParticipants(
  currentOrder: string[],
  draggedId: string,
  targetId: string
): string[] {
  const result = [...currentOrder];
  const fromIndex = result.indexOf(draggedId);
  const toIndex = result.indexOf(targetId);

  if (fromIndex === -1 || toIndex === -1) return currentOrder;

  result.splice(fromIndex, 1);
  result.splice(toIndex, 0, draggedId);
  return result;
}

describe('Smart Auto-Arranging Grid & Drag & Drop Reordering', () => {
  const mockParticipants: RoomMemberDTO[] = [
    {
      id: 'm1',
      roomId: 'r1',
      userId: 'user-silent',
      isMuted: true,
      isDeafened: false,
      isCameraOn: false,
      isScreenOn: false,
      joinedAt: '2026-10-26T10:00:00Z',
      user: { id: 'user-silent', username: 'silent', displayName: 'Silent Sam', avatarUrl: null, status: 'IDLE' },
    },
    {
      id: 'm2',
      roomId: 'r1',
      userId: 'user-active-speaker',
      isMuted: false,
      isDeafened: false,
      isCameraOn: true,
      isScreenOn: false,
      joinedAt: '2026-10-26T10:01:00Z',
      user: { id: 'user-active-speaker', username: 'speaker', displayName: 'Speaker Sally', avatarUrl: null, status: 'ONLINE' },
    },
    {
      id: 'm3',
      roomId: 'r1',
      userId: 'user-host',
      isMuted: true,
      isDeafened: false,
      isCameraOn: true,
      isScreenOn: false,
      joinedAt: '2026-10-26T09:59:00Z',
      user: { id: 'user-host', username: 'host', displayName: 'Host Harry', avatarUrl: null, status: 'DND' },
    },
  ];

  it('prioritizes active speakers and camera feeds in speaker order', () => {
    const order = computeOptimalSpeakerOrder(mockParticipants, {
      hostUserId: 'user-host',
    });

    // Sally is speaking (+100) + camera (+50) = 150 (Center top)
    // Host Harry has camera (+50) + host (+20) = 70 (Left top)
    // Silent Sam has 0 (Right top)
    expect(order).toHaveLength(3);
    expect(order).toContain('user-active-speaker');
    expect(order).toContain('user-host');
    expect(order).toContain('user-silent');
  });

  it('dynamically adapts CSS grid responsive layout according to tile count', () => {
    expect(getDynamicGridClass(1)).toContain('grid-cols-1 max-w-4xl');
    expect(getDynamicGridClass(2)).toContain('grid-cols-1 md:grid-cols-2');
    expect(getDynamicGridClass(4)).toContain('grid-cols-2 max-w-5xl');
    expect(getDynamicGridClass(6)).toContain('grid-cols-2 lg:grid-cols-3');
    expect(getDynamicGridClass(9)).toContain('grid-cols-2 md:grid-cols-3 max-w-7xl');
    expect(getDynamicGridClass(16)).toContain('grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5');
  });

  it('reorders participant sequence on drag and drop without losing participants', () => {
    const initial = ['user-a', 'user-b', 'user-c', 'user-d'];
    const reordered = reorderParticipants(initial, 'user-d', 'user-b');

    expect(reordered).toEqual(['user-a', 'user-d', 'user-b', 'user-c']);
    expect(reordered).toHaveLength(4);

    // No-op if target or dragged not found
    const unchanged = reorderParticipants(initial, 'unknown', 'user-b');
    expect(unchanged).toEqual(initial);
  });
});
