import { Module, forwardRef } from '@nestjs/common';
import { MessagesController } from './messages.controller.js';
import { MessageRetentionController } from './message-retention.controller.js';
import { MessagesService } from './messages.service.js';
import { MessageRetentionService } from './message-retention.service.js';
import { CrdtSyncService } from './crdt-sync.service.js';
import { RealtimeModule } from '../realtime/realtime.module.js';

@Module({
  imports: [forwardRef(() => RealtimeModule)],
  controllers: [MessagesController, MessageRetentionController],
  providers: [MessagesService, MessageRetentionService, CrdtSyncService],
  exports: [MessagesService, MessageRetentionService, CrdtSyncService],
})
export class MessagesModule {}

