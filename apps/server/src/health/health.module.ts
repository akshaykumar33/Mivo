import { Module } from '@nestjs/common';
import { HealthController } from './health.controller.js';
import { KeepAliveService } from './keep-alive.service.js';
import { StorageModule } from '../storage/storage.module.js';

@Module({
  imports: [StorageModule],
  controllers: [HealthController],
  providers: [KeepAliveService],
  exports: [KeepAliveService],
})
export class HealthModule {}
