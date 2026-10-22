import { Module } from '@nestjs/common';
import { AiController } from './ai.controller.js';
import { AiService } from './ai.service.js';
import { AiTwinService } from './ai-twin.service.js';

@Module({
  controllers: [AiController],
  providers: [AiService, AiTwinService],
  exports: [AiService, AiTwinService],
})
export class AiModule {}

