import { describe, it, expect } from 'vitest';
import { RecordedSessionMeta } from '@/lib/recorder-manager';

export function generateRecordingFilename(roomName: string, date: Date = new Date()): string {
  const sanitized = roomName.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  const timestamp = date.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `mivo-recording-${sanitized}-${timestamp}.webm`;
}

export function buildSessionMeta(
  roomName: string,
  blob: Blob,
  cloudUrl?: string
): RecordedSessionMeta {
  const filename = generateRecordingFilename(roomName);
  return {
    filename,
    blob,
    downloadUrl: `blob:http://localhost:3000/${filename}`,
    cloudUrl,
  };
}

describe('In-Browser Meeting Recorder Manager', () => {
  it('generates standardized, sanitized ISO timestamp filenames for recording files', () => {
    const fixedDate = new Date('2026-10-26T12:30:45.000Z');
    const filename = generateRecordingFilename('Keynote & Architecture Sync!', fixedDate);

    expect(filename).toBe('mivo-recording-keynote---architecture-sync--2026-10-26T12-30-45.webm');
    expect(filename).toMatch(/^mivo-recording-[a-z0-9_-]+-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.webm$/);
  });

  it('constructs complete RecordedSessionMeta with local and optional cloud URLs', () => {
    const mockBlob = new Blob(['mock-webm-video-bytes'], { type: 'video/webm' });
    const meta = buildSessionMeta(
      'Townhall',
      mockBlob,
      'https://s3.amazonaws.com/mivo-bucket/recordings/townhall.webm'
    );

    expect(meta.filename).toContain('mivo-recording-townhall-');
    expect(meta.blob.type).toBe('video/webm');
    expect(meta.downloadUrl).toContain('blob:http://localhost:3000/');
    expect(meta.cloudUrl).toBe('https://s3.amazonaws.com/mivo-bucket/recordings/townhall.webm');
  });
});
