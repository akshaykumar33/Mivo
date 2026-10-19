import { Module, forwardRef } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { UsersController } from './users.controller.js';
import { RealtimeModule } from '../realtime/realtime.module.js';

@Module({
  imports: [forwardRef(() => RealtimeModule)],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}

