import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { MessagesService } from './messages.service.js';
import { JwtAuthGuard } from '../common/jwt-auth.guard.js';
import { CurrentUser } from '../common/current-user.decorator.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import {
  SendMessageSchema,
  SendMessageInput,
  ApiResponse,
  MessageDTO,
  JwtPayload,
} from '@mivo/shared';

@Controller('api/v1/rooms/:roomId/messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private messagesService: MessagesService) {}

  @Get()
  async listMessages(
    @Param('roomId') roomId: string,
    @Query('limit') limit?: string
  ): Promise<ApiResponse<MessageDTO[]>> {
    const parsedLimit = limit ? Math.min(parseInt(limit, 10), 100) : 50;
    const messages = await this.messagesService.listMessages(roomId, parsedLimit);
    return {
      success: true,
      data: messages,
    };
  }

  @Post()
  @UsePipes(new ZodValidationPipe(SendMessageSchema))
  async sendMessage(
    @Param('roomId') roomId: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: SendMessageInput
  ): Promise<ApiResponse<MessageDTO>> {
    const message = await this.messagesService.createMessage(roomId, user.sub, body);
    return {
      success: true,
      data: message,
    };
  }
}
