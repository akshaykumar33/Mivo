/**
 * 3D Spatial Audio Engine
 * Leverages the Web Audio API (PannerNode / StereoPannerNode) to pan participant
 * audio in 3D stereo space based on their stage coordinates, eliminating voice collisions.
 */

export interface ParticipantSpatialNode {
  userId: string;
  sourceNode?: MediaStreamAudioSourceNode;
  pannerNode?: StereoPannerNode;
  gainNode?: GainNode;
  pan: number; // -1.0 (hard left) to +1.0 (hard right)
  distance: number; // 0.0 to 1.0 (distance from center)
}

class SpatialAudioEngine {
  private audioCtx: AudioContext | null = null;
  private participants: Map<string, ParticipantSpatialNode> = new Map();
  private isEnabled: boolean = true;

  constructor() {
    // AudioContext will be lazily initialized on user gesture
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (!enabled) {
      // Reset all panners to center
      this.participants.forEach((node) => {
        if (node.pannerNode) {
          node.pannerNode.pan.setValueAtTime(0, this.audioCtx?.currentTime || 0);
        }
      });
    }
  }

  public getIsEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Attach a remote WebRTC MediaStream to the spatial panner graph
   */
  public attachStream(userId: string, stream: MediaStream): void {
    const ctx = this.getAudioContext();
    if (!ctx || !stream || stream.getAudioTracks().length === 0) return;

    try {
      // Disconnect existing if any
      this.detachStream(userId);

      const sourceNode = ctx.createMediaStreamSource(stream);
      const gainNode = ctx.createGain();

      let pannerNode: StereoPannerNode | undefined;
      if (typeof ctx.createStereoPanner === 'function') {
        pannerNode = ctx.createStereoPanner();
      }

      if (pannerNode) {
        sourceNode.connect(pannerNode);
        pannerNode.connect(gainNode);
        gainNode.connect(ctx.destination);
      } else {
        sourceNode.connect(gainNode);
        gainNode.connect(ctx.destination);
      }

      const existing = this.participants.get(userId);
      const pan = existing?.pan ?? 0;
      const distance = existing?.distance ?? 0;

      if (pannerNode && this.isEnabled) {
        pannerNode.pan.setValueAtTime(pan, ctx.currentTime);
      }

      this.participants.set(userId, {
        userId,
        sourceNode,
        pannerNode,
        gainNode,
        pan,
        distance,
      });
    } catch (err) {
      console.warn(`[SpatialAudio] Failed to attach stream for ${userId}:`, err);
    }
  }

  /**
   * Detach participant audio stream
   */
  public detachStream(userId: string): void {
    const node = this.participants.get(userId);
    if (node) {
      try {
        node.sourceNode?.disconnect();
        node.pannerNode?.disconnect();
        node.gainNode?.disconnect();
      } catch {}
      this.participants.delete(userId);
    }
  }

  /**
   * Update 2D normalized stage position (-1.0 to +1.0 for X, distance attenuation)
   */
  public updatePosition(userId: string, normalizedX: number, normalizedY: number = 0): {
    pan: number;
    distance: number;
  } {
    const ctx = this.getAudioContext();
    const pan = Math.max(-1.0, Math.min(1.0, normalizedX));
    const distance = Math.min(1.0, Math.sqrt(normalizedX * normalizedX + normalizedY * normalizedY));

    let node = this.participants.get(userId);
    if (!node) {
      node = { userId, pan, distance };
      this.participants.set(userId, node);
    } else {
      node.pan = pan;
      node.distance = distance;
    }

    if (node.pannerNode && ctx && this.isEnabled) {
      // Smooth linear ramp to eliminate audio clicks
      node.pannerNode.pan.linearRampToValueAtTime(pan, ctx.currentTime + 0.05);

      // Subtle distance attenuation (up to 20% softer at outer edges)
      if (node.gainNode) {
        const targetGain = Math.max(0.8, 1.0 - distance * 0.2);
        node.gainNode.gain.linearRampToValueAtTime(targetGain, ctx.currentTime + 0.05);
      }
    }

    return { pan, distance };
  }

  public getPosition(userId: string): { pan: number; distance: number } {
    const node = this.participants.get(userId);
    return {
      pan: node?.pan ?? 0,
      distance: node?.distance ?? 0,
    };
  }

  public formatPanLabel(pan: number): string {
    if (Math.abs(pan) < 0.1) return 'Center';
    if (pan < 0) return `${Math.round(Math.abs(pan) * 100)}% Left`;
    return `${Math.round(pan * 100)}% Right`;
  }
}

export const spatialAudio = new SpatialAudioEngine();
