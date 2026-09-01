/**
 * Mivo In-Browser Meeting Recorder Manager
 * Captures live room audio and video streams using HTML5 MediaRecorder API
 */

export class RecorderManager {
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private isRecording = false;

  async startRecording(streamToRecord?: MediaStream | null): Promise<boolean> {
    try {
      this.recordedChunks = [];
      let captureStream = streamToRecord;

      if (!captureStream) {
        // Capture user media / display screen
        captureStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });
      }

      const mimeType = MediaRecorder.isTypeSupported('video/webm; codecs=vp9,opus')
        ? 'video/webm; codecs=vp9,opus'
        : 'video/webm';

      this.mediaRecorder = new MediaRecorder(captureStream, { mimeType });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        this.downloadRecording();
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

  private downloadRecording() {
    if (this.recordedChunks.length === 0) return;

    const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `mivo-meeting-recording-${Date.now()}.webm`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 100);
  }

  getRecordingStatus(): boolean {
    return this.isRecording;
  }
}

export const recorderManager = new RecorderManager();
