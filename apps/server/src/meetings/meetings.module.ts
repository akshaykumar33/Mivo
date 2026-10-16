import { Module, forwardRef } from '@nestjs/common';
import { MeetingsController } from './meetings.controller.js';
import { MeetingsService } from './meetings.service.js';
import { RealtimeModule } from '../realtime/realtime.module.js';
import { MessagesModule } from '../messages/messages.module.js';
import { ConversationsModule } from '../conversations/conversations.module.js';

@Module({
  imports: [
    forwardRef(() => RealtimeModule),
    forwardRef(() => MessagesModule),
    forwardRef(() => ConversationsModule),
  ],
  controllers: [MeetingsController],
  providers: [MeetingsService],
  exports: [MeetingsService],
})
export class MeetingsModule {}
