import {
  Controller,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { ChannelsService } from './channels.service.js';
import { JwtAuthGuard } from '../common/jwt-auth.guard.js';
import { PermissionsGuard } from '../common/permissions.guard.js';
import { RequirePermissions } from '../common/require-permissions.decorator.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import {
  PERMISSIONS,
  CreateChannelSchema,
  UpdateChannelSchema,
  CreateChannelInput,
  UpdateChannelInput,
  ApiResponse,
  ChannelDTO,
} from '@mivo/shared';

@Controller('api/v1/communities/:communityId/channels')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ChannelsController {
  constructor(private channelsService: ChannelsService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.CHANNEL_CREATE)
  @UsePipes(new ZodValidationPipe(CreateChannelSchema))
  async createChannel(
    @Param('communityId') communityId: string,
    @Body() body: CreateChannelInput
  ): Promise<ApiResponse<ChannelDTO>> {
    const channel = await this.channelsService.createChannel(communityId, body);
    return {
      success: true,
      data: channel,
    };
  }

  @Patch(':channelId')
  @RequirePermissions(PERMISSIONS.CHANNEL_MANAGE)
  @UsePipes(new ZodValidationPipe(UpdateChannelSchema))
  async updateChannel(
    @Param('channelId') channelId: string,
    @Body() body: UpdateChannelInput
  ): Promise<ApiResponse<ChannelDTO>> {
    const channel = await this.channelsService.updateChannel(channelId, body);
    return {
      success: true,
      data: channel,
    };
  }

  @Delete(':channelId')
  @RequirePermissions(PERMISSIONS.CHANNEL_DELETE)
  async deleteChannel(@Param('channelId') channelId: string): Promise<ApiResponse<{ message: string }>> {
    await this.channelsService.deleteChannel(channelId);
    return {
      success: true,
      data: { message: 'Channel deleted successfully' },
    };
  }
}
