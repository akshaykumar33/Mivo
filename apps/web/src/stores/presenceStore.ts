import { create } from 'zustand';
import { UserStatus, REALTIME_EVENTS, UserDTO } from '@mivo/shared';
import { realtime } from '@/lib/socket-client';
import { api } from '@/lib/api-client';
import { useAuthStore } from './authStore';

export interface UserPresenceInfo {
  status: UserStatus;
  customStatus?: string | null;
  customStatusExpiresAt?: string | null;
}

interface PresenceState {
  userStatuses: Record<string, UserPresenceInfo>;
  initPresenceListeners: () => void;
  sendHeartbeat: (status: UserStatus, customStatus?: string | null, customStatusExpiresAt?: string | null) => void;
  updateAvailabilityAndStatus: (
    status: UserStatus,
    customStatus?: string | null,
    customStatusExpiresAt?: string | null
  ) => Promise<boolean>;
}

export const usePresenceStore = create<PresenceState>((set, get) => ({
  userStatuses: {},

  initPresenceListeners: () => {
    const socket = realtime.getSocket();
    if (!socket) return;

    socket.off(REALTIME_EVENTS.PRESENCE_USER_UPDATED);
    socket.on(
      REALTIME_EVENTS.PRESENCE_USER_UPDATED,
      (data: {
        userId: string;
        status: UserStatus;
        customStatus?: string | null;
        customStatusExpiresAt?: string | null;
      }) => {
        set((state) => ({
          userStatuses: {
            ...state.userStatuses,
            [data.userId]: {
              status: data.status,
              customStatus: data.customStatus,
              customStatusExpiresAt: data.customStatusExpiresAt,
            },
          },
        }));

        // If the update is for current user, keep authStore synchronized
        const currentUser = useAuthStore.getState().user;
        if (currentUser && currentUser.id === data.userId) {
          useAuthStore.getState().updateUser({
            status: data.status,
            customStatus: data.customStatus,
            customStatusExpiresAt: data.customStatusExpiresAt,
          });
        }
      }
    );
  },

  sendHeartbeat: (status: UserStatus, customStatus?: string | null, customStatusExpiresAt?: string | null) => {
    const socket = realtime.getSocket();
    if (socket) {
      socket.emit(REALTIME_EVENTS.PRESENCE_HEARTBEAT, { status, customStatus, customStatusExpiresAt });
    }
  },

  updateAvailabilityAndStatus: async (
    status: UserStatus,
    customStatus?: string | null,
    customStatusExpiresAt?: string | null
  ) => {
    const socket = realtime.getSocket();
    const payload = { status, customStatus, customStatusExpiresAt };

    // 1. Emit via Realtime Socket for instantaneous peer sync
    if (socket) {
      socket.emit(REALTIME_EVENTS.PRESENCE_UPDATE, payload);
    }

    // 2. Persist to API
    try {
      const res = await api.patch<UserDTO>('/api/v1/users/me/status', payload);
      if (res.success && res.data) {
        const data = res.data;
        useAuthStore.getState().updateUser(data);
        set((state) => ({
          userStatuses: {
            ...state.userStatuses,
            [data.id]: {
              status: data.status,
              customStatus: data.customStatus,
              customStatusExpiresAt: data.customStatusExpiresAt,
            },
          },
        }));
        return true;
      }
    } catch (err) {
      console.error('Failed to update status via REST:', err);
    }

    return false;
  },
}));
