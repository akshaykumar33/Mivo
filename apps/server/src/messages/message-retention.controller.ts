import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { MessageRetentionService, RetentionPolicyInfo, PurgeResult } from './message-retention.service.js';
import { JwtAuthGuard } from '../common/jwt-auth.guard.js';
import { ApiResponse } from '@mivo/shared';

@Controller('api/v1/messages')
@UseGuards(JwtAuthGuard)
export class MessageRetentionController {
  constructor(private retentionService: MessageRetentionService) {}

  @Get('retention-policy')
  getRetentionPolicy(): ApiResponse<RetentionPolicyInfo> {
    const policy = this.retentionService.getRetentionPolicy();
    return {
      success: true,
      data: policy,
    };
  }

  @Post('cleanup-expired')
  async cleanupExpiredMessages(
    @Query('retentionDays') retentionDays?: string
  ): Promise<ApiResponse<PurgeResult>> {
    const parsedDays = retentionDays ? parseInt(retentionDays, 10) : undefined;
    const result = await this.retentionService.purgeExpiredMessages(parsedDays);
    return {
      success: true,
      data: result,
    };
  }
}
