import { AmbientTrackType } from '@mivo/shared';

class AmbientSoundGenerator {
  private audioCtx: AudioContext | null = null;
  private isPlaying = false;
  private currentTrack: AmbientTrackType = 'lofi_beats';
  private gainNode: GainNode | null = null;
  private pannerNode: StereoPannerNode | null = null;
  private activeNodes: Array<AudioNode | number> = [];

  private initContext() {
    if (!this.audioCtx && typeof window !== 'undefined') {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
        this.gainNode = this.audioCtx.createGain();
        this.gainNode.gain.value = 0.5;

        if (this.audioCtx.createStereoPanner) {
          this.pannerNode = this.audioCtx.createStereoPanner();
          this.gainNode.connect(this.pannerNode);
          this.pannerNode.connect(this.audioCtx.destination);
        } else {
          this.gainNode.connect(this.audioCtx.destination);
        }
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  playTrack(track: AmbientTrackType, volume = 0.5, spatialPan = 0) {
    this.initContext();
    if (!this.audioCtx || !this.gainNode) return;

    this.stop();
    this.currentTrack = track;
    this.isPlaying = true;
    this.gainNode.gain.setValueAtTime(volume, this.audioCtx.currentTime);

    if (this.pannerNode) {
      this.pannerNode.pan.setValueAtTime(spatialPan, this.audioCtx.currentTime);
    }

    if (track === 'lofi_beats') {
      this.generateLoFiBeats();
    } else if (track === 'rain_storm') {
      this.generateRainNoise();
    } else if (track === 'coffee_shop') {
      this.generateCafeAmbiance();
    } else if (track === 'cyber_synthwave') {
      this.generateSynthwave();
    }
  }

  setVolume(volume: number) {
    if (this.gainNode && this.audioCtx) {
      this.gainNode.gain.setValueAtTime(Math.max(0, Math.min(1, volume)), this.audioCtx.currentTime);
    }
  }

  setSpatialPan(pan: number) {
    if (this.pannerNode && this.audioCtx) {
      this.pannerNode.pan.setValueAtTime(Math.max(-1, Math.min(1, pan)), this.audioCtx.currentTime);
    }
  }

  stop() {
    this.isPlaying = false;
    this.activeNodes.forEach((node) => {
      try {
        if (typeof node === 'number') {
          clearInterval(node);
        } else if ('stop' in node && typeof (node as any).stop === 'function') {
          (node as any).stop();
        }
      } catch {}
    });
    this.activeNodes = [];
  }

  private generateLoFiBeats() {
    if (!this.audioCtx || !this.gainNode) return;
    const ctx = this.audioCtx;

    // Warm chord progression loop
    const chords = [
      [220.0, 261.63, 329.63], // Am
      [174.61, 220.0, 261.63], // F
      [130.81, 164.81, 196.0],  // C
      [196.0, 246.94, 293.66], // G
    ];
    let chordIndex = 0;

    const playChord = () => {
      if (!this.isPlaying) return;
      const notes = chords[chordIndex % chords.length];
      chordIndex++;

      notes.forEach((freq) => {
        const osc = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const chordGain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(450, ctx.currentTime);

        chordGain.gain.setValueAtTime(0, ctx.currentTime);
        chordGain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.4);
        chordGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 3.0);

        osc.connect(filter);
        filter.connect(chordGain);
        chordGain.connect(this.gainNode!);

        osc.start();
        osc.stop(ctx.currentTime + 3.2);
        this.activeNodes.push(osc);
      });
    };

    playChord();
    const interval = window.setInterval(playChord, 3200);
    this.activeNodes.push(interval);
  }

  private generateRainNoise() {
    if (!this.audioCtx || !this.gainNode) return;
    const ctx = this.audioCtx;

    // Pink / rain noise buffer
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      data[i] = (b0 + b1 + b2) * 0.08;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, ctx.currentTime);

    noise.connect(filter);
    filter.connect(this.gainNode);
    noise.start();
    this.activeNodes.push(noise);
  }

  private generateCafeAmbiance() {
    if (!this.audioCtx || !this.gainNode) return;
    const ctx = this.audioCtx;

    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.03;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(320, ctx.currentTime);
    filter.Q.setValueAtTime(1.2, ctx.currentTime);

    noise.connect(filter);
    filter.connect(this.gainNode);
    noise.start();
    this.activeNodes.push(noise);
  }

  private generateSynthwave() {
    if (!this.audioCtx || !this.gainNode) return;
    const ctx = this.audioCtx;

    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, ctx.currentTime); // A2

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(700, ctx.currentTime);

    lfo.frequency.setValueAtTime(0.5, ctx.currentTime);
    lfoGain.gain.setValueAtTime(300, ctx.currentTime);
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    osc.connect(filter);
    filter.connect(this.gainNode);

    osc.start();
    lfo.start();
    this.activeNodes.push(osc);
    this.activeNodes.push(lfo);
  }

  getIsPlaying() {
    return this.isPlaying;
  }

  getCurrentTrack() {
    return this.currentTrack;
  }
}

export const ambientSound = new AmbientSoundGenerator();
