import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  UsePipes,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/jwt-auth.guard.js';
import { CurrentUser } from '../common/current-user.decorator.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import {
  CreateExternalMeetingSchema,
  CreateExternalMeetingInput,
  SetRoomBridgeSchema,
  SetRoomBridgeInput,
  SetConversationBridgeSchema,
  SetConversationBridgeInput,
  ApiResponse,
  ExternalMeetingDTO,
  ExternalMeetingBridgeDTO,
  ExternalMeetingConfigDTO,
  JwtPayload,
} from '@mivo/shared';
import { MeetingsService } from './meetings.service.js';

@Controller('api/v1/meetings')
@UseGuards(JwtAuthGuard)
export class MeetingsController {
  constructor(private meetingsService: MeetingsService) {}

  @Post('generate')
  @UsePipes(new ZodValidationPipe(CreateExternalMeetingSchema))
  async generateMeeting(
    @CurrentUser() user: JwtPayload,
    @Body() body: CreateExternalMeetingInput
  ): Promise<ApiResponse<{ meeting: ExternalMeetingDTO; bridge?: ExternalMeetingBridgeDTO }>> {
    if (user.isGuest) {
      throw new ForbiddenException('Guest accounts cannot generate external meetings. Please upgrade your account.');
    }
    const result = await this.meetingsService.generateMeeting(user.sub, body);
    return {
      success: true,
      data: result,
    };
  }

  @Get('room/:roomId/bridge')
  async getRoomBridge(
    @Param('roomId') roomId: string
  ): Promise<ApiResponse<{ bridge: ExternalMeetingBridgeDTO | null }>> {
    const bridge = this.meetingsService.getRoomBridge(roomId);
    return {
      success: true,
      data: { bridge },
    };
  }

  @Post('room/:roomId/bridge')
  @UsePipes(new ZodValidationPipe(SetRoomBridgeSchema))
  async setRoomBridge(
    @CurrentUser() user: JwtPayload,
    @Param('roomId') roomId: string,
    @Body() body: SetRoomBridgeInput
  ): Promise<ApiResponse<ExternalMeetingBridgeDTO>> {
    if (user.isGuest) {
      throw new ForbiddenException('Guest accounts cannot bridge meetings.');
    }
    const bridge = await this.meetingsService.setRoomBridge(roomId, body.meetingId, user.sub);
    return {
      success: true,
      data: bridge,
    };
  }

  @Delete('room/:roomId/bridge')
  async removeRoomBridge(
    @CurrentUser() user: JwtPayload,
    @Param('roomId') roomId: string
  ): Promise<ApiResponse<{ message: string }>> {
    await this.meetingsService.removeRoomBridge(roomId, user.sub);
    return {
      success: true,
      data: { message: 'Meeting bridge removed successfully' },
    };
  }

  @Get('conversation/:conversationId/bridge')
  async getConversationBridge(
    @Param('conversationId') conversationId: string
  ): Promise<ApiResponse<{ bridge: ExternalMeetingBridgeDTO | null }>> {
    const bridge = this.meetingsService.getConversationBridge(conversationId);
    return {
      success: true,
      data: { bridge },
    };
  }

  @Post('conversation/:conversationId/bridge')
  @UsePipes(new ZodValidationPipe(SetConversationBridgeSchema))
  async setConversationBridge(
    @CurrentUser() user: JwtPayload,
    @Param('conversationId') conversationId: string,
    @Body() body: SetConversationBridgeInput
  ): Promise<ApiResponse<ExternalMeetingBridgeDTO>> {
    if (user.isGuest) {
      throw new ForbiddenException('Guest accounts cannot bridge meetings.');
    }
    const bridge = await this.meetingsService.setConversationBridge(conversationId, body.meetingId, user.sub);
    return {
      success: true,
      data: bridge,
    };
  }

  @Delete('conversation/:conversationId/bridge')
  async removeConversationBridge(
    @CurrentUser() user: JwtPayload,
    @Param('conversationId') conversationId: string
  ): Promise<ApiResponse<{ message: string }>> {
    await this.meetingsService.removeConversationBridge(conversationId, user.sub);
    return {
      success: true,
      data: { message: 'Meeting bridge removed successfully' },
    };
  }

  @Get('config')
  async getConfig(): Promise<ApiResponse<ExternalMeetingConfigDTO>> {
    const config = this.meetingsService.getConfig();
    return {
      success: true,
      data: config,
    };
  }
}
