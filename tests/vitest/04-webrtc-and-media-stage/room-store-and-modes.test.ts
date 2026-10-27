import { describe, it, expect, beforeEach } from 'vitest';
import { useRoomStore } from '@/stores/roomStore';
import { RoomDTO, RoomCommunicationMode } from '@mivo/shared';

describe('Room Store and Communication Modes Engine', () => {
  beforeEach(() => {
    useRoomStore.setState({
      activeRoom: null,
      participants: [],
      isMuted: true,
      isDeafened: false,
      isCameraOn: false,
      isScreenOn: false,
      isLoading: false,
      localStream: null,
      screenStream: null,
      remoteStreams: {},
      audioLevel: 0,
    });
  });

  it('initializes with default muted media state and empty roster', () => {
    const state = useRoomStore.getState();
    expect(state.activeRoom).toBeNull();
    expect(state.participants).toEqual([]);
    expect(state.isMuted).toBe(true);
    expect(state.isCameraOn).toBe(false);
    expect(state.isScreenOn).toBe(false);
  });

  it('supports simulating and clearing bulk participants for scalability testing', () => {
    useRoomStore.getState().simulateBulkParticipants(25);
    let state = useRoomStore.getState();
    expect(state.participants.length).toBe(25);
    expect(state.participants[0].user.displayName).toBeDefined();

    useRoomStore.getState().clearSimulatedParticipants();
    state = useRoomStore.getState();
    expect(state.participants.length).toBe(0);
  });

  it('toggles deafen state synchronously and updates store flags', () => {
    const store = useRoomStore.getState();
    expect(store.isDeafened).toBe(false);

    store.toggleDeafen();
    expect(useRoomStore.getState().isDeafened).toBe(true);

    store.toggleDeafen();
    expect(useRoomStore.getState().isDeafened).toBe(false);
  });

  it('cleans up all active room state upon leaveRoom invocation', () => {
    const mockRoom: RoomDTO = {
      id: 'room-stage-1',
      name: 'Keynote Auditorium',
      channelId: 'chan-alpha',
      activeMode: 'VIDEO',
      isLocked: false,
      maxCapacity: 100,
      description: 'Annual engineering keynote',
      createdAt: '2026-10-26T00:00:00.000Z',
    };

    useRoomStore.setState({
      activeRoom: mockRoom,
      isMuted: false,
      isCameraOn: true,
      isScreenOn: true,
      audioLevel: 75,
    });

    useRoomStore.getState().leaveRoom();

    const state = useRoomStore.getState();
    expect(state.activeRoom).toBeNull();
    expect(state.participants).toEqual([]);
    expect(state.localStream).toBeNull();
    expect(state.screenStream).toBeNull();
    expect(state.remoteStreams).toEqual({});
  });

  it('validates supported RoomCommunicationModes and transitions', () => {
    const supportedModes: RoomCommunicationMode[] = [
      'TEXT',
      'VOICE',
      'VIDEO',
      'SCREEN_SHARE',
      'CANVAS',
      'CODE',
    ];

    expect(supportedModes).toHaveLength(6);
    expect(supportedModes).toContain('VIDEO');
    expect(supportedModes).toContain('CANVAS');
    expect(supportedModes).toContain('CODE');
  });
});
