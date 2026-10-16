import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Query,
  Param,
  Req,
  Res,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request, Response } from 'express';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { StorageService } from './storage.service.js';
import { JwtAuthGuard } from '../common/jwt-auth.guard.js';
import { CurrentUser } from '../common/current-user.decorator.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import {
  PresignedUrlRequestSchema,
  PresignedUrlRequest,
  PresignedUrlResponseDTO,
  AttachmentMetaDTO,
  ApiResponse,
  JwtPayload,
} from '@mivo/shared';

@Controller('api/v1/storage')
export class StorageController {
  constructor(private storageService: StorageService) {}

  @Post('presigned-url')
  @UseGuards(JwtAuthGuard)
  async getPresignedUrl(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(PresignedUrlRequestSchema)) body: PresignedUrlRequest
  ): Promise<ApiResponse<PresignedUrlResponseDTO>> {
    const result = await this.storageService.getPresignedUploadUrl(user.sub, body);
    return {
      success: true,
      data: result,
    };
  }

  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file: Express.Multer.File,
    @Query('category') category?: string
  ): Promise<ApiResponse<AttachmentMetaDTO>> {
    if (!file) {
      throw new BadRequestException({
        code: 'FILE_REQUIRED',
        message: 'No file provided in form upload',
      });
    }

    const result = await this.storageService.uploadFile(
      user.sub,
      file,
      category || 'attachments'
    );

    return {
      success: true,
      data: result,
    };
  }

  /**
   * On-demand FFmpeg video optimization and thumbnail generation endpoint
   */
  @Post('optimize-video')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async optimizeVideo(
    @UploadedFile() file?: Express.Multer.File,
    @Body('fileKey') fileKey?: string
  ): Promise<ApiResponse<any>> {
    if (file) {
      const result = await this.storageService.videoOptimizer.optimizeVideo(
        file.buffer,
        file.originalname
      );
      return {
        success: true,
        data: {
          isOptimized: result.isOptimized,
          originalSize: result.originalSize,
          optimizedSize: result.optimizedSize,
          savedBytes: result.savedBytes,
          hasPoster: !!result.posterBuffer,
        },
      };
    }
    if (fileKey) {
      const result = await this.storageService.optimizeExistingFile(fileKey);
      return {
        success: result.success,
        data: result,
      };
    }
    throw new BadRequestException({
      code: 'INVALID_INPUT',
      message: 'Either file upload or fileKey is required to optimize video',
    });
  }

  /**
   * Serves files with HTTP 206 Partial Content (Byte Range Requests) support
   * for instant seek, fast buffering, and zero lag in browser video/audio tags.
   */
  @Get('files/*path')
  async serveFile(
    @Param('path') pathParam: string | string[],
    @Req() req: Request,
    @Res() res: Response
  ) {
    const fileKey = Array.isArray(pathParam) ? pathParam.join('/') : pathParam;
    if (!fileKey) {
      throw new NotFoundException({ code: 'FILE_NOT_FOUND', message: 'File key missing' });
    }

    const localPath = this.storageService.getLocalFilePath(fileKey);
    if (!localPath) {
      throw new NotFoundException({ code: 'FILE_NOT_FOUND', message: 'File not found' });
    }

    const stat = fs.statSync(localPath);
    const fileSize = stat.size;
    const ext = path.extname(localPath).toLowerCase();

    // Map common media types for optimal playback headers
    const mimeTypes: Record<string, string> = {
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.mov': 'video/quicktime',
      '.ogg': 'video/ogg',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.pdf': 'application/pdf',
    };
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=86400');

    const range = req.headers.range;
    const isMedia = contentType.startsWith('video/') || contentType.startsWith('audio/');

    // HTTP 206 Partial Content Range Support
    if (isMedia && range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize || end >= fileSize) {
        res.status(416).setHeader('Content-Range', `bytes */${fileSize}`).end();
        return;
      }

      const chunkSize = end - start + 1;
      const fileStream = fs.createReadStream(localPath, { start, end });

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': contentType,
      });

      fileStream.pipe(res);
      return;
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', fileSize);
    return res.sendFile(localPath);
  }
}
