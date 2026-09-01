import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { RoomsService } from './rooms.service.js';
import { JwtAuthGuard } from '../common/jwt-auth.guard.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import {
  CreateRoomSchema,
  ChangeRoomModeSchema,
  CreateRoomInput,
  ChangeRoomModeInput,
  ApiResponse,
  RoomDTO,
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
}
