import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PresignedUrlRequest, PresignedUrlResponseDTO, AttachmentMetaDTO } from '@mivo/shared';
import * as fs from 'node:fs';
import * as path from 'node:path';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private s3Client: S3Client | null = null;
  private bucketName: string = 'mivo-media';
  private localUploadsDir: string;
  private isS3Configured: boolean = false;

  constructor() {
    this.localUploadsDir = path.resolve(process.cwd(), 'uploads');
    if (!fs.existsSync(this.localUploadsDir)) {
      fs.mkdirSync(this.localUploadsDir, { recursive: true });
    }
  }

  async onModuleInit() {
    const s3Endpoint = process.env.S3_ENDPOINT;
    const s3AccessKey = process.env.S3_ACCESS_KEY;
    const s3SecretKey = process.env.S3_SECRET_KEY;
    const s3Region = process.env.S3_REGION || 'us-east-1';
    this.bucketName = process.env.S3_BUCKET_NAME || 'mivo-media';

    if (s3Endpoint && s3AccessKey && s3SecretKey) {
      try {
        this.s3Client = new S3Client({
          endpoint: s3Endpoint,
          region: s3Region,
          credentials: {
            accessKeyId: s3AccessKey,
            secretAccessKey: s3SecretKey,
          },
          forcePathStyle: true,
        });
        this.isS3Configured = true;
        this.logger.log(`Initialized S3 storage client for endpoint: ${s3Endpoint} (bucket: ${this.bucketName})`);
      } catch (err: any) {
        this.logger.warn(`Could not initialize S3 client: ${err.message}. Local storage fallback enabled.`);
      }
    } else {
      this.logger.warn('S3 credentials not fully configured in environment. Using local storage fallback.');
    }
  }

  /**
   * Generates a presigned PUT URL for direct client-to-storage upload,
   * with automatic fallback to server upload endpoint.
   */
  async getPresignedUploadUrl(
    userId: string,
    input: PresignedUrlRequest
  ): Promise<PresignedUrlResponseDTO> {
    const cleanFilename = path.basename(input.filename).replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `${input.category}/${userId}/${Date.now()}-${cleanFilename}`;

    if (this.isS3Configured && this.s3Client) {
      try {
        const command = new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          ContentType: input.contentType,
        });

        // Expires in 15 minutes (900s)
        const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 900 });

        // Build publicly accessible download URL
        let fileUrl: string;
        const s3Endpoint = process.env.S3_ENDPOINT || '';

        if (s3Endpoint.includes('supabase.co')) {
          // Supabase Storage Public URL convention
          const baseUrl = s3Endpoint.replace(/\/storage\/v1\/s3\/?$/, '');
          fileUrl = `${baseUrl}/storage/v1/object/public/${this.bucketName}/${key}`;
        } else {
          // Standard S3 / MinIO path
          fileUrl = `${s3Endpoint}/${this.bucketName}/${key}`;
        }

        return {
          uploadUrl,
          fileUrl,
          key,
        };
      } catch (err: any) {
        this.logger.warn(`Failed generating S3 presigned URL: ${err.message}. Providing server upload fallback.`);
      }
    }

    // Server-managed fallback URL
    const uploadUrl = `/api/v1/storage/upload?category=${input.category}&key=${encodeURIComponent(key)}`;
    const fileUrl = `/api/v1/storage/files/${key}`;

    return {
      uploadUrl,
      fileUrl,
      key,
    };
  }

  /**
   * Direct server-side upload handler (used when client prefers multipart form upload
   * or when presigned CORS encounters restrictions).
   */
  async uploadFile(
    userId: string,
    file: Express.Multer.File,
    category = 'attachments'
  ): Promise<AttachmentMetaDTO> {
    const cleanFilename = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_');
    const timestamp = Date.now();
    const filenameWithTimestamp = `${timestamp}-${cleanFilename}`;
    const key = `${category}/${userId}/${filenameWithTimestamp}`;

    let uploadedToS3 = false;
    let fileUrl = '';

    if (this.isS3Configured && this.s3Client) {
      try {
        await this.s3Client.send(
          new PutObjectCommand({
            Bucket: this.bucketName,
            Key: key,
            Body: file.buffer,
            ContentType: file.mimetype,
          })
        );
        uploadedToS3 = true;

        const s3Endpoint = process.env.S3_ENDPOINT || '';
        if (s3Endpoint.includes('supabase.co')) {
          const baseUrl = s3Endpoint.replace(/\/storage\/v1\/s3\/?$/, '');
          fileUrl = `${baseUrl}/storage/v1/object/public/${this.bucketName}/${key}`;
        } else {
          fileUrl = `${s3Endpoint}/${this.bucketName}/${key}`;
        }
      } catch (err: any) {
        this.logger.warn(`Direct S3 upload failed: ${err.message}. Falling back to local storage.`);
      }
    }

    if (!uploadedToS3) {
      // Save locally
      const targetDir = path.join(this.localUploadsDir, category, userId);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      const localFilePath = path.join(targetDir, filenameWithTimestamp);
      fs.writeFileSync(localFilePath, file.buffer);
      fileUrl = `/api/v1/storage/files/${key}`;
    }

    return {
      name: file.originalname,
      url: fileUrl,
      size: file.size,
      type: file.mimetype,
      key,
    };
  }

  /**
   * Retrieves a locally buffered file by key.
   */
  getLocalFilePath(key: string): string | null {
    if (!key || typeof key !== 'string') return null;
    const safeKey = key.replace(/\.\./g, '');
    const localPath = path.join(this.localUploadsDir, safeKey);
    if (fs.existsSync(localPath)) {
      return localPath;
    }
    return null;
  }
}
