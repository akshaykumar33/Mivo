import { create } from 'zustand';
import { NotificationDTO, NotificationType, REALTIME_EVENTS } from '@mivo/shared';
import { api } from '@/lib/api-client';
import { realtime } from '@/lib/socket-client';

export type NotificationFilter = 'ALL' | NotificationType;

interface NotificationState {
  notifications: NotificationDTO[];
  unreadCount: number;
  isLoading: boolean;
  filter: NotificationFilter;
  isCenterOpen: boolean;
  recentToast: NotificationDTO | null;

  setFilter: (filter: NotificationFilter) => void;
  setIsCenterOpen: (open: boolean) => void;
  clearToast: () => void;
  fetchNotifications: () => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  setupRealtimeListeners: () => () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  filter: 'ALL',
  isCenterOpen: false,
  recentToast: null,

  setFilter: (filter) => set({ filter }),
  setIsCenterOpen: (open) => set({ isCenterOpen: open }),
  clearToast: () => set({ recentToast: null }),

  fetchNotifications: async () => {
    set({ isLoading: true });
    try {
      const res = await api.get<any>('/api/v1/notifications?limit=50');
      if (res.success && res.data) {
        let items: NotificationDTO[] = [];
        let unread = 0;

        if (Array.isArray(res.data)) {
          items = res.data;
          unread = items.filter((n) => !n.isRead).length;
        } else if (Array.isArray(res.data.notifications)) {
          items = res.data.notifications;
          unread =
            typeof res.data.unreadCount === 'number'
              ? res.data.unreadCount
              : items.filter((n) => !n.isRead).length;
        }

        set({
          notifications: items,
          unreadCount: unread,
        });
      }
    } finally {
      set({ isLoading: false });
    }
  },

  fetchUnreadCount: async () => {
    try {
      const res = await api.get<{ count: number }>('/api/v1/notifications/unread-count');
      if (res.success && res.data && typeof res.data.count === 'number') {
        set({ unreadCount: res.data.count });
      }
    } catch {}
  },

  markAsRead: async (id: string) => {
    // Optimistic update
    set((state) => ({
      notifications: state.notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }));

    await api.patch(`/api/v1/notifications/${id}/read`, {});
  },

  markAllAsRead: async () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
      unreadCount: 0,
    }));

    await api.patch('/api/v1/notifications/read-all', {});
  },

  setupRealtimeListeners: () => {
    const handleNewNotification = (notification: NotificationDTO) => {
      set((state) => {
        // Prevent duplicates
        const exists = state.notifications.some((n) => n.id === notification.id);
        const updated = exists ? state.notifications : [notification, ...state.notifications];
        return {
          notifications: updated,
          unreadCount: state.unreadCount + (notification.isRead ? 0 : 1),
          recentToast: notification,
        };
      });
    };

    const handleNotificationRead = ({ id }: { id: string }) => {
      set((state) => ({
        notifications: state.notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    };

    const handleNotificationReadAll = () => {
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
        unreadCount: 0,
      }));
    };

    realtime.on(REALTIME_EVENTS.NOTIFICATION_NEW, handleNewNotification);
    realtime.on(REALTIME_EVENTS.NOTIFICATION_READ, handleNotificationRead);
    realtime.on(REALTIME_EVENTS.NOTIFICATION_READ_ALL, handleNotificationReadAll);

    return () => {
      realtime.off(REALTIME_EVENTS.NOTIFICATION_NEW, handleNewNotification);
      realtime.off(REALTIME_EVENTS.NOTIFICATION_READ, handleNotificationRead);
      realtime.off(REALTIME_EVENTS.NOTIFICATION_READ_ALL, handleNotificationReadAll);
    };
  },
}));
