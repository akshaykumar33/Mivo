import { create } from 'zustand';
import {
  ConversationDTO,
  DirectMessageDTO,
  UserSummaryDTO,
  REALTIME_EVENTS,
  CallIncomingBroadcast,
} from '@mivo/shared';
import { api } from '@/lib/api-client';
import { realtime } from '@/lib/socket-client';
import { webrtcMesh } from '@/lib/webrtc-mesh';
import { getEnhancedAudioStream } from '@/lib/media-manager';

export interface ActiveCallState {
  conversationId: string;
  isGroup: boolean;
  groupName?: string | null;
  callerId: string;
  callerName: string;
  status: 'dialing' | 'connected';
}

export interface IncomingCallState {
  conversationId: string;
  callerId: string;
  callerName: string;
  callerAvatar?: string | null;
  isGroup: boolean;
  groupName?: string | null;
}

interface ConversationState {
  conversations: ConversationDTO[];
  activeConversationId: string | null;
  messages: Record<string, DirectMessageDTO[]>;
  typingUsers: Record<string, string[]>; // conversationId -> list of usernames
  unreadCounts: Record<string, number>;
  isLoading: boolean;

  // Audio Call States
  activeCall: ActiveCallState | null;
  incomingCall: IncomingCallState | null;
  isCallMuted: boolean;
  isCallDeafened: boolean;
  callParticipants: string[]; // userIds
  localAudioStream: MediaStream | null;
  remoteAudioStreams: Record<string, MediaStream>;

  // Core Actions
  loadConversations: () => Promise<void>;
  selectConversation: (conversationId: string) => Promise<void>;
  startDirectConversation: (recipientId: string) => Promise<ConversationDTO>;
  createGroupConversation: (name: string, memberIds: string[], iconUrl?: string) => Promise<ConversationDTO>;
  sendMessage: (conversationId: string, content: string, attachments?: any[]) => Promise<void>;
  sendTyping: (conversationId: string) => void;
  sendStopTyping: (conversationId: string) => void;
  addReaction: (conversationId: string, messageId: string, emoji: string) => void;

  // Audio Call Actions
  initiateCall: (conversation: ConversationDTO, currentUserId: string) => Promise<void>;
  acceptCall: (currentUserId: string) => Promise<void>;
  declineCall: () => void;
  endCall: () => void;
  toggleCallMute: () => void;
  toggleCallDeafen: () => void;

  setupRealtimeListeners: (currentUserId: string) => void;
}

export const useConversationStore = create<ConversationState>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  messages: {},
  typingUsers: {},
  unreadCounts: {},
  isLoading: false,

  activeCall: null,
  incomingCall: null,
  isCallMuted: false,
  isCallDeafened: false,
  callParticipants: [],
  localAudioStream: null,
  remoteAudioStreams: {},

  loadConversations: async () => {
    set({ isLoading: true });
    try {
      const res = await api.get<ConversationDTO[]>('/api/v1/conversations');
      if (res.success && res.data) {
        set({ conversations: res.data });
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      set({ isLoading: false });
    }
  },

  selectConversation: async (conversationId: string) => {
    const prev = get().activeConversationId;
    const socket = realtime.getSocket();

    if (prev && socket) {
      socket.emit(REALTIME_EVENTS.DM_LEAVE, { conversationId: prev });
    }

    set({
      activeConversationId: conversationId,
      unreadCounts: { ...get().unreadCounts, [conversationId]: 0 },
    });

    if (socket) {
      socket.emit(REALTIME_EVENTS.DM_JOIN, { conversationId });
    }

    // Load message history
    try {
      const res = await api.get<DirectMessageDTO[]>(`/api/v1/conversations/${conversationId}/messages`);
      if (res.success && res.data) {
        const loadedMessages = res.data;
        set((state) => ({
          messages: {
            ...state.messages,
            [conversationId]: loadedMessages,
          },
        }));
      }
    } catch (err) {
      console.error('Failed to load messages for conversation:', err);
    }
  },

  startDirectConversation: async (recipientId: string) => {
    const res = await api.post<ConversationDTO>('/api/v1/conversations/direct', { recipientId });
    if (res.success && res.data) {
      const conv = res.data;
      set((state) => {
        const exists = state.conversations.some((c) => c.id === conv.id);
        return {
          conversations: exists ? state.conversations : [conv, ...state.conversations],
        };
      });
      await get().selectConversation(conv.id);
      return conv;
    }
    throw new Error(res.error?.message || 'Failed to start direct conversation');
  },

  createGroupConversation: async (name: string, memberIds: string[], iconUrl?: string) => {
    const res = await api.post<ConversationDTO>('/api/v1/conversations/group', {
      name,
      memberIds,
      iconUrl,
    });
    if (res.success && res.data) {
      const conv = res.data;
      set((state) => ({
        conversations: [conv, ...state.conversations],
      }));
      await get().selectConversation(conv.id);
      return conv;
    }
    throw new Error(res.error?.message || 'Failed to create group conversation');
  },

  sendMessage: async (conversationId: string, content: string, attachments?: any[]) => {
    const socket = realtime.getSocket();
    if (socket && socket.connected) {
      socket.emit(REALTIME_EVENTS.DM_SEND_MESSAGE, {
        conversationId,
        content,
        attachments,
      });
    } else {
      // Fallback to REST API
      const res = await api.post<DirectMessageDTO>(`/api/v1/conversations/${conversationId}/messages`, {
        content,
        attachments,
      });
      if (res.success && res.data) {
        const msg = res.data;
        set((state) => {
          const list = state.messages[conversationId] || [];
          return {
            messages: {
              ...state.messages,
              [conversationId]: [...list, msg],
            },
          };
        });
      }
    }
  },

  sendTyping: (conversationId: string) => {
    const socket = realtime.getSocket();
    if (socket) {
      socket.emit(REALTIME_EVENTS.DM_TYPING, { conversationId });
    }
  },

  sendStopTyping: (conversationId: string) => {
    const socket = realtime.getSocket();
    if (socket) {
      socket.emit(REALTIME_EVENTS.DM_STOP_TYPING, { conversationId });
    }
  },

  addReaction: (conversationId: string, messageId: string, emoji: string) => {
    const socket = realtime.getSocket();
    if (socket) {
      socket.emit(REALTIME_EVENTS.DM_REACTION_ADD, {
        conversationId,
        messageId,
        emoji,
      });
    }
  },

  // -------------------------------------------------------------
  // Audio Calling Controls
  // -------------------------------------------------------------

  initiateCall: async (conversation: ConversationDTO, currentUserId: string) => {
    try {
      // 1. Acquire studio HD microphone
      let stream: MediaStream | null = null;
      try {
        stream = await getEnhancedAudioStream();
      } catch (e) {
        console.warn('Microphone permission not granted or unavailable:', e);
      }

      set({
        activeCall: {
          conversationId: conversation.id,
          isGroup: conversation.type === 'GROUP',
          groupName: conversation.name,
          callerId: currentUserId,
          callerName: 'You',
          status: 'dialing',
        },
        callParticipants: [currentUserId],
        localAudioStream: stream,
        isCallMuted: false,
        isCallDeafened: false,
      });

      // 2. Initialize WebRTC mesh for this call
      webrtcMesh.init(
        `call:${conversation.id}`,
        currentUserId,
        (peerId, remoteStream) => {
          set((state) => ({
            remoteAudioStreams: { ...state.remoteAudioStreams, [peerId]: remoteStream },
          }));
        },
        (peerId) => {
          set((state) => {
            const next = { ...state.remoteAudioStreams };
            delete next[peerId];
            return {
              remoteAudioStreams: next,
              callParticipants: state.callParticipants.filter((id) => id !== peerId),
            };
          });
        }
      );

      if (stream) {
        webrtcMesh.setLocalStream(stream);
      }

      // 3. Emit CALL_INVITE signaling to server
      const socket = realtime.getSocket();
      if (socket) {
        socket.emit(REALTIME_EVENTS.CALL_INVITE, {
          conversationId: conversation.id,
        });
      }
    } catch (err) {
      console.error('Failed to initiate call:', err);
    }
  },

  acceptCall: async (currentUserId: string) => {
    const incoming = get().incomingCall;
    if (!incoming) return;

    try {
      // 1. Acquire studio HD microphone
      let stream: MediaStream | null = null;
      try {
        stream = await getEnhancedAudioStream();
      } catch (e) {
        console.warn('Microphone permission not granted or unavailable:', e);
      }

      set({
        activeCall: {
          conversationId: incoming.conversationId,
          isGroup: incoming.isGroup,
          groupName: incoming.groupName,
          callerId: incoming.callerId,
          callerName: incoming.callerName,
          status: 'connected',
        },
        incomingCall: null,
        callParticipants: [currentUserId, incoming.callerId],
        localAudioStream: stream,
        isCallMuted: false,
        isCallDeafened: false,
      });

      // 2. Initialize WebRTC mesh
      webrtcMesh.init(
        `call:${incoming.conversationId}`,
        currentUserId,
        (peerId, remoteStream) => {
          set((state) => ({
            remoteAudioStreams: { ...state.remoteAudioStreams, [peerId]: remoteStream },
          }));
        },
        (peerId) => {
          set((state) => {
            const next = { ...state.remoteAudioStreams };
            delete next[peerId];
            return {
              remoteAudioStreams: next,
              callParticipants: state.callParticipants.filter((id) => id !== peerId),
            };
          });
        }
      );

      if (stream) {
        webrtcMesh.setLocalStream(stream);
      }

      // 3. Emit CALL_ACCEPT and connect peer
      const socket = realtime.getSocket();
      if (socket) {
        socket.emit(REALTIME_EVENTS.CALL_ACCEPT, {
          conversationId: incoming.conversationId,
        });
      }

      // Connect to caller
      webrtcMesh.connectToPeer(incoming.callerId);
    } catch (err) {
      console.error('Failed to accept call:', err);
    }
  },

  declineCall: () => {
    const incoming = get().incomingCall;
    if (!incoming) return;

    const socket = realtime.getSocket();
    if (socket) {
      socket.emit(REALTIME_EVENTS.CALL_DECLINE, {
        conversationId: incoming.conversationId,
      });
    }

    set({ incomingCall: null });
  },

  endCall: () => {
    const active = get().activeCall;
    if (active) {
      const socket = realtime.getSocket();
      if (socket) {
        socket.emit(REALTIME_EVENTS.CALL_END, {
          conversationId: active.conversationId,
        });
      }
    }

    // Clean up local tracks
    const stream = get().localAudioStream;
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
    }

    webrtcMesh.cleanup();

    set({
      activeCall: null,
      incomingCall: null,
      localAudioStream: null,
      remoteAudioStreams: {},
      callParticipants: [],
    });
  },

  toggleCallMute: () => {
    const isMuted = !get().isCallMuted;
    const stream = get().localAudioStream;
    if (stream) {
      stream.getAudioTracks().forEach((track) => {
        track.enabled = !isMuted;
      });
    }
    set({ isCallMuted: isMuted });
  },

  toggleCallDeafen: () => {
    const isDeafened = !get().isCallDeafened;
    // Deafen: mute all remote audio elements
    const remoteStreams = get().remoteAudioStreams;
    Object.keys(remoteStreams).forEach((peerId) => {
      const audioElem = document.getElementById(`remote-audio-${peerId}`) as HTMLAudioElement;
      if (audioElem) {
        audioElem.muted = isDeafened;
      }
    });
    set({ isCallDeafened: isDeafened });
  },

  setupRealtimeListeners: (currentUserId: string) => {
    const socket = realtime.getSocket();
    if (!socket) return;

    // Remove any previous handlers to avoid duplicate event handling
    socket.off(REALTIME_EVENTS.DM_NEW_MESSAGE);
    socket.off(REALTIME_EVENTS.DM_TYPING);
    socket.off(REALTIME_EVENTS.DM_STOP_TYPING);
    socket.off(REALTIME_EVENTS.CALL_INCOMING);
    socket.off(REALTIME_EVENTS.CALL_ACCEPTED);
    socket.off(REALTIME_EVENTS.CALL_DECLINED);
    socket.off(REALTIME_EVENTS.CALL_ENDED);
    socket.off(REALTIME_EVENTS.CALL_PARTICIPANT_JOINED);
    socket.off(REALTIME_EVENTS.CALL_PARTICIPANT_LEFT);
    socket.off('conversation:created');

    // 1. New DM Message
    socket.on(REALTIME_EVENTS.DM_NEW_MESSAGE, (msg: DirectMessageDTO) => {
      set((state) => {
        const conversationId = msg.conversationId;
        const list = state.messages[conversationId] || [];
        const alreadyExists = list.some((m) => m.id === msg.id);
        const updatedList = alreadyExists ? list : [...list, msg];

        // Increment unread count if message is for another inactive conversation
        const isActive = state.activeConversationId === conversationId;
        const unreadCounts = { ...state.unreadCounts };
        if (!isActive && msg.senderId !== currentUserId) {
          unreadCounts[conversationId] = (unreadCounts[conversationId] || 0) + 1;
        }

        // Update last message in conversations list
        const updatedConversations = state.conversations.map((c) => {
          if (c.id === conversationId) {
            return {
              ...c,
              lastMessage: msg,
              updatedAt: msg.createdAt,
            };
          }
          return c;
        });

        return {
          messages: {
            ...state.messages,
            [conversationId]: updatedList,
          },
          conversations: updatedConversations,
          unreadCounts,
        };
      });
    });

    // 2. Typing Indicators
    socket.on(REALTIME_EVENTS.DM_TYPING, (data: { conversationId: string; userId: string; username: string }) => {
      if (data.userId === currentUserId) return;
      set((state) => {
        const current = state.typingUsers[data.conversationId] || [];
        if (!current.includes(data.username)) {
          return {
            typingUsers: {
              ...state.typingUsers,
              [data.conversationId]: [...current, data.username],
            },
          };
        }
        return state;
      });
    });

    socket.on(REALTIME_EVENTS.DM_STOP_TYPING, (data: { conversationId: string; userId: string; username?: string }) => {
      set((state) => {
        const current = state.typingUsers[data.conversationId] || [];
        return {
          typingUsers: {
            ...state.typingUsers,
            [data.conversationId]: current.filter((u) => u !== data.username && u !== data.userId),
          },
        };
      });
    });

    // 3. Incoming Call Signaling
    socket.on(REALTIME_EVENTS.CALL_INCOMING, (payload: CallIncomingBroadcast) => {
      if (payload.callerId === currentUserId) return;
      // Trigger incoming call modal / ring
      set({
        incomingCall: payload,
      });
    });

    // 4. Call Accepted
    socket.on(REALTIME_EVENTS.CALL_ACCEPTED, (data: { conversationId: string; userId: string }) => {
      set((state) => {
        if (state.activeCall && state.activeCall.conversationId === data.conversationId) {
          return {
            activeCall: { ...state.activeCall, status: 'connected' },
            callParticipants: Array.from(new Set([...state.callParticipants, data.userId])),
          };
        }
        return state;
      });
      // Connect peer in WebRTC mesh
      webrtcMesh.connectToPeer(data.userId);
    });

    // 5. Call Declined
    socket.on(REALTIME_EVENTS.CALL_DECLINED, (data: { conversationId: string; userId: string }) => {
      set((state) => {
        if (state.activeCall && state.activeCall.conversationId === data.conversationId) {
          // If 1-on-1 call, end the call
          if (!state.activeCall.isGroup) {
            get().endCall();
          }
        }
        return state;
      });
    });

    // 6. Call Ended
    socket.on(REALTIME_EVENTS.CALL_ENDED, (data: { conversationId: string }) => {
      if (get().activeCall?.conversationId === data.conversationId) {
        get().endCall();
      }
      if (get().incomingCall?.conversationId === data.conversationId) {
        set({ incomingCall: null });
      }
    });

    // 7. Participant Joined/Left Call
    socket.on(REALTIME_EVENTS.CALL_PARTICIPANT_JOINED, (data: { conversationId: string; userId: string }) => {
      if (data.userId !== currentUserId) {
        set((state) => ({
          callParticipants: Array.from(new Set([...state.callParticipants, data.userId])),
        }));
        webrtcMesh.connectToPeer(data.userId);
      }
    });

    socket.on(REALTIME_EVENTS.CALL_PARTICIPANT_LEFT, (data: { conversationId: string; userId: string }) => {
      webrtcMesh.disconnectPeer(data.userId);
      set((state) => ({
        callParticipants: state.callParticipants.filter((id) => id !== data.userId),
      }));
    });

    // 8. New Conversation Created (e.g., added to group or direct message)
    socket.on('conversation:created', (conv: ConversationDTO) => {
      set((state) => {
        const exists = state.conversations.some((c) => c.id === conv.id);
        if (exists) return state;
        return {
          conversations: [conv, ...state.conversations],
        };
      });
    });
  },
}));
