import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { RoomsService } from './rooms.service.js';
import { JwtAuthGuard } from '../common/jwt-auth.guard.js';
import { CurrentUser } from '../common/current-user.decorator.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import {
  CreateRoomSchema,
  ChangeRoomModeSchema,
  AddRoomMemberSchema,
  CreateRoomInput,
  ChangeRoomModeInput,
  AddRoomMemberInput,
  ApiResponse,
  RoomDTO,
  RoomMemberDTO,
  JwtPayload,
} from '@mivo/shared';

@Controller('api/v1/rooms')
@UseGuards(JwtAuthGuard)
export class RoomsController {
  constructor(private roomsService: RoomsService) {}

  @Post('channels/:channelId')
  @UsePipes(new ZodValidationPipe(CreateRoomSchema))
  async createRoom(
    @Param('channelId') channelId: string,
    @Body() body: CreateRoomInput
  ): Promise<ApiResponse<RoomDTO>> {
    const room = await this.roomsService.createRoom(channelId, body);
    return {
      success: true,
      data: room,
    };
  }

  @Get(':id')
  async getRoom(@Param('id') id: string): Promise<ApiResponse<RoomDTO>> {
    const room = await this.roomsService.getRoom(id);
    return {
      success: true,
      data: room,
    };
  }

  @Patch(':id/mode')
  @UsePipes(new ZodValidationPipe(ChangeRoomModeSchema))
  async updateRoomMode(
    @Param('id') id: string,
    @Body() body: ChangeRoomModeInput
  ): Promise<ApiResponse<RoomDTO>> {
    const room = await this.roomsService.updateRoomMode(id, body.activeMode);
    return {
      success: true,
      data: room,
    };
  }

  @Post(':id/email-summary')
  async emailSummary(
    @Param('id') id: string,
    @Body() body: { notes: string; transcript: Array<{ speaker: string; text: string; time: string }>; email?: string; name?: string }
  ): Promise<ApiResponse<any>> {
    const userEmail = body.email || 'attendee@mivo.app';
    const userName = body.name || 'Mivo Member';
    const result = await this.roomsService.emailMeetingSummary(
      id,
      userEmail,
      userName,
      body.notes || '',
      body.transcript || []
    );
    return {
      success: true,
      data: result,
    };
  }

  @Post(':id/members')
  @UsePipes(new ZodValidationPipe(AddRoomMemberSchema))
  async addMember(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: AddRoomMemberInput
  ): Promise<ApiResponse<RoomMemberDTO>> {
    const member = await this.roomsService.addRoomMember(id, user.sub, body.userId);
    return {
      success: true,
      data: member,
    };
  }

  @Delete(':id/members/:userId')
  async removeMember(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Param('userId') targetUserId: string
  ): Promise<ApiResponse<{ message: string }>> {
    const result = await this.roomsService.removeRoomMember(id, user.sub, targetUserId);
    return {
      success: true,
      data: result,
    };
  }

  @Get(':id/eligible-members')
  async listEligibleMembers(
    @Param('id') id: string
  ): Promise<ApiResponse<any[]>> {
    const members = await this.roomsService.listEligibleRoomMembers(id);
    return {
      success: true,
      data: members,
    };
  }
}

@Controller('api/v1/channels/:channelId/rooms')
@UseGuards(JwtAuthGuard)
export class ChannelRoomsController {
  constructor(private roomsService: RoomsService) {}

  @Post()
  @UsePipes(new ZodValidationPipe(CreateRoomSchema))
  async createRoom(
    @Param('channelId') channelId: string,
    @Body() body: CreateRoomInput
  ): Promise<ApiResponse<RoomDTO>> {
    const room = await this.roomsService.createRoom(channelId, body);
    return {
      success: true,
      data: room,
    };
  }
}

