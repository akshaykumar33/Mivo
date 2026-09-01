import { Controller, Post, Body, UseGuards, Headers } from '@nestjs/common';
import { AiService } from './ai.service.js';
import { JwtAuthGuard } from '../common/jwt-auth.guard.js';
import { ApiResponse } from '@mivo/shared';

@Controller('api/v1/ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private aiService: AiService) {}

  @Post('verify-key')
  async verifyKey(
    @Body() body: { apiKey: string }
  ): Promise<ApiResponse<{ valid: boolean; model: string; message: string }>> {
    const result = await this.aiService.verifyApiKey(body.apiKey);
    return {
      success: true,
      data: result,
    };
  }

  @Post('translate')
  async translate(
    @Body() body: { text: string; targetLanguage: string; apiKey?: string },
    @Headers('x-gemini-api-key') headerKey?: string
  ): Promise<ApiResponse<{ translatedText: string; engine: string }>> {
    const effectiveKey = body.apiKey || headerKey;
    const result = await this.aiService.translateText(body.text, body.targetLanguage, effectiveKey);
    return {
      success: true,
      data: result,
    };
  }

  @Post('summarize-mom')
  async summarizeMOM(
    @Body()
    body: {
      roomName: string;
      attendees: string[];
      transcript: Array<{ speaker: string; text: string; time: string }>;
      userNotes: string;
      apiKey?: string;
    },
    @Headers('x-gemini-api-key') headerKey?: string
  ): Promise<ApiResponse<{ momDocument: string; engine: string }>> {
    const effectiveKey = body.apiKey || headerKey;
    const result = await this.aiService.generateExecutiveMOM(
      body.roomName,
      body.attendees || [],
      body.transcript || [],
      body.userNotes || '',
      effectiveKey
    );
    return {
      success: true,
      data: result,
    };
  }

  @Post('copilot')
  async copilot(
    @Body()
    body: {
      question: string;
      roomName: string;
      transcript: Array<{ speaker: string; text: string; time: string }>;
      apiKey?: string;
    },
    @Headers('x-gemini-api-key') headerKey?: string
  ): Promise<ApiResponse<{ answer: string; engine: string }>> {
    const effectiveKey = body.apiKey || headerKey;
    const result = await this.aiService.askCopilot(
      body.question,
      body.roomName,
      body.transcript || [],
      effectiveKey
    );
    return {
      success: true,
      data: result,
    };
  }
}
