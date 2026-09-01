import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { CommunitiesModule } from './communities/communities.module.js';
import { ChannelsModule } from './channels/channels.module.js';
import { RoomsModule } from './rooms/rooms.module.js';
import { RbacModule } from './rbac/rbac.module.js';
import { RealtimeModule } from './realtime/realtime.module.js';
import { MessagesModule } from './messages/messages.module.js';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    RbacModule,
    CommunitiesModule,
    ChannelsModule,
    RoomsModule,
    RealtimeModule,
    MessagesModule,
  ],
})
export class AppModule {}
