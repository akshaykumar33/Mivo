import { Module, forwardRef } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway.js';
import { PresenceService } from './presence.service.js';
import { SfuEngineService } from './sfu/sfu-engine.service.js';
import { E2eeService } from './e2ee/e2ee.service.js';
import { AmbientFocusService } from './focus/ambient-focus.service.js';
import { MiniAppsService } from './activities/mini-apps.service.js';
import { AnonymousConnectService } from './anonymous/anonymous-connect.service.js';
import { AuthModule } from '../auth/auth.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { AiModule } from '../ai/ai.module.js';

@Module({
  imports: [AuthModule, forwardRef(() => NotificationsModule), forwardRef(() => AiModule)],
  providers: [
    RealtimeGateway,
    PresenceService,
    SfuEngineService,
    E2eeService,
    AmbientFocusService,
    MiniAppsService,
    AnonymousConnectService,
  ],
  exports: [
    RealtimeGateway,
    PresenceService,
    SfuEngineService,
    E2eeService,
    AmbientFocusService,
    MiniAppsService,
    AnonymousConnectService,
  ],
})
export class RealtimeModule {}
