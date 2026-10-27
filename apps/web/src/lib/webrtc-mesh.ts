/**
 * WebRTC Mesh Peer Connection Manager
 * Manages full-mesh peer connections across room participants,
 * sending/receiving audio/video tracks and attaching remote streams.
 */

import { realtime } from './socket-client';
import {
  REALTIME_EVENTS,
  AudioBitrateProfile,
  AudioBitrateConfig,
  AUDIO_BITRATE_CONSTANTS,
} from '@mivo/shared';

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' },
  ],
};

export class WebRTCMeshManager {
  private peers: Map<string, RTCPeerConnection> = new Map();
  private remoteStreams: Map<string, MediaStream> = new Map();
  private localStream: MediaStream | null = null;
  private currentRoomId: string | null = null;
  private currentUserId: string | null = null;
  private onRemoteStreamCallback: ((peerId: string, stream: MediaStream) => void) | null = null;
  private onPeerDisconnectedCallback: ((peerId: string) => void) | null = null;
  private onBitrateChangedCallback: ((config: AudioBitrateConfig) => void) | null = null;

  // Audio Bitrate Management: 16 to 128 kbps, 32 kbps standard baseline
  private currentBitrateKbps: number = AUDIO_BITRATE_CONSTANTS.DEFAULT_KBPS;
  private currentProfile: AudioBitrateProfile = 'standard';
  private adaptiveMonitorTimer: ReturnType<typeof setInterval> | null = null;

  init(
    roomId: string,
    currentUserId: string,
    onRemoteStream?: (peerId: string, stream: MediaStream) => void,
    onPeerDisconnected?: (peerId: string) => void,
    onBitrateChanged?: (config: AudioBitrateConfig) => void
  ) {
    this.currentRoomId = roomId;
    this.currentUserId = currentUserId;
    this.onRemoteStreamCallback = onRemoteStream || null;
    this.onPeerDisconnectedCallback = onPeerDisconnected || null;
    this.onBitrateChangedCallback = onBitrateChanged || null;

    this.setupSignalingListeners();
    this.startAdaptiveBitrateMonitoring();
  }

  setLocalStream(stream: MediaStream | null) {
    this.localStream = stream;

    // Update tracks on all active peer connections
    this.peers.forEach((pc) => {
      const senders = pc.getSenders();
      if (stream) {
        stream.getTracks().forEach((track) => {
          const sender = senders.find((s) => s.track?.kind === track.kind);
          if (sender) {
            sender.replaceTrack(track);
          } else {
            pc.addTrack(track, stream);
          }
        });
      }
    });
  }

  /**
   * Connect to a newly joined participant by creating an SDP Offer
   */
  async connectToPeer(peerUserId: string) {
    if (peerUserId === this.currentUserId || this.peers.has(peerUserId)) return;

    const pc = this.createPeerConnection(peerUserId);
    this.peers.set(peerUserId, pc);

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        pc.addTrack(track, this.localStream!);
      });
    }

    try {
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      const optimizedSdp = this.optimizeAudioSdp(offer.sdp || '', this.currentBitrateKbps);
      const sdpDescription = new RTCSessionDescription({ type: offer.type, sdp: optimizedSdp });
      await pc.setLocalDescription(sdpDescription);
      this.configureAudioSender(pc);

      const socket = realtime.getSocket();
      if (socket && this.currentRoomId) {
        socket.emit(REALTIME_EVENTS.SIGNALING_OFFER, {
          roomId: this.currentRoomId,
          targetUserId: peerUserId,
          sdp: sdpDescription,
        });
      }
    } catch (e) {
      console.warn(`Failed to create offer for peer ${peerUserId}:`, e);
    }
  }

  disconnectPeer(peerUserId: string) {
    const pc = this.peers.get(peerUserId);
    if (pc) {
      pc.close();
      this.peers.delete(peerUserId);
    }
    this.remoteStreams.delete(peerUserId);
    if (typeof document !== 'undefined') {
      const audioElem = document.getElementById(`remote-audio-${peerUserId}`);
      if (audioElem) {
        audioElem.remove();
      }
    }
    this.onPeerDisconnectedCallback?.(peerUserId);
  }

  cleanup() {
    this.stopAdaptiveBitrateMonitoring();
    this.peers.forEach((pc) => pc.close());
    this.peers.clear();
    this.remoteStreams.clear();
    if (typeof document !== 'undefined') {
      document.querySelectorAll('audio[id^="remote-audio-"]').forEach((elem) => elem.remove());
    }
    this.localStream = null;
    this.currentRoomId = null;
    this.currentUserId = null;
    this.currentBitrateKbps = AUDIO_BITRATE_CONSTANTS.DEFAULT_KBPS;
    this.currentProfile = 'standard';
  }

  private createPeerConnection(peerUserId: string): RTCPeerConnection {
    const pc = new RTCPeerConnection(RTC_CONFIG);

    pc.onicecandidate = (event) => {
      if (event.candidate && this.currentRoomId) {
        const socket = realtime.getSocket();
        socket?.emit(REALTIME_EVENTS.SIGNALING_ICE_CANDIDATE, {
          roomId: this.currentRoomId,
          targetUserId: peerUserId,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      if (remoteStream) {
        this.remoteStreams.set(peerUserId, remoteStream);
        this.onRemoteStreamCallback?.(peerUserId, remoteStream);

        // Auto-play audio element for remote audio stream
        this.attachRemoteAudio(peerUserId, remoteStream);
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        this.disconnectPeer(peerUserId);
      }
    };

    return pc;
  }

  private attachRemoteAudio(peerUserId: string, stream: MediaStream) {
    let audioElem = document.getElementById(`remote-audio-${peerUserId}`) as HTMLAudioElement;
    if (!audioElem) {
      audioElem = document.createElement('audio');
      audioElem.id = `remote-audio-${peerUserId}`;
      audioElem.autoplay = true;
      audioElem.style.display = 'none';
      document.body.appendChild(audioElem);
    }
    audioElem.srcObject = stream;
    audioElem.volume = 1.0;
    audioElem.play().catch(() => {});
  }

  private setupSignalingListeners() {
    const socket = realtime.getSocket();
    if (!socket) return;

    socket.off(REALTIME_EVENTS.SIGNALING_OFFER);
    socket.on(REALTIME_EVENTS.SIGNALING_OFFER, async (data: any) => {
      if (data.targetUserId && data.targetUserId !== this.currentUserId) return;
      const senderId = data.senderId;
      if (!senderId || senderId === this.currentUserId) return;

      let pc = this.peers.get(senderId);
      if (!pc) {
        pc = this.createPeerConnection(senderId);
        this.peers.set(senderId, pc);
      }

      if (this.localStream) {
        this.localStream.getTracks().forEach((track) => {
          pc?.addTrack(track, this.localStream!);
        });
      }

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        const answer = await pc.createAnswer();
        const optimizedAnswerSdp = this.optimizeAudioSdp(answer.sdp || '', this.currentBitrateKbps);
        const answerDescription = new RTCSessionDescription({ type: answer.type, sdp: optimizedAnswerSdp });
        await pc.setLocalDescription(answerDescription);
        this.configureAudioSender(pc);

        socket.emit(REALTIME_EVENTS.SIGNALING_ANSWER, {
          roomId: this.currentRoomId,
          targetUserId: senderId,
          sdp: answerDescription,
        });
      } catch (e) {
        console.warn('Failed to handle incoming signaling offer:', e);
      }
    });

    socket.off(REALTIME_EVENTS.SIGNALING_ANSWER);
    socket.on(REALTIME_EVENTS.SIGNALING_ANSWER, async (data: any) => {
      if (data.targetUserId && data.targetUserId !== this.currentUserId) return;
      const senderId = data.senderId;
      const pc = this.peers.get(senderId);
      if (pc && data.sdp) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        } catch (e) {
          console.warn('Failed to set remote answer description:', e);
        }
      }
    });

    socket.off(REALTIME_EVENTS.SIGNALING_ICE_CANDIDATE);
    socket.on(REALTIME_EVENTS.SIGNALING_ICE_CANDIDATE, async (data: any) => {
      if (data.targetUserId && data.targetUserId !== this.currentUserId) return;
      const senderId = data.senderId;
      const pc = this.peers.get(senderId);
      if (pc && data.candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (e) {
          console.warn('Failed to add ICE candidate:', e);
        }
      }
    });
  }

  /**
   * Dynamically update audio bitrate (clamped between 16 kbps and 128 kbps).
   * Updates all active RTCRtpSenders immediately without dropping the call.
   */
  public async setAudioBitrate(kbps: number) {
    const clamped = Math.min(
      AUDIO_BITRATE_CONSTANTS.MAX_KBPS,
      Math.max(AUDIO_BITRATE_CONSTANTS.MIN_KBPS, Math.round(kbps))
    );
    this.currentBitrateKbps = clamped;

    if (clamped === AUDIO_BITRATE_CONSTANTS.MIN_KBPS) {
      this.currentProfile = 'low-bandwidth';
    } else if (clamped === AUDIO_BITRATE_CONSTANTS.STANDARD_KBPS) {
      this.currentProfile = 'standard';
    } else if (clamped === AUDIO_BITRATE_CONSTANTS.HD_KBPS) {
      this.currentProfile = 'hd';
    } else if (clamped === AUDIO_BITRATE_CONSTANTS.MAX_KBPS) {
      this.currentProfile = 'studio';
    }

    await this.applyBitrateToAllSenders(clamped);
    this.notifyBitrateChanged();
  }

  /**
   * Set predefined audio profile:
   * - 'low-bandwidth': 16 kbps (cellular saver, mono, DTX, FEC)
   * - 'standard': 32 kbps (standard conference baseline, mono, DTX, FEC)
   * - 'hd': 64 kbps (high-definition, stereo)
   * - 'studio': 128 kbps (full spectrum fidelity, stereo)
   * - 'adaptive': dynamically scales between 16 and 128 kbps based on network health
   */
  public async setAudioProfile(profile: AudioBitrateProfile) {
    this.currentProfile = profile;
    switch (profile) {
      case 'low-bandwidth':
        this.currentBitrateKbps = AUDIO_BITRATE_CONSTANTS.MIN_KBPS; // 16
        break;
      case 'standard':
        this.currentBitrateKbps = AUDIO_BITRATE_CONSTANTS.STANDARD_KBPS; // 32
        break;
      case 'hd':
        this.currentBitrateKbps = AUDIO_BITRATE_CONSTANTS.HD_KBPS; // 64
        break;
      case 'studio':
        this.currentBitrateKbps = AUDIO_BITRATE_CONSTANTS.MAX_KBPS; // 128
        break;
      case 'adaptive':
        if (this.currentBitrateKbps < AUDIO_BITRATE_CONSTANTS.MIN_KBPS) {
          this.currentBitrateKbps = AUDIO_BITRATE_CONSTANTS.STANDARD_KBPS;
        }
        break;
    }

    await this.applyBitrateToAllSenders(this.currentBitrateKbps);
    this.notifyBitrateChanged();
  }

  public getAudioBitrateConfig(): AudioBitrateConfig {
    const isLowBw = this.currentBitrateKbps <= AUDIO_BITRATE_CONSTANTS.STANDARD_KBPS;
    return {
      profile: this.currentProfile,
      currentBitrateKbps: this.currentBitrateKbps,
      minBitrateKbps: AUDIO_BITRATE_CONSTANTS.MIN_KBPS,
      maxBitrateKbps: AUDIO_BITRATE_CONSTANTS.MAX_KBPS,
      isLowBandwidthOptimized: isLowBw,
      usedtx: true,
      useinbandfec: true,
      stereo: !isLowBw,
    };
  }

  private notifyBitrateChanged() {
    if (this.onBitrateChangedCallback) {
      this.onBitrateChangedCallback(this.getAudioBitrateConfig());
    }
  }

  /**
   * Optimize WebRTC SDP for dynamic Opus voice & conference audio:
   * Sets maxaveragebitrate (16000 to 128000 bps, 32000 bps standard baseline).
   * Low-bandwidth optimization (bitrate <= 32 kbps):
   * - mono speech encoding (stereo=0;sprop-stereo=0) to focus 100% bandwidth on vocal clarity
   * - discontinuous transmission (usedtx=1) to eliminate up to 70% of network packets during silence
   * - in-band forward error correction (useinbandfec=1) to prevent audio jitter/loss
   * - variable bitrate (cbr=0) to minimize soft-speech and background noise bit consumption
   * High-definition audio (> 32 kbps):
   * - stereo=1;sprop-stereo=1 for spatial field and music/instrument fidelity
   */
  public optimizeAudioSdp(sdp: string, targetBitrateKbps: number = this.currentBitrateKbps): string {
    if (!sdp) return sdp;
    const opusMatch = sdp.match(/a=rtpmap:(\d+)\s+opus\/48000/i);
    if (!opusMatch) return sdp;
    const pt = opusMatch[1];

    const clampedKbps = Math.min(
      AUDIO_BITRATE_CONSTANTS.MAX_KBPS,
      Math.max(AUDIO_BITRATE_CONSTANTS.MIN_KBPS, Math.round(targetBitrateKbps))
    );
    const bitrateBps = clampedKbps * 1000;
    const isLowBw = clampedKbps <= AUDIO_BITRATE_CONSTANTS.STANDARD_KBPS; // <= 32 kbps

    const fmtpRegex = new RegExp(`a=fmtp:${pt}\\s+(.*)`);
    if (fmtpRegex.test(sdp)) {
      return sdp.replace(fmtpRegex, (_match, params) => {
        const paramMap = new Map<string, string>();
        params.split(';').forEach((pair: string) => {
          const [k, v] = pair.trim().split('=');
          if (k) paramMap.set(k.trim().toLowerCase(), v ? v.trim() : '');
        });

        // Dynamic bitrate and low-bandwidth optimizations
        paramMap.set('maxaveragebitrate', String(bitrateBps));
        paramMap.set('stereo', isLowBw ? '0' : '1');
        paramMap.set('sprop-stereo', isLowBw ? '0' : '1');
        paramMap.set('useinbandfec', '1');
        paramMap.set('usedtx', '1');
        paramMap.set('cbr', '0');

        const formatted = Array.from(paramMap.entries())
          .map(([k, v]) => (v ? `${k}=${v}` : k))
          .join(';');
        return `a=fmtp:${pt} ${formatted}`;
      });
    }

    const lowBwParams = isLowBw
      ? `maxaveragebitrate=${bitrateBps};stereo=0;sprop-stereo=0;useinbandfec=1;usedtx=1;cbr=0`
      : `maxaveragebitrate=${bitrateBps};stereo=1;sprop-stereo=1;useinbandfec=1;usedtx=1;cbr=0`;

    return sdp.replace(
      new RegExp(`(a=rtpmap:${pt}\\s+opus\\/48000[^\r\n]*)`),
      `$1\r\na=fmtp:${pt} ${lowBwParams}`
    );
  }

  /**
   * Apply dynamic maxBitrate and priority to an audio sender's encodings
   */
  public async applyBitrateToSender(
    sender: RTCRtpSender,
    bitrateKbps: number = this.currentBitrateKbps
  ) {
    if (sender.track?.kind !== 'audio') return;
    try {
      const params = sender.getParameters();
      if (!params.encodings || params.encodings.length === 0) {
        params.encodings = [{}];
      }
      const clampedKbps = Math.min(
        AUDIO_BITRATE_CONSTANTS.MAX_KBPS,
        Math.max(AUDIO_BITRATE_CONSTANTS.MIN_KBPS, bitrateKbps)
      );
      params.encodings[0].maxBitrate = clampedKbps * 1000;
      (params.encodings[0] as any).priority = 'high';
      (params.encodings[0] as any).networkPriority = 'high';
      await sender.setParameters(params);
    } catch {
      // Set parameters may be unsupported in some environments or during connection teardown
    }
  }

  /**
   * Apply dynamic bitrate to all active peer connections
   */
  public async applyBitrateToAllSenders(bitrateKbps: number = this.currentBitrateKbps) {
    const promises: Promise<void>[] = [];
    this.peers.forEach((pc) => {
      pc.getSenders().forEach((sender) => {
        if (sender.track?.kind === 'audio') {
          promises.push(this.applyBitrateToSender(sender, bitrateKbps));
        }
      });
    });
    await Promise.allSettled(promises);
  }

  /**
   * Configure audio sender encoding bitrates and priority upon connection
   */
  public configureAudioSender(pc: RTCPeerConnection) {
    pc.getSenders().forEach((sender) => {
      if (sender.track?.kind === 'audio') {
        this.applyBitrateToSender(sender, this.currentBitrateKbps);
      }
    });
  }

  /**
   * Starts periodic network quality sampling to adapt audio bitrates automatically
   * when profile is 'adaptive' or during network congestion.
   */
  private startAdaptiveBitrateMonitoring() {
    this.stopAdaptiveBitrateMonitoring();
    this.adaptiveMonitorTimer = setInterval(async () => {
      if (this.currentProfile !== 'adaptive' || this.peers.size === 0) return;

      let maxRtt = 0;
      let maxPacketLossRatio = 0;
      let samplesCount = 0;

      for (const [, pc] of this.peers) {
        try {
          const stats = await pc.getStats();
          stats.forEach((report) => {
            if (report.type === 'candidate-pair' && (report.state === 'succeeded' || report.nominated)) {
              if (typeof report.currentRoundTripTime === 'number') {
                maxRtt = Math.max(maxRtt, report.currentRoundTripTime);
                samplesCount++;
              }
            }
            if (report.type === 'remote-inbound-rtp' && report.kind === 'audio') {
              if (typeof report.fractionLost === 'number') {
                maxPacketLossRatio = Math.max(maxPacketLossRatio, report.fractionLost);
                samplesCount++;
              }
            }
          });
        } catch {
          // getStats failed or unsupported
        }
      }

      if (samplesCount === 0) return;

      // Congestion threshold: RTT > 250ms or packet loss > 4%
      // Degrade to low-bandwidth 16 kbps
      if (maxRtt > 0.25 || maxPacketLossRatio > 0.04) {
        if (this.currentBitrateKbps > AUDIO_BITRATE_CONSTANTS.MIN_KBPS) {
          this.currentBitrateKbps = AUDIO_BITRATE_CONSTANTS.MIN_KBPS; // 16 kbps
          await this.applyBitrateToAllSenders(16);
          this.notifyBitrateChanged();
        }
      }
      // Good network health: RTT < 100ms and packet loss < 1%
      // Restore up to standard 32 kbps baseline
      else if (maxRtt < 0.1 && maxPacketLossRatio < 0.01) {
        if (this.currentBitrateKbps < AUDIO_BITRATE_CONSTANTS.STANDARD_KBPS) {
          this.currentBitrateKbps = AUDIO_BITRATE_CONSTANTS.STANDARD_KBPS; // 32 kbps
          await this.applyBitrateToAllSenders(32);
          this.notifyBitrateChanged();
        }
      }
    }, 3000);
  }

  private stopAdaptiveBitrateMonitoring() {
    if (this.adaptiveMonitorTimer) {
      clearInterval(this.adaptiveMonitorTimer);
      this.adaptiveMonitorTimer = null;
    }
  }
}

export const webrtcMesh = new WebRTCMeshManager();
