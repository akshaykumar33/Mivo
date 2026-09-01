import { SetMetadata } from '@nestjs/common';
import { PermissionKey } from '@mivo/shared';

export const PERMISSIONS_KEY = 'required_permissions';
export const RequirePermissions = (...permissions: PermissionKey[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
