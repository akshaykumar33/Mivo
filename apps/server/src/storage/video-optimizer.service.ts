import { Injectable, Logger } from '@nestjs/common';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

export interface VideoOptimizationResult {
  optimizedBuffer: Buffer;
  posterBuffer?: Buffer;
  isOptimized: boolean;
  originalSize: number;
  optimizedSize: number;
  savedBytes: number;
  format: string;
  duration?: number;
}

@Injectable()
export class VideoOptimizerService {
  private readonly logger = new Logger(VideoOptimizerService.name);
  private isFfmpegAvailable = false;

  constructor() {
    try {
      if (ffmpegInstaller && ffmpegInstaller.path) {
        ffmpeg.setFfmpegPath(ffmpegInstaller.path);
        this.isFfmpegAvailable = true;
        this.logger.log(`FFmpeg initialized successfully at: ${ffmpegInstaller.path}`);
      }
    } catch (err: any) {
      this.logger.warn(`Could not initialize FFmpeg: ${err.message}. Fast video optimization disabled.`);
    }
  }

  /**
   * Check if a file is a video by MIME type or file extension
   */
  isVideo(mimeType?: string, fileName?: string): boolean {
    if (mimeType && mimeType.startsWith('video/')) return true;
    if (fileName) {
      const ext = path.extname(fileName).toLowerCase().replace('.', '');
      return ['mp4', 'webm', 'mov', 'mkv', 'avi', 'm4v', 'flv', 'wmv'].includes(ext);
    }
    return false;
  }

  /**
   * Optimizes a video using FFmpeg for instant web streaming (+faststart)
   * Relocates the MOOV atom to the beginning of the MP4 container so the browser
   * can begin playback instantaneously without downloading the entire file.
   * Also extracts a crisp, low-overhead poster thumbnail frame.
   */
  async optimizeVideo(
    inputBuffer: Buffer,
    fileName: string
  ): Promise<VideoOptimizationResult> {
    const originalSize = inputBuffer.length;

    if (!this.isFfmpegAvailable) {
      this.logger.warn('FFmpeg binary not available; skipping video optimization.');
      return {
        optimizedBuffer: inputBuffer,
        isOptimized: false,
        originalSize,
        optimizedSize: originalSize,
        savedBytes: 0,
        format: path.extname(fileName).replace('.', '') || 'mp4',
      };
    }

    const tmpDir = os.tmpdir();
    const timestamp = Date.now();
    const safeExt = path.extname(fileName) || '.mp4';
    const inputPath = path.join(tmpDir, `mivo_input_${timestamp}${safeExt}`);
    const outputPath = path.join(tmpDir, `mivo_faststart_${timestamp}.mp4`);
    const posterPath = path.join(tmpDir, `mivo_poster_${timestamp}.jpg`);

    try {
      // 1. Write buffer to temp file
      fs.writeFileSync(inputPath, inputBuffer);

      // 2. Run FFmpeg faststart transcoding / remuxing
      await new Promise<void>((resolve, reject) => {
        ffmpeg(inputPath)
          .outputOptions([
            '-c:v libx264',
            '-preset veryfast',
            '-crf 23',
            '-pix_fmt yuv420p',
            '-c:a aac',
            '-b:a 128k',
            '-movflags +faststart', // Relocate MOOV atom to beginning for instant web streaming
          ])
          .output(outputPath)
          .on('end', () => resolve())
          .on('error', (err) => {
            this.logger.warn(`Full transcode failed (${err.message}). Attempting fast copy with +faststart...`);
            // Fallback: fast copy with faststart flag
            ffmpeg(inputPath)
              .outputOptions(['-c copy', '-movflags +faststart'])
              .output(outputPath)
              .on('end', () => resolve())
              .on('error', (copyErr) => reject(copyErr))
              .run();
          })
          .run();
      });

      // 3. Extract high-res poster thumbnail frame at 0.5s
      let posterBuffer: Buffer | undefined;
      try {
        await new Promise<void>((resolve, reject) => {
          ffmpeg(outputPath)
            .screenshots({
              timestamps: ['00:00:00.5'],
              filename: path.basename(posterPath),
              folder: path.dirname(posterPath),
              size: '640x?',
            })
            .on('end', () => resolve())
            .on('error', (thumbErr) => {
              this.logger.warn(`Poster extraction failed: ${thumbErr.message}`);
              resolve(); // Don't fail the entire optimization if thumbnail fails
            });
        });

        if (fs.existsSync(posterPath)) {
          posterBuffer = fs.readFileSync(posterPath);
        }
      } catch (thumbErr) {
        this.logger.warn(`Poster frame thumbnail could not be extracted: ${thumbErr}`);
      }

      // 4. Read optimized output
      if (fs.existsSync(outputPath)) {
        const optimizedBuffer = fs.readFileSync(outputPath);
        const optimizedSize = optimizedBuffer.length;
        const savedBytes = Math.max(0, originalSize - optimizedSize);

        this.logger.log(
          `FFmpeg optimized "${fileName}": ${originalSize} -> ${optimizedSize} bytes ` +
          `(MOOV +faststart enabled, saved ${((savedBytes / originalSize) * 100).toFixed(1)}%)`
        );

        return {
          optimizedBuffer,
          posterBuffer,
          isOptimized: true,
          originalSize,
          optimizedSize,
          savedBytes,
          format: 'mp4',
        };
      }
    } catch (err: any) {
      this.logger.warn(`FFmpeg video optimization failed: ${err.message}. Retaining original video.`);
    } finally {
      // Cleanup temporary files safely
      [inputPath, outputPath, posterPath].forEach((file) => {
        try {
          if (fs.existsSync(file)) fs.unlinkSync(file);
        } catch {}
      });
    }

    return {
      optimizedBuffer: inputBuffer,
      isOptimized: false,
      originalSize,
      optimizedSize: originalSize,
      savedBytes: 0,
      format: path.extname(fileName).replace('.', '') || 'mp4',
    };
  }
}
