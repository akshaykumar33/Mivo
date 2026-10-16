/**
 * Mivo In-Browser Meeting Recorder Manager
 * Captures live room audio and video streams using HTML5 MediaRecorder API,
 * downloads locally, and automatically uploads to Supabase S3 Storage.
 */

import { storageClient } from './storage-client';

export interface RecordedSessionMeta {
  filename: string;
  blob: Blob;
  downloadUrl: string;
  cloudUrl?: string;
}

export class RecorderManager {
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private isRecording = false;
  private onRecordingUploadedCallback?: (meta: RecordedSessionMeta) => void;

  onRecordingComplete(callback: (meta: RecordedSessionMeta) => void) {
    this.onRecordingUploadedCallback = callback;
  }

  async startRecording(streamToRecord?: MediaStream | null): Promise<boolean> {
    try {
      this.recordedChunks = [];
      let captureStream = streamToRecord;

      if (!captureStream || captureStream.getTracks().length === 0) {
        // Fallback: try capturing screen display or create composite stream
        try {
          captureStream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: true,
          });
        } catch {
          // If denied, create live canvas recording stream
          const canvas = document.createElement('canvas');
          canvas.width = 1280;
          canvas.height = 720;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#06080F';
            ctx.fillRect(0, 0, 1280, 720);
            ctx.fillStyle = '#5E5CE6';
            ctx.font = 'bold 36px Inter, sans-serif';
            ctx.fillText('Mivo Meeting Session Recording', 300, 360);
          }
          captureStream = canvas.captureStream(30);
        }
      }

      const mimeType = MediaRecorder.isTypeSupported('video/webm; codecs=vp9,opus')
        ? 'video/webm; codecs=vp9,opus'
        : MediaRecorder.isTypeSupported('video/webm')
        ? 'video/webm'
        : 'video/mp4';

      this.mediaRecorder = new MediaRecorder(captureStream, { mimeType });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = async () => {
        await this.handleRecordingFinished();
      };

      this.mediaRecorder.start(1000);
      this.isRecording = true;
      return true;
    } catch (e) {
      console.warn('Failed to start in-browser meeting recording:', e);
      return false;
    }
  }

  stopRecording() {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.isRecording = false;
    }
  }

  private async handleRecordingFinished() {
    if (this.recordedChunks.length === 0) return;

    const filename = `mivo-meeting-${Date.now()}.webm`;
    const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
    const downloadUrl = URL.createObjectURL(blob);

    // 1. Local browser download
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = downloadUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
    }, 100);

    const meta: RecordedSessionMeta = {
      filename,
      blob,
      downloadUrl,
    };

    // 2. Cloud Upload to Supabase Storage / S3
    try {
      const file = new File([blob], filename, { type: 'video/webm' });
      const cloudUpload = await storageClient.uploadFile(file, 'recordings');
      meta.cloudUrl = cloudUpload.url;
      console.log('✅ Meeting recording backed up to Supabase S3 Storage:', cloudUpload.url);
    } catch (err) {
      console.warn('Could not back up recording to cloud storage:', err);
    }

    if (this.onRecordingUploadedCallback) {
      this.onRecordingUploadedCallback(meta);
    }
  }

  getRecordingStatus(): boolean {
    return this.isRecording;
  }
}

export const recorderManager = new RecorderManager();
