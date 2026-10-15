import { z } from 'zod';

export const StorageCategoryEnum = z.enum(['attachments', 'avatars', 'banners', 'recordings', 'communities']);
export type StorageCategory = z.infer<typeof StorageCategoryEnum>;

export const PresignedUrlRequestSchema = z.object({
  filename: z.string().min(1, 'Filename is required').max(255),
  contentType: z.string().min(1, 'Content type is required'),
  fileSize: z.number().positive().max(52428800, 'File size cannot exceed 50MB'), // 50MB
  category: StorageCategoryEnum.default('attachments'),
});

export type PresignedUrlRequest = z.infer<typeof PresignedUrlRequestSchema>;

export interface PresignedUrlResponseDTO {
  uploadUrl: string;
  fileUrl: string;
  key: string;
  headers?: Record<string, string>;
}

export interface AttachmentMetaDTO {
  name: string;
  url: string;
  size: number;
  type: string;
  key?: string;
}
