import { create } from 'zustand';
import { UserStatus, REALTIME_EVENTS } from '@mivo/shared';
import { realtime } from '@/lib/socket-client';

interface PresenceState {
  userStatuses: Record<string, { status: UserStatus; customStatus?: string | null }>;
  initPresenceListeners: () => void;
  sendHeartbeat: (status: UserStatus, customStatus?: string | null) => void;
}

export const usePresenceStore = create<PresenceState>((set) => ({
  userStatuses: {},

  initPresenceListeners: () => {
    const socket = realtime.getSocket();
    if (!socket) return;

    socket.off(REALTIME_EVENTS.PRESENCE_USER_UPDATED);
    socket.on(REALTIME_EVENTS.PRESENCE_USER_UPDATED, (data: { userId: string; status: UserStatus; customStatus?: string | null }) => {
      set((state) => ({
        userStatuses: {
          ...state.userStatuses,
          [data.userId]: { status: data.status, customStatus: data.customStatus },
        },
      }));
    });
  },

  sendHeartbeat: (status: UserStatus, customStatus?: string | null) => {
    const socket = realtime.getSocket();
    if (socket) {
      socket.emit(REALTIME_EVENTS.PRESENCE_HEARTBEAT, { status, customStatus });
    }
  },
}));
