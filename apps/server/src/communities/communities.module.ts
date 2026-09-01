import { Module } from '@nestjs/common';
import { CommunitiesService } from './communities.service.js';
import { CommunitiesController } from './communities.controller.js';
import { RbacModule } from '../rbac/rbac.module.js';

@Module({
  imports: [RbacModule],
  controllers: [CommunitiesController],
  providers: [CommunitiesService],
  exports: [CommunitiesService],
})
export class CommunitiesModule {}
