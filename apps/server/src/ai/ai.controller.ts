import { Controller, Post, Get, Patch, Body, Param, UseGuards, Headers } from '@nestjs/common';
import { AiService } from './ai.service.js';
import { AiTwinService } from './ai-twin.service.js';
import { JwtAuthGuard } from '../common/jwt-auth.guard.js';
import { ApiResponse } from '@mivo/shared';

@Controller('api/v1/ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(
    private aiService: AiService,
    private aiTwinService: AiTwinService,
  ) {}

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

  @Post('generate-status')
  async generateStatus(
    @Body()
    body: {
      topic?: string;
      availability?: string;
      apiKey?: string;
    },
    @Headers('x-gemini-api-key') headerKey?: string
  ): Promise<ApiResponse<{ statusText: string; engine: string }>> {
    const effectiveKey = body.apiKey || headerKey;
    const result = await this.aiService.generateCustomStatus(
      body.topic,
      body.availability,
      effectiveKey
    );
    return {
      success: true,
      data: result,
    };
  }

  @Post('extract-ticket')
  async extractTicket(
    @Body()
    body: {
      transcriptSnippet?: string;
      transcript?: string;
      text?: string;
      attendees?: string[];
      apiKey?: string;
    },
    @Headers('x-gemini-api-key') headerKey?: string
  ): Promise<ApiResponse<any>> {
    const text = body.transcriptSnippet || body.transcript || body.text || '';
    const effectiveKey = body.apiKey || headerKey;
    const result = await this.aiService.extractTicketFromSpeech(
      text,
      body.attendees || [],
      effectiveKey
    );
    return {
      success: true,
      data: result,
    };
  }

  @Post('stage-agent')
  async stageAgent(
    @Body()
    body: {
      query: string;
      roomName: string;
      attendees: string[];
      recentTranscript?: Array<{ speaker: string; text: string; time?: string }>;
      communityId?: string;
      apiKey?: string;
    },
    @Headers('x-gemini-api-key') headerKey?: string
  ): Promise<ApiResponse<any>> {
    const effectiveKey = body.apiKey || headerKey;
    const result = await this.aiService.processStageAgentCommand(
      body.query,
      body.roomName,
      body.attendees || [],
      body.recentTranscript || [],
      body.communityId,
      effectiveKey
    );
    return {
      success: true,
      data: result,
    };
  }

  @Post('fact-check')
  async factCheck(
    @Body()
    body: {
      transcriptText: string;
      speaker: string;
      apiKey?: string;
    },
    @Headers('x-gemini-api-key') headerKey?: string
  ): Promise<ApiResponse<any>> {
    const effectiveKey = body.apiKey || headerKey;
    const result = await this.aiService.auditLiveFactCheck(
      body.transcriptText,
      body.speaker,
      effectiveKey
    );
    return {
      success: true,
      data: result,
    };
  }

  @Post('canvas-generate')
  async canvasGenerate(
    @Body()
    body: {
      prompt: string;
      apiKey?: string;
    },
    @Headers('x-gemini-api-key') headerKey?: string
  ): Promise<ApiResponse<any>> {
    const effectiveKey = body.apiKey || headerKey;
    const result = await this.aiService.generateCanvasArchitecture(
      body.prompt,
      effectiveKey
    );
    return {
      success: true,
      data: result,
    };
  }

  @Get('twin/config/:userId')
  async getAiTwinConfig(@Param('userId') userId: string): Promise<ApiResponse<any>> {
    const config = await this.aiTwinService.getConfig(userId);
    return {
      success: true,
      data: config,
    };
  }

  @Patch('twin/config/:userId')
  async updateAiTwinConfig(
    @Param('userId') userId: string,
    @Body() body: any
  ): Promise<ApiResponse<any>> {
    const config = await this.aiTwinService.updateConfig(userId, body);
    return {
      success: true,
      data: config,
    };
  }

  @Post('twin/reply')
  async triggerAiTwinReply(
    @Body() body: { recipientUserId: string; senderUserId: string; message: string }
  ): Promise<ApiResponse<any>> {
    const reply = await this.aiTwinService.generateAutoReply(
      body.recipientUserId,
      body.senderUserId,
      body.message
    );
    return {
      success: true,
      data: reply,
    };
  }

  @Post('twin/schedule-callback')
  async scheduleCallback(
    @Body() body: { recipientUserId: string; requesterUserId: string; slot: string; communityId?: string }
  ): Promise<ApiResponse<any>> {
    const res = await this.aiTwinService.scheduleCallback(
      body.recipientUserId,
      body.requesterUserId,
      body.slot,
      body.communityId
    );
    return {
      success: true,
      data: res,
    };
  }
}

