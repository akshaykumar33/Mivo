import { Module } from '@nestjs/common';
import { StorageService } from './storage.service.js';
import { StorageController } from './storage.controller.js';
import { VideoOptimizerService } from './video-optimizer.service.js';

@Module({
  controllers: [StorageController],
  providers: [StorageService, VideoOptimizerService],
  exports: [StorageService, VideoOptimizerService],
})
export class StorageModule {}

