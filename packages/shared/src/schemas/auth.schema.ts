import { z } from 'zod';

export const RegisterRequestSchema = z.object({
  email: z.string().email('Please provide a valid email address'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(32, 'Username cannot exceed 32 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, hyphens, and underscores'),
  displayName: z
    .string()
    .min(1, 'Display name is required')
    .max(64, 'Display name cannot exceed 64 characters'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .max(100, 'Password cannot exceed 100 characters'),
});

export const LoginRequestSchema = z.object({
  email: z.string().email('Please provide a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const UpdateProfileSchema = z.object({
  displayName: z.string().min(1).max(64).optional(),
  bio: z.string().max(256).optional(),
  avatarUrl: z.string().url().nullable().optional(),
  bannerUrl: z.string().url().nullable().optional(),
  customStatus: z.string().max(128).nullable().optional(),
  customStatusExpiresAt: z.string().nullable().optional(),
  status: z.enum(['ONLINE', 'IDLE', 'DND', 'OFFLINE']).optional(),
});

export const UpdateStatusSchema = z.object({
  status: z.enum(['ONLINE', 'IDLE', 'DND', 'OFFLINE']).optional(),
  customStatus: z.string().max(128).nullable().optional(),
  customStatusExpiresAt: z.string().nullable().optional(),
});

export const GuestLoginSchema = z.object({
  displayName: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(32, 'Name cannot exceed 32 characters')
    .optional(),
  avatarUrl: z.string().url().nullable().optional(),
});

export const UpgradeGuestSchema = z.object({
  email: z.string().email('Please provide a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .max(100, 'Password cannot exceed 100 characters'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(32, 'Username cannot exceed 32 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, hyphens, and underscores')
    .optional(),
  displayName: z.string().min(1).max(64).optional(),
});

export type RegisterInput = z.infer<typeof RegisterRequestSchema>;
export type LoginInput = z.infer<typeof LoginRequestSchema>;
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
export type UpdateStatusInput = z.infer<typeof UpdateStatusSchema>;
export type GuestLoginInput = z.infer<typeof GuestLoginSchema>;
export type UpgradeGuestInput = z.infer<typeof UpgradeGuestSchema>;

