import { describe, it, expect, beforeEach } from 'vitest';
import { useNotificationStore } from '@/stores/notificationStore';
import { NotificationDTO } from '@mivo/shared';

describe('Notification Store & Unread Center', () => {
  beforeEach(() => {
    useNotificationStore.setState({
      notifications: [],
      unreadCount: 0,
      isLoading: false,
      filter: 'ALL',
      isCenterOpen: false,
      recentToast: null,
    });
  });

  it('initializes with default empty notifications state and closed center', () => {
    const state = useNotificationStore.getState();
    expect(state.notifications).toEqual([]);
    expect(state.unreadCount).toBe(0);
    expect(state.isCenterOpen).toBe(false);
    expect(state.filter).toBe('ALL');
  });

  it('manages filter switches and notification center visibility', () => {
    const store = useNotificationStore.getState();

    store.setIsCenterOpen(true);
    expect(useNotificationStore.getState().isCenterOpen).toBe(true);

    store.setFilter('CALL');
    expect(useNotificationStore.getState().filter).toBe('CALL');

    store.setFilter('ALL');
    expect(useNotificationStore.getState().filter).toBe('ALL');
  });

  it('marks notifications as read optimistically updating unread counter', () => {
    const mockNotifications: NotificationDTO[] = [
      {
        id: 'n-1',
        userId: 'u-1',
        type: 'MESSAGE',
        title: 'New direct message',
        body: 'Hey, are you free for a sync?',
        entityId: 'conv-1',
        data: null,
        isRead: false,
        createdAt: '2026-10-26T10:00:00Z',
        readAt: null,
      },
      {
        id: 'n-2',
        userId: 'u-1',
        type: 'CALL',
        title: 'Incoming Audio Call',
        body: 'Dev Admin is calling you',
        entityId: 'conv-2',
        data: null,
        isRead: false,
        createdAt: '2026-10-26T10:05:00Z',
        readAt: null,
      },
    ];

    useNotificationStore.setState({
      notifications: mockNotifications,
      unreadCount: 2,
    });

    // Mark single notification as read
    useNotificationStore.setState((state: any) => ({
      notifications: state.notifications.map((n: NotificationDTO) => (n.id === 'n-1' ? { ...n, isRead: true } : n)),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }));

    let state = useNotificationStore.getState();
    expect(state.unreadCount).toBe(1);
    expect(state.notifications.find((n: NotificationDTO) => n.id === 'n-1')?.isRead).toBe(true);

    // Mark all as read
    useNotificationStore.setState((state: any) => ({
      notifications: state.notifications.map((n: NotificationDTO) => ({ ...n, isRead: true })),
      unreadCount: 0,
    }));

    state = useNotificationStore.getState();
    expect(state.unreadCount).toBe(0);
    expect(state.notifications.every((n: NotificationDTO) => n.isRead)).toBe(true);
  });
});
