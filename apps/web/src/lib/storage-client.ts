import { api } from './api-client';
import {
  PresignedUrlRequest,
  PresignedUrlResponseDTO,
  AttachmentMetaDTO,
  StorageCategory,
} from '@mivo/shared';

export class StorageClient {
  /**
   * Uploads any file directly to Supabase Storage / S3 via presigned URL,
   * with automatic fallback to server-side multipart upload if client network or CORS restricts it.
   */
  async uploadFile(
    file: File,
    category: StorageCategory = 'attachments',
    onProgress?: (progress: number) => void
  ): Promise<AttachmentMetaDTO> {
    try {
      // 0. For video files, route directly to server multipart upload so FFmpeg can optimize with +faststart and generate poster
      const isVideo = file.type?.startsWith('video/') || /\.(mp4|webm|mov|mkv|avi|m4v|flv|wmv)$/i.test(file.name);
      if (isVideo) {
        return await this.uploadViaServer(file, category);
      }

      // 1. Request presigned URL from backend
      const presignedRes = await api.post<PresignedUrlResponseDTO>('/api/v1/storage/presigned-url', {
        filename: file.name,
        contentType: file.type || 'application/octet-stream',
        fileSize: file.size,
        category,
      });

      if (!presignedRes.success || !presignedRes.data) {
        throw new Error(presignedRes.error?.message || 'Failed to acquire upload authorization');
      }

      const { uploadUrl, fileUrl, key } = presignedRes.data;

      // 2. If it's a direct S3 / Supabase presigned URL (starts with http)
      if (uploadUrl.startsWith('http')) {
        try {
          const s3UploadRes = await fetch(uploadUrl, {
            method: 'PUT',
            headers: {
              'Content-Type': file.type || 'application/octet-stream',
            },
            body: file,
          });

          if (s3UploadRes.ok) {
            onProgress?.(100);
            return {
              name: file.name,
              url: fileUrl,
              size: file.size,
              type: file.type,
              key,
            };
          }
          console.warn(`Presigned PUT to S3 returned HTTP ${s3UploadRes.status}. Falling back to server upload.`);
        } catch (s3Err) {
          console.warn('Presigned upload failed due to network/CORS, falling back to server-side upload:', s3Err);
        }
      }

      // 3. Fallback: Server-side multipart upload
      return await this.uploadViaServer(file, category);
    } catch (err: any) {
      console.warn('Direct upload authorization failed, using direct multipart upload:', err);
      return await this.uploadViaServer(file, category);
    }
  }

  /**
   * Direct multipart form-data upload to server
   */
  async uploadViaServer(file: File, category: StorageCategory = 'attachments'): Promise<AttachmentMetaDTO> {
    const formData = new FormData();
    formData.append('file', file);

    let token = api.getAccessToken();
    if (!token && typeof window !== 'undefined') {
      token = localStorage.getItem('mivo_access_token');
    }
    if (!token) {
      token = await api.refreshToken();
    }

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    let res = await fetch(`${baseUrl}/api/v1/storage/upload?category=${category}`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: 'include',
      body: formData,
    });

    // If 401 Unauthorized, attempt token refresh and retry once
    if (res.status === 401) {
      const refreshedToken = await api.refreshToken();
      if (refreshedToken) {
        res = await fetch(`${baseUrl}/api/v1/storage/upload?category=${category}`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${refreshedToken}`,
          },
          credentials: 'include',
          body: formData,
        });
      }
    }

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Upload failed: ${res.statusText} (${errText})`);
    }

    const json = await res.json();
    if (!json.success || !json.data) {
      throw new Error(json.error?.message || 'Server upload failed');
    }

    return json.data;
  }

  formatBytes(bytes: number, decimals = 1): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  }

  isImage(type: string): boolean {
    return type.startsWith('image/');
  }

  isVideo(type: string): boolean {
    return type.startsWith('video/');
  }

  isAudio(type: string): boolean {
    return type.startsWith('audio/');
  }
}

export const storageClient = new StorageClient();
