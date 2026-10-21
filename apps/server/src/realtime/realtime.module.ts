import { Module, forwardRef } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway.js';
import { PresenceService } from './presence.service.js';
import { AuthModule } from '../auth/auth.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { AiModule } from '../ai/ai.module.js';

@Module({
  imports: [AuthModule, forwardRef(() => NotificationsModule), forwardRef(() => AiModule)],
  providers: [RealtimeGateway, PresenceService],
  exports: [RealtimeGateway, PresenceService],
})
export class RealtimeModule {}
