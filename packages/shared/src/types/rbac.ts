import { PermissionKey } from '../constants/permissions.js';

export interface PermissionDTO {
  id: string;
  key: PermissionKey;
  name: string;
  category: string;
  description: string | null;
}

export interface RoleDTO {
  id: string;
  communityId: string;
  name: string;
  color: string | null;
  position: number;
  isDefault: boolean;
  isSystem: boolean;
  permissions: PermissionKey[];
}
