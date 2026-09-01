import { create } from 'zustand';
import {
  RoomDTO,
  RoomMemberDTO,
  RoomCommunicationMode,
  REALTIME_EVENTS,
  RoomJoinedResponse,
  RoomParticipantJoinedBroadcast,
  RoomParticipantLeftBroadcast,
  RoomModeChangedBroadcast,
  RoomParticipantStateUpdatedBroadcast,
} from '@mivo/shared';
import { api } from '@/lib/api-client';
import { realtime } from '@/lib/socket-client';
import { mediaManager } from '@/lib/media-manager';
import { webrtcMesh } from '@/lib/webrtc-mesh';

interface RoomState {
  activeRoom: RoomDTO | null;
  participants: RoomMemberDTO[];
  isMuted: boolean;
  isDeafened: boolean;
  isCameraOn: boolean;
  isScreenOn: boolean;
  isLoading: boolean;
  localStream: MediaStream | null;
  screenStream: MediaStream | null;
  remoteStreams: Record<string, MediaStream>;
  audioLevel: number;
  joinRoom: (roomId: string, currentUserId?: string) => Promise<void>;
  leaveRoom: () => void;
  switchMode: (mode: RoomCommunicationMode) => Promise<void>;
  toggleMute: () => Promise<void>;
  toggleDeafen: () => void;
  toggleCamera: () => Promise<void>;
  toggleScreenShare: () => Promise<void>;
}

export const useRoomStore = create<RoomState>((set, get) => ({
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

  joinRoom: async (roomId: string, currentUserId?: string) => {
    set({ isLoading: true });
    try {
      const res = await api.get<RoomDTO>(`/api/v1/rooms/${roomId}`);
      if (res.success && res.data) {
        set({
          activeRoom: res.data,
          participants: res.data.activeMembers || [],
          isLoading: false,
        });
      } else {
        // Dynamic fallback so user is never stuck on infinite Connecting spinner
        const fallbackRoom: RoomDTO = {
          id: roomId,
          name: 'Lobby',
          channelId: 'default',
          activeMode: 'TEXT',
          isLocked: false,
          maxCapacity: 50,
          description: null,
          createdAt: new Date().toISOString(),
          activeMembers: [],
        };
        set({
          activeRoom: fallbackRoom,
          participants: [],
          isLoading: false,
        });
      }
    } catch {
      const fallbackRoom: RoomDTO = {
        id: roomId,
        name: 'Stage',
        channelId: 'default',
        activeMode: 'TEXT',
        isLocked: false,
        maxCapacity: 50,
        description: null,
        createdAt: new Date().toISOString(),
        activeMembers: [],
      };
      set({
        activeRoom: fallbackRoom,
        participants: [],
        isLoading: false,
      });
    }

      // Initialize WebRTC Mesh
      if (currentUserId) {
        webrtcMesh.init(
          roomId,
          currentUserId,
          (peerId, stream) => {
            set((state) => ({
              remoteStreams: { ...state.remoteStreams, [peerId]: stream },
            }));
          },
          (peerId) => {
            set((state) => {
              const updated = { ...state.remoteStreams };
              delete updated[peerId];
              return { remoteStreams: updated };
            });
          }
        );
      }

      const socket = realtime.getSocket();
      if (socket) {
        socket.emit(REALTIME_EVENTS.ROOM_JOIN, { roomId });

        socket.off(REALTIME_EVENTS.ROOM_JOINED);
        socket.on(REALTIME_EVENTS.ROOM_JOINED, (data: RoomJoinedResponse) => {
          if (data.roomId === roomId) {
            set((state) => ({
              participants: data.members,
              activeRoom: state.activeRoom ? { ...state.activeRoom, activeMode: data.activeMode } : null,
            }));

            // Connect to peers in room
            data.members.forEach((m) => {
              if (currentUserId && m.userId !== currentUserId) {
                webrtcMesh.connectToPeer(m.userId);
              }
            });
          }
        });

        socket.off(REALTIME_EVENTS.ROOM_PARTICIPANT_JOINED);
        socket.on(REALTIME_EVENTS.ROOM_PARTICIPANT_JOINED, (data: RoomParticipantJoinedBroadcast) => {
          if (data.roomId === roomId) {
            set((state) => ({
              participants: [...state.participants.filter((p) => p.userId !== data.participant.userId), data.participant],
            }));

            if (currentUserId && data.participant.userId !== currentUserId) {
              webrtcMesh.connectToPeer(data.participant.userId);
            }
          }
        });

        socket.off(REALTIME_EVENTS.ROOM_PARTICIPANT_LEFT);
        socket.on(REALTIME_EVENTS.ROOM_PARTICIPANT_LEFT, (data: RoomParticipantLeftBroadcast) => {
          if (data.roomId === roomId) {
            set((state) => ({
              participants: state.participants.filter((p) => p.userId !== data.userId),
            }));
            webrtcMesh.disconnectPeer(data.userId);
          }
        });

        socket.off(REALTIME_EVENTS.ROOM_MODE_CHANGED);
        socket.on(REALTIME_EVENTS.ROOM_MODE_CHANGED, (data: RoomModeChangedBroadcast) => {
          if (data.roomId === roomId) {
            set((state) => ({
              activeRoom: state.activeRoom ? { ...state.activeRoom, activeMode: data.activeMode } : null,
            }));
          }
        });

        socket.off(REALTIME_EVENTS.ROOM_PARTICIPANT_STATE_UPDATED);
        socket.on(REALTIME_EVENTS.ROOM_PARTICIPANT_STATE_UPDATED, (data: RoomParticipantStateUpdatedBroadcast) => {
          if (data.roomId === roomId) {
            set((state) => ({
              participants: state.participants.map((p) =>
                p.userId === data.userId
                  ? {
                      ...p,
                      isMuted: data.isMuted,
                      isDeafened: data.isDeafened,
                      isCameraOn: data.isCameraOn,
                      isScreenOn: data.isScreenOn,
                    }
                  : p
              ),
            }));
          }
        });
      }
  },

  leaveRoom: () => {
    const { activeRoom } = get();
    if (activeRoom) {
      const socket = realtime.getSocket();
      if (socket) {
        socket.emit(REALTIME_EVENTS.ROOM_LEAVE, { roomId: activeRoom.id });
      }
    }

    mediaManager.stopMicrophone();
    mediaManager.stopCamera();
    mediaManager.stopScreenShare();
    webrtcMesh.cleanup();

    set({
      activeRoom: null,
      participants: [],
      isMuted: true,
      isDeafened: false,
      isCameraOn: false,
      isScreenOn: false,
      localStream: null,
      screenStream: null,
      remoteStreams: {},
      audioLevel: 0,
    });
  },

  switchMode: async (mode: RoomCommunicationMode) => {
    const { activeRoom } = get();
    if (!activeRoom) return;

    const res = await api.patch<RoomDTO>(`/api/v1/rooms/${activeRoom.id}/mode`, {
      activeMode: mode,
    });

    if (res.success) {
      const socket = realtime.getSocket();
      if (socket) {
        socket.emit(REALTIME_EVENTS.ROOM_CHANGE_MODE, {
          roomId: activeRoom.id,
          activeMode: mode,
        });
      }
      set((state) => ({
        activeRoom: state.activeRoom ? { ...state.activeRoom, activeMode: mode } : null,
      }));
    }
  },

  toggleMute: async () => {
    const { isMuted, activeRoom } = get();
    const willBeUnmuted = isMuted;
    const nextMutedState = !isMuted;

    if (willBeUnmuted) {
      const stream = await mediaManager.startMicrophone((level) => {
        set({ audioLevel: level });
      });
      webrtcMesh.setLocalStream(stream);
    } else {
      mediaManager.stopMicrophone();
      set({ audioLevel: 0 });
    }

    set({ isMuted: nextMutedState });

    if (activeRoom) {
      const socket = realtime.getSocket();
      if (socket) {
        socket.emit(REALTIME_EVENTS.ROOM_UPDATE_MEDIA_STATE, {
          roomId: activeRoom.id,
          isMuted: nextMutedState,
        });
      }
    }
  },

  toggleDeafen: () => {
    const { isDeafened, activeRoom } = get();
    const nextState = !isDeafened;
    set({ isDeafened: nextState });

    if (activeRoom) {
      const socket = realtime.getSocket();
      if (socket) {
        socket.emit(REALTIME_EVENTS.ROOM_UPDATE_MEDIA_STATE, {
          roomId: activeRoom.id,
          isDeafened: nextState,
        });
      }
    }
  },

  toggleCamera: async () => {
    const { isCameraOn, activeRoom } = get();
    const willBeCameraOn = !isCameraOn;

    if (willBeCameraOn) {
      const stream = await mediaManager.startCamera();
      set({ isCameraOn: true, localStream: stream });
      webrtcMesh.setLocalStream(stream);
    } else {
      mediaManager.stopCamera();
      set({ isCameraOn: false, localStream: null });
      webrtcMesh.setLocalStream(null);
    }

    if (activeRoom) {
      const socket = realtime.getSocket();
      if (socket) {
        socket.emit(REALTIME_EVENTS.ROOM_UPDATE_MEDIA_STATE, {
          roomId: activeRoom.id,
          isCameraOn: willBeCameraOn,
        });
      }
    }
  },

  toggleScreenShare: async () => {
    const { isScreenOn, activeRoom } = get();
    const willBeScreenOn = !isScreenOn;

    if (willBeScreenOn) {
      const stream = await mediaManager.startScreenShare(() => {
        set({ isScreenOn: false, screenStream: null });
        if (activeRoom) {
          const socket = realtime.getSocket();
          if (socket) {
            socket.emit(REALTIME_EVENTS.ROOM_UPDATE_MEDIA_STATE, {
              roomId: activeRoom.id,
              isScreenOn: false,
            });
          }
        }
      });
      set({ isScreenOn: true, screenStream: stream });
      webrtcMesh.setLocalStream(stream);
    } else {
      mediaManager.stopScreenShare();
      set({ isScreenOn: false, screenStream: null });
      webrtcMesh.setLocalStream(get().localStream);
    }

    if (activeRoom) {
      const socket = realtime.getSocket();
      if (socket) {
        socket.emit(REALTIME_EVENTS.ROOM_UPDATE_MEDIA_STATE, {
          roomId: activeRoom.id,
          isScreenOn: willBeScreenOn,
        });
      }
    }
  },
}));
