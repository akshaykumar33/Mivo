import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { PermissionService } from './permission.service.js';
import { JwtAuthGuard } from '../common/jwt-auth.guard.js';
import { PermissionsGuard } from '../common/permissions.guard.js';
import { RequirePermissions } from '../common/require-permissions.decorator.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import {
  PERMISSIONS,
  CreateRoleSchema,
  UpdateRoleSchema,
  AssignMemberRoleSchema,
  CreateRoleInput,
  UpdateRoleInput,
  AssignMemberRoleInput,
  ApiResponse,
  RoleDTO,
} from '@mivo/shared';

@Controller('api/v1/communities/:communityId/roles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RolesController {
  constructor(private permissionService: PermissionService) {}

  @Get()
  async getRoles(@Param('communityId') communityId: string): Promise<ApiResponse<RoleDTO[]>> {
    const roles = await this.permissionService.getCommunityRoles(communityId);
    return {
      success: true,
      data: roles,
    };
  }

  @Post()
  @RequirePermissions(PERMISSIONS.ROLE_MANAGE)
  @UsePipes(new ZodValidationPipe(CreateRoleSchema))
  async createRole(
    @Param('communityId') communityId: string,
    @Body() body: CreateRoleInput
  ): Promise<ApiResponse<RoleDTO>> {
    const role = await this.permissionService.createRole(communityId, body);
    return {
      success: true,
      data: role,
    };
  }

  @Patch(':roleId')
  @RequirePermissions(PERMISSIONS.ROLE_MANAGE)
  @UsePipes(new ZodValidationPipe(UpdateRoleSchema))
  async updateRole(
    @Param('roleId') roleId: string,
    @Body() body: UpdateRoleInput
  ): Promise<ApiResponse<RoleDTO>> {
    const role = await this.permissionService.updateRole(roleId, body);
    return {
      success: true,
      data: role,
    };
  }

  @Post('members/:userId')
  @RequirePermissions(PERMISSIONS.ROLE_MANAGE)
  @UsePipes(new ZodValidationPipe(AssignMemberRoleSchema))
  async assignRole(
    @Param('communityId') communityId: string,
    @Param('userId') userId: string,
    @Body() body: AssignMemberRoleInput
  ): Promise<ApiResponse<{ message: string }>> {
    await this.permissionService.assignMemberRole(communityId, userId, body.roleId);
    return {
      success: true,
      data: { message: 'Role assigned successfully' },
    };
  }
}
