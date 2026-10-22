import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { SandboxService } from './sandbox.service';
import { SandboxExecutionRequest, SandboxExecutionResponse, ApiResponse } from '@mivo/shared';

@Controller('api/v1/sandbox')
export class SandboxController {
  constructor(private readonly sandboxService: SandboxService) {}

  @Post('execute')
  @HttpCode(HttpStatus.OK)
  async executeCode(@Body() body: SandboxExecutionRequest): Promise<ApiResponse<SandboxExecutionResponse>> {
    const result = await this.sandboxService.executeCode(body);
    return {
      success: true,
      data: result,
    };
  }
}
