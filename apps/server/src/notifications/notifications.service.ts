import { Injectable, NotFoundException, Inject, forwardRef, Logger } from '@nestjs/common';
import { prisma } from '@mivo/database';
import { NotificationDTO, NotificationType, REALTIME_EVENTS } from '@mivo/shared';
import { RealtimeGateway } from '../realtime/realtime.gateway.js';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @Inject(forwardRef(() => RealtimeGateway))
    private realtimeGateway: RealtimeGateway
  ) {}

  async createNotification(
    userId: string,
    type: NotificationType,
    title: string,
    body: string,
    entityId?: string | null,
    data?: Record<string, any> | null
  ): Promise<NotificationDTO> {
    try {
      const notification = await prisma.notification.create({
        data: {
          userId,
          type,
          title,
          body,
          entityId: entityId || null,
          data: data || undefined,
        },
      });

      const dto: NotificationDTO = {
        id: notification.id,
        userId: notification.userId,
        type: notification.type,
        title: notification.title,
        body: notification.body,
        entityId: notification.entityId,
        data: notification.data as Record<string, any> | null,
        isRead: notification.isRead,
        createdAt: notification.createdAt.toISOString(),
        readAt: notification.readAt ? notification.readAt.toISOString() : null,
      };

      // Realtime push to recipient's private user socket room
      try {
        if (this.realtimeGateway?.server) {
          this.realtimeGateway.server.to(`user:${userId}`).emit(REALTIME_EVENTS.NOTIFICATION_NEW, dto);
        }
      } catch (err: any) {
        this.logger.warn(`Failed to broadcast realtime notification: ${err.message}`);
      }

      return dto;
    } catch (err: any) {
      this.logger.error(`Error saving notification for user ${userId}: ${err.message}`);
      throw err;
    }
  }

  async listNotifications(
    userId: string,
    limit = 50,
    onlyUnread = false,
    type?: NotificationType
  ): Promise<{ notifications: NotificationDTO[]; unreadCount: number }> {
    const whereClause: any = {
      userId,
      ...(onlyUnread && { isRead: false }),
      ...(type && { type }),
    };

    const [items, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.notification.count({
        where: { userId, isRead: false },
      }),
    ]);

    const notifications: NotificationDTO[] = items.map((n) => ({
      id: n.id,
      userId: n.userId,
      type: n.type,
      title: n.title,
      body: n.body,
      entityId: n.entityId,
      data: n.data as Record<string, any> | null,
      isRead: n.isRead,
      createdAt: n.createdAt.toISOString(),
      readAt: n.readAt ? n.readAt.toISOString() : null,
    }));

    return { notifications, unreadCount };
  }

  async getUnreadCount(userId: string): Promise<number> {
    return prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  async markAsRead(notificationId: string, userId: string): Promise<NotificationDTO> {
    const notif = await prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notif) {
      throw new NotFoundException('Notification not found');
    }

    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    const dto: NotificationDTO = {
      id: updated.id,
      userId: updated.userId,
      type: updated.type,
      title: updated.title,
      body: updated.body,
      entityId: updated.entityId,
      data: updated.data as Record<string, any> | null,
      isRead: updated.isRead,
      createdAt: updated.createdAt.toISOString(),
      readAt: updated.readAt ? updated.readAt.toISOString() : null,
    };

    try {
      if (this.realtimeGateway?.server) {
        this.realtimeGateway.server.to(`user:${userId}`).emit(REALTIME_EVENTS.NOTIFICATION_READ, {
          notificationId,
        });
      }
    } catch {}

    return dto;
  }

  async markAllAsRead(userId: string): Promise<{ count: number }> {
    const result = await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    try {
      if (this.realtimeGateway?.server) {
        this.realtimeGateway.server.to(`user:${userId}`).emit(REALTIME_EVENTS.NOTIFICATION_READ_ALL, {
          userId,
        });
      }
    } catch {}

    return { count: result.count };
  }
}
