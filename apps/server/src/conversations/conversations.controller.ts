import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { ConversationsService } from './conversations.service.js';
import { JwtAuthGuard } from '../common/jwt-auth.guard.js';
import { CurrentUser } from '../common/current-user.decorator.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import {
  CreateDirectConversationSchema,
  CreateGroupConversationSchema,
  SendDirectMessageSchema,
  CreateDirectConversationInput,
  CreateGroupConversationInput,
  SendDirectMessageInput,
  ConversationDTO,
  DirectMessageDTO,
  ApiResponse,
} from '@mivo/shared';

@Controller('api/v1/conversations')
@UseGuards(JwtAuthGuard)
export class ConversationsController {
  constructor(private conversationsService: ConversationsService) {}

  @Get()
  async listConversations(@CurrentUser() user: any): Promise<ApiResponse<ConversationDTO[]>> {
    const list = await this.conversationsService.listConversations(user.sub);
    return {
      success: true,
      data: list,
    };
  }

  @Post('direct')
  @UsePipes(new ZodValidationPipe(CreateDirectConversationSchema))
  async createDirectConversation(
    @CurrentUser() user: any,
    @Body() body: CreateDirectConversationInput
  ): Promise<ApiResponse<ConversationDTO>> {
    const conversation = await this.conversationsService.getOrCreateDirectConversation(user.sub, body.recipientId);
    return {
      success: true,
      data: conversation,
    };
  }

  @Post('group')
  @UsePipes(new ZodValidationPipe(CreateGroupConversationSchema))
  async createGroupConversation(
    @CurrentUser() user: any,
    @Body() body: CreateGroupConversationInput
  ): Promise<ApiResponse<ConversationDTO>> {
    const conversation = await this.conversationsService.createGroupConversation(user.sub, body);
    return {
      success: true,
      data: conversation,
    };
  }

  @Get(':id')
  async getConversation(
    @CurrentUser() user: any,
    @Param('id') id: string
  ): Promise<ApiResponse<ConversationDTO>> {
    const conversation = await this.conversationsService.getConversation(id, user.sub);
    return {
      success: true,
      data: conversation,
    };
  }

  @Get(':id/messages')
  async listMessages(
    @CurrentUser() user: any,
    @Param('id') id: string
  ): Promise<ApiResponse<DirectMessageDTO[]>> {
    const messages = await this.conversationsService.listMessages(id, user.sub);
    return {
      success: true,
      data: messages,
    };
  }

  @Post(':id/messages')
  @UsePipes(new ZodValidationPipe(SendDirectMessageSchema))
  async sendMessage(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() body: SendDirectMessageInput
  ): Promise<ApiResponse<DirectMessageDTO>> {
    const message = await this.conversationsService.createMessage(id, user.sub, body);
    return {
      success: true,
      data: message,
    };
  }
}
