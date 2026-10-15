import { Module } from '@nestjs/common';
import { RoomsService } from './rooms.service.js';
import { RoomsController, ChannelRoomsController } from './rooms.controller.js';

@Module({
  controllers: [RoomsController, ChannelRoomsController],
  providers: [RoomsService],
  exports: [RoomsService],
})
export class RoomsModule {}
