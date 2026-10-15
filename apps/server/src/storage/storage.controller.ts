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
  Res,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
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

  @Get('files/*path')
  async serveFile(@Param('path') pathParam: string, @Res() res: Response) {
    const fileKey = pathParam;
    if (!fileKey) {
      throw new NotFoundException({ code: 'FILE_NOT_FOUND', message: 'File key missing' });
    }

    const localPath = this.storageService.getLocalFilePath(fileKey);
    if (!localPath) {
      throw new NotFoundException({ code: 'FILE_NOT_FOUND', message: 'File not found' });
    }

    return res.sendFile(localPath);
  }
}
