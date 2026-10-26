import { describe, it, expect } from 'vitest';

export function isVideoForOptimization(fileName: string, mimeType?: string): boolean {
  if (mimeType && mimeType.startsWith('video/')) return true;
  return /\.(mp4|webm|mov|mkv|avi|m4v|flv|wmv)$/i.test(fileName);
}

export function generatePosterFallback(videoUrl: string): string {
  // If videoUrl has an extension, replace it with .poster.jpg
  return videoUrl.replace(/\.(mp4|webm|mov|mkv|avi|m4v)$/i, '.poster.jpg');
}

export function buildFaststartHeader(isOptimized: boolean): Record<string, string> {
  return {
    'X-FFmpeg-Faststart': isOptimized ? 'moov-at-start' : 'moov-at-end',
    'Accept-Ranges': 'bytes',
  };
}

describe('Video Storage Optimization & Faststart Streaming', () => {
  it('detects video uploads requiring server-side FFmpeg +faststart optimization', () => {
    expect(isVideoForOptimization('screen_recording.mp4', 'video/mp4')).toBe(true);
    expect(isVideoForOptimization('webinar.webm')).toBe(true);
    expect(isVideoForOptimization('presentation.mov')).toBe(true);
    expect(isVideoForOptimization('report.pdf', 'application/pdf')).toBe(false);
    expect(isVideoForOptimization('audio.mp3', 'audio/mpeg')).toBe(false);
  });

  it('generates predictable companion poster preview frame URLs for video assets', () => {
    const videoUrl = 'https://s3.amazonaws.com/mivo-bucket/attachments/demo-recording.mp4';
    const posterUrl = generatePosterFallback(videoUrl);
    expect(posterUrl).toBe('https://s3.amazonaws.com/mivo-bucket/attachments/demo-recording.poster.jpg');
  });

  it('includes byte-range seeking and faststart response headers for smooth playback', () => {
    const optimizedHeaders = buildFaststartHeader(true);
    expect(optimizedHeaders['X-FFmpeg-Faststart']).toBe('moov-at-start');
    expect(optimizedHeaders['Accept-Ranges']).toBe('bytes');

    const unoptimizedHeaders = buildFaststartHeader(false);
    expect(unoptimizedHeaders['X-FFmpeg-Faststart']).toBe('moov-at-end');
  });
});
