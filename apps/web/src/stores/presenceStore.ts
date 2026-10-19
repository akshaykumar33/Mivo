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

let presenceInitialized = false;
let heartbeatInterval: NodeJS.Timeout | null = null;
let expirationInterval: NodeJS.Timeout | null = null;
let idleTimer: NodeJS.Timeout | null = null;

export const usePresenceStore = create<PresenceState>((set, get) => ({
  userStatuses: {},

  initPresenceListeners: () => {
    if (presenceInitialized) return;
    presenceInitialized = true;

    // Use realtime.on for persistent listener across reconnects
    realtime.on(
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

    // Heartbeat every 30 seconds
    if (!heartbeatInterval) {
      heartbeatInterval = setInterval(() => {
        const currentUser = useAuthStore.getState().user;
        if (currentUser) {
          get().sendHeartbeat(
            currentUser.status || 'ONLINE',
            currentUser.customStatus,
            currentUser.customStatusExpiresAt
          );
        }
      }, 30000);
    }

    // Status Expiration check every 10 seconds
    if (!expirationInterval) {
      expirationInterval = setInterval(() => {
        const now = Date.now();
        const currentUser = useAuthStore.getState().user;

        // Auto-clear current user customStatus if expired
        if (currentUser?.customStatusExpiresAt) {
          const expTime = new Date(currentUser.customStatusExpiresAt).getTime();
          if (!isNaN(expTime) && expTime <= now) {
            console.log('[Presence] Custom status has expired. Clearing automatically...');
            get().updateAvailabilityAndStatus(currentUser.status || 'ONLINE', null, null);
          }
        }

        // Clean expired statuses from cached userStatuses
        const currentStatuses = get().userStatuses;
        let hasChanges = false;
        const updated = { ...currentStatuses };

        for (const [userId, info] of Object.entries(currentStatuses)) {
          if (info.customStatusExpiresAt) {
            const expTime = new Date(info.customStatusExpiresAt).getTime();
            if (!isNaN(expTime) && expTime <= now) {
              updated[userId] = { ...info, customStatus: null, customStatusExpiresAt: null };
              hasChanges = true;
            }
          }
        }

        if (hasChanges) {
          set({ userStatuses: updated });
        }
      }, 10000);
    }

    // Auto-Away detection when tab is hidden for > 5 minutes
    if (typeof window !== 'undefined') {
      const handleVisibilityChange = () => {
        const currentUser = useAuthStore.getState().user;
        if (!currentUser) return;

        if (document.hidden) {
          // If user was ONLINE, start 5-minute away timer
          if (currentUser.status === 'ONLINE') {
            idleTimer = setTimeout(() => {
              const u = useAuthStore.getState().user;
              if (u && u.status === 'ONLINE' && document.hidden) {
                get().updateAvailabilityAndStatus('IDLE', u.customStatus, u.customStatusExpiresAt);
              }
            }, 5 * 60 * 1000);
          }
        } else {
          if (idleTimer) {
            clearTimeout(idleTimer);
            idleTimer = null;
          }
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);
    }
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
    const payload = {
      status,
      customStatus: customStatus !== undefined ? customStatus : null,
      customStatusExpiresAt: customStatusExpiresAt !== undefined ? customStatusExpiresAt : null,
    };

    // 1. Optimistically update local auth store & userStatuses
    const currentUser = useAuthStore.getState().user;
    if (currentUser) {
      useAuthStore.getState().updateUser({
        status,
        customStatus: payload.customStatus,
        customStatusExpiresAt: payload.customStatusExpiresAt,
      });

      set((state) => ({
        userStatuses: {
          ...state.userStatuses,
          [currentUser.id]: {
            status,
            customStatus: payload.customStatus,
            customStatusExpiresAt: payload.customStatusExpiresAt,
          },
        },
      }));
    }

    // 2. Emit via Realtime Socket for instantaneous peer sync
    if (socket) {
      socket.emit(REALTIME_EVENTS.PRESENCE_UPDATE, payload);
    }

    // 3. Persist to API
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

/**
 * Reactive hook to get the latest presence & custom status for any user.
 * Priority: Live socket presence > Auth user (if self) > fallbackUser initial props
 */
export function useUserPresence(
  userId?: string | null,
  fallbackUser?: Partial<UserDTO> | null
): UserPresenceInfo {
  const currentPresence = usePresenceStore((state) => (userId ? state.userStatuses[userId] : undefined));
  const currentUser = useAuthStore((state) => state.user);

  // If this is the current logged-in user
  if (userId && currentUser && userId === currentUser.id) {
    const isSelfExpired =
      currentUser.customStatusExpiresAt &&
      new Date(currentUser.customStatusExpiresAt).getTime() <= Date.now();

    return {
      status: currentPresence?.status || currentUser.status || 'ONLINE',
      customStatus: isSelfExpired
        ? null
        : currentPresence?.customStatus !== undefined
        ? currentPresence.customStatus
        : currentUser.customStatus,
      customStatusExpiresAt: isSelfExpired
        ? null
        : currentPresence?.customStatusExpiresAt !== undefined
        ? currentPresence.customStatusExpiresAt
        : currentUser.customStatusExpiresAt,
    };
  }

  // If other user
  const isFallbackExpired =
    fallbackUser?.customStatusExpiresAt &&
    new Date(fallbackUser.customStatusExpiresAt).getTime() <= Date.now();

  return {
    status: currentPresence?.status || fallbackUser?.status || 'ONLINE',
    customStatus: isFallbackExpired
      ? null
      : currentPresence?.customStatus !== undefined
      ? currentPresence.customStatus
      : (fallbackUser?.customStatus ?? null),
    customStatusExpiresAt: isFallbackExpired
      ? null
      : currentPresence?.customStatusExpiresAt !== undefined
      ? currentPresence.customStatusExpiresAt
      : (fallbackUser?.customStatusExpiresAt ?? null),
  };
}
