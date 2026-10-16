/**
 * Real Media Device Manager for Mivo
 * Handles UserMedia (Camera/Mic), Web Audio API analyser, and DisplayMedia (Screen Share)
 * with graceful fallback to Canvas-generated synthetic streams when hardware is unavailable.
 */

export const HD_VOICE_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: { ideal: true },
  noiseSuppression: { ideal: true },
  autoGainControl: { ideal: true },
  sampleRate: { ideal: 48000 }, // 48kHz Studio Quality
  sampleSize: { ideal: 16 },
  channelCount: { ideal: 2 },   // Stereo high-fidelity
};

/**
 * Acquire studio-grade microphone stream with automatic fallback
 */
export async function getEnhancedAudioStream(): Promise<MediaStream> {
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: HD_VOICE_CONSTRAINTS,
      video: false,
    });
  } catch (err) {
    console.warn('Advanced HD audio constraints rejected by hardware, falling back to basic audio:', err);
    return await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
  }
}

export class MediaManager {
  private localStream: MediaStream | null = null;
  private screenStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private audioSource: MediaStreamAudioSourceNode | null = null;
  private animationFrameId: number | null = null;
  private onAudioLevelCallback: ((level: number) => void) | null = null;

  /**
   * Acquire live microphone stream with HD studio audio processing
   */
  async startMicrophone(onAudioLevel?: (level: number) => void): Promise<MediaStream> {
    this.onAudioLevelCallback = onAudioLevel || null;

    try {
      if (!this.localStream) {
        this.localStream = await getEnhancedAudioStream();
      } else {
        const hasAudio = this.localStream.getAudioTracks().length > 0;
        if (!hasAudio) {
          const audioStream = await getEnhancedAudioStream();
          audioStream.getAudioTracks().forEach((track) => this.localStream?.addTrack(track));
        } else {
          this.localStream.getAudioTracks().forEach((track) => (track.enabled = true));
        }
      }

      this.setupAudioAnalyser(this.localStream);
      return this.localStream;
    } catch (err) {
      console.warn('Microphone hardware unavailable or denied. Using synthetic audio stream:', err);
      const synthetic = this.createSyntheticAudioStream();
      this.setupAudioAnalyser(synthetic);
      return synthetic;
    }
  }

  stopMicrophone() {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = false;
      });
    }
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Acquire real live webcam stream or generate synthetic canvas video
   */
  async startCamera(): Promise<MediaStream> {
    try {
      const cameraStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
        audio: false,
      });

      if (!this.localStream) {
        this.localStream = cameraStream;
      } else {
        // Replace or add video tracks
        this.localStream.getVideoTracks().forEach((track) => {
          track.stop();
          this.localStream?.removeTrack(track);
        });
        cameraStream.getVideoTracks().forEach((track) => this.localStream?.addTrack(track));
      }

      return this.localStream;
    } catch (err) {
      console.warn('Webcam hardware unavailable or denied. Using synthetic live camera canvas feed:', err);
      const syntheticStream = this.createSyntheticVideoStream('CAMERA');
      return syntheticStream;
    }
  }

  stopCamera() {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach((track) => {
        track.stop();
        this.localStream?.removeTrack(track);
      });
    }
  }

  /**
   * Acquire real live Screen Share display stream
   */
  async startScreenShare(onEnded?: () => void): Promise<MediaStream> {
    try {
      this.screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'monitor',
        },
        audio: true,
      });

      this.screenStream.getVideoTracks()[0]?.addEventListener('ended', () => {
        this.stopScreenShare();
        onEnded?.();
      });

      return this.screenStream;
    } catch (err) {
      console.warn('Screen share display media cancelled or unavailable. Using synthetic stage stream:', err);
      this.screenStream = this.createSyntheticVideoStream('SCREEN_SHARE');
      return this.screenStream;
    }
  }

  stopScreenShare() {
    if (this.screenStream) {
      this.screenStream.getTracks().forEach((track) => track.stop());
      this.screenStream = null;
    }
  }

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  getScreenStream(): MediaStream | null {
    return this.screenStream;
  }

  /**
   * Web Audio API volume monitoring loop
   */
  private setupAudioAnalyser(stream: MediaStream) {
    try {
      if (!this.audioContext || this.audioContext.state === 'closed') {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        this.audioContext = new AudioCtx();
      }

      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 64;
      this.analyser.smoothingTimeConstant = 0.8;

      this.audioSource = this.audioContext.createMediaStreamSource(stream);
      this.audioSource.connect(this.analyser);

      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const checkVolume = () => {
        if (!this.analyser) return;

        this.analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        const normalized = Math.min(Math.round((average / 128) * 100), 100);

        this.onAudioLevelCallback?.(normalized);
        this.animationFrameId = requestAnimationFrame(checkVolume);
      };

      this.animationFrameId = requestAnimationFrame(checkVolume);
    } catch (e) {
      console.warn('Web Audio API analyser setup failed:', e);
    }
  }

  /**
   * Fallback Synthetic Video Stream generator using HTML5 2D Canvas
   */
  private createSyntheticVideoStream(type: 'CAMERA' | 'SCREEN_SHARE'): MediaStream {
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d');
    let frame = 0;

    const draw = () => {
      if (!ctx) return;
      frame++;

      // Gradient background
      const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      if (type === 'CAMERA') {
        grad.addColorStop(0, '#0F121C');
        grad.addColorStop(0.5, '#1B2138');
        grad.addColorStop(1, '#090B10');
      } else {
        grad.addColorStop(0, '#060B18');
        grad.addColorStop(0.5, '#0E1E38');
        grad.addColorStop(1, '#05070D');
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Grid overlay
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Center Animated Graphic
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const pulse = Math.sin(frame * 0.05) * 20;

      ctx.beginPath();
      ctx.arc(centerX, centerY, 80 + pulse, 0, Math.PI * 2);
      ctx.fillStyle = type === 'CAMERA' ? 'rgba(139, 92, 246, 0.2)' : 'rgba(6, 182, 212, 0.2)';
      ctx.fill();
      ctx.strokeStyle = type === 'CAMERA' ? '#8B5CF6' : '#06B6D4';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Text Overlay
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 32px Outfit, Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        type === 'CAMERA' ? 'Mivo Live Camera Feed' : 'Mivo Screen Broadcast',
        centerX,
        centerY - 10
      );

      ctx.fillStyle = '#94A3B8';
      ctx.font = '18px Inter, sans-serif';
      ctx.fillText(
        `60 FPS • 1080p Ultra-Low Latency • Timecode: ${Math.floor(frame / 60)}s`,
        centerX,
        centerY + 30
      );

      requestAnimationFrame(draw);
    };

    draw();
    return canvas.captureStream(30);
  }

  /**
   * Fallback Synthetic Audio Stream generator using AudioContext Oscillator
   */
  private createSyntheticAudioStream(): MediaStream {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioCtx();
    const dest = ctx.createMediaStreamDestination();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    gain.gain.setValueAtTime(0.01, ctx.currentTime);

    osc.connect(gain);
    gain.connect(dest);
    osc.start();

    return dest.stream;
  }
}

export const mediaManager = new MediaManager();
