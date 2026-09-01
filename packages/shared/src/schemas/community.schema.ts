import { z } from 'zod';

export const CreateCommunitySchema = z.object({
  name: z.string().min(2, 'Community name must be at least 2 characters').max(64, 'Community name cannot exceed 64 characters'),
  slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .max(64, 'Slug cannot exceed 64 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
  description: z.string().max(500, 'Description cannot exceed 500 characters').optional(),
  iconUrl: z.string().url().nullable().optional(),
  bannerUrl: z.string().url().nullable().optional(),
  visibility: z.enum(['PUBLIC', 'PRIVATE', 'INVITE_ONLY']).default('PUBLIC'),
});

export const UpdateCommunitySchema = CreateCommunitySchema.partial();

export const UpdateMemberNicknameSchema = z.object({
  nickname: z.string().max(64).nullable(),
});

export type CreateCommunityInput = z.infer<typeof CreateCommunitySchema>;
export type UpdateCommunityInput = z.infer<typeof UpdateCommunitySchema>;
export type UpdateMemberNicknameInput = z.infer<typeof UpdateMemberNicknameSchema>;
