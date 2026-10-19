import { Controller, Get, Patch, Post, Param, Query, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service.js';
import { JwtAuthGuard } from '../common/jwt-auth.guard.js';
import { CurrentUser } from '../common/current-user.decorator.js';
import { ApiResponse, NotificationDTO, NotificationType, JwtPayload } from '@mivo/shared';

@Controller('api/v1/notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get()
  async listNotifications(
    @CurrentUser() user: JwtPayload,
    @Query('limit') limit?: string,
    @Query('unread') unread?: string,
    @Query('type') type?: NotificationType
  ): Promise<ApiResponse<{ notifications: NotificationDTO[]; unreadCount: number }>> {
    const parsedLimit = limit ? Math.min(parseInt(limit, 10), 100) : 50;
    const onlyUnread = unread === 'true';
    const result = await this.notificationsService.listNotifications(user.sub, parsedLimit, onlyUnread, type);
    return {
      success: true,
      data: result,
    };
  }

  @Get('unread-count')
  async getUnreadCount(@CurrentUser() user: JwtPayload): Promise<ApiResponse<{ count: number }>> {
    const count = await this.notificationsService.getUnreadCount(user.sub);
    return {
      success: true,
      data: { count },
    };
  }

  @Patch(':id/read')
  async markAsRead(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string
  ): Promise<ApiResponse<NotificationDTO>> {
    const updated = await this.notificationsService.markAsRead(id, user.sub);
    return {
      success: true,
      data: updated,
    };
  }

  @Post('read-all')
  async markAllAsRead(@CurrentUser() user: JwtPayload): Promise<ApiResponse<{ count: number }>> {
    const result = await this.notificationsService.markAllAsRead(user.sub);
    return {
      success: true,
      data: result,
    };
  }
}
