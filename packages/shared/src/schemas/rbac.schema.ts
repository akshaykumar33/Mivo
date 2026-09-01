import { z } from 'zod';
import { PERMISSIONS } from '../constants/permissions.js';

export const CreateRoleSchema = z.object({
  name: z.string().min(1, 'Role name is required').max(32, 'Role name cannot exceed 32 characters'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex code (e.g. #7C3AED)').nullable().optional(),
  position: z.number().int().nonnegative().optional(),
  permissions: z.array(z.string()).default([]),
});

export const UpdateRoleSchema = CreateRoleSchema.partial();

export const AssignMemberRoleSchema = z.object({
  roleId: z.string().uuid('Valid role ID is required'),
});

export type CreateRoleInput = z.infer<typeof CreateRoleSchema>;
export type UpdateRoleInput = z.infer<typeof UpdateRoleSchema>;
export type AssignMemberRoleInput = z.infer<typeof AssignMemberRoleSchema>;
