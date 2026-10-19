export type NotificationType = 'MESSAGE' | 'CALL' | 'MEETING' | 'TICKET' | 'SYSTEM';

export interface NotificationDTO {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  entityId: string | null;
  data: Record<string, any> | null;
  isRead: boolean;
  createdAt: string;
  readAt: string | null;
}
