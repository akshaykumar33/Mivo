import { Module } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway.js';
import { PresenceService } from './presence.service.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [AuthModule],
  providers: [RealtimeGateway, PresenceService],
  exports: [RealtimeGateway, PresenceService],
})
export class RealtimeModule {}
