import { Module } from '@nestjs/common';
import { PermissionService } from './permission.service.js';
import { RolesController } from './roles.controller.js';

@Module({
  controllers: [RolesController],
  providers: [PermissionService],
  exports: [PermissionService],
})
export class RbacModule {}
