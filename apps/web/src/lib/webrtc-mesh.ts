/**
 * WebRTC Mesh Peer Connection Manager
 * Manages full-mesh peer connections across room participants,
 * sending/receiving audio/video tracks and attaching remote streams.
 */

import { realtime } from './socket-client';
import { REALTIME_EVENTS } from '@mivo/shared';

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

  init(
    roomId: string,
    currentUserId: string,
    onRemoteStream?: (peerId: string, stream: MediaStream) => void,
    onPeerDisconnected?: (peerId: string) => void
  ) {
    this.currentRoomId = roomId;
    this.currentUserId = currentUserId;
    this.onRemoteStreamCallback = onRemoteStream || null;
    this.onPeerDisconnectedCallback = onPeerDisconnected || null;

    this.setupSignalingListeners();
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
      const optimizedSdp = this.optimizeAudioSdp(offer.sdp || '');
      const sdpDescription = new RTCSessionDescription({ type: offer.type, sdp: optimizedSdp });
      await pc.setLocalDescription(sdpDescription);
      this.configureHighQualityAudioSender(pc);

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
    this.peers.forEach((pc) => pc.close());
    this.peers.clear();
    this.remoteStreams.clear();
    if (typeof document !== 'undefined') {
      document.querySelectorAll('audio[id^="remote-audio-"]').forEach((elem) => elem.remove());
    }
    this.localStream = null;
    this.currentRoomId = null;
    this.currentUserId = null;
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
        const optimizedAnswerSdp = this.optimizeAudioSdp(answer.sdp || '');
        const answerDescription = new RTCSessionDescription({ type: answer.type, sdp: optimizedAnswerSdp });
        await pc.setLocalDescription(answerDescription);
        this.configureHighQualityAudioSender(pc);

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
   * Optimize WebRTC SDP for high-definition Opus voice audio:
   * Sets maxaveragebitrate=128000 (128 kbps HD voice),
   * enables stereo spatial sound, in-band forward error correction (FEC),
   * and discontinuous transmission (DTX) to prevent packet loss.
   */
  private optimizeAudioSdp(sdp: string): string {
    if (!sdp) return sdp;
    const opusMatch = sdp.match(/a=rtpmap:(\d+)\s+opus\/48000/i);
    if (!opusMatch) return sdp;
    const pt = opusMatch[1];

    const fmtpRegex = new RegExp(`a=fmtp:${pt}\\s+(.*)`);
    if (fmtpRegex.test(sdp)) {
      return sdp.replace(fmtpRegex, (_match, params) => {
        let p = params;
        if (!p.includes('maxaveragebitrate=')) p += ';maxaveragebitrate=128000';
        if (!p.includes('stereo=')) p += ';stereo=1;sprop-stereo=1';
        if (!p.includes('useinbandfec=')) p += ';useinbandfec=1';
        if (!p.includes('usedtx=')) p += ';usedtx=1';
        return `a=fmtp:${pt} ${p}`;
      });
    }

    return sdp.replace(
      new RegExp(`(a=rtpmap:${pt}\\s+opus\\/48000[^\r\n]*)`),
      `$1\r\na=fmtp:${pt} maxaveragebitrate=128000;stereo=1;sprop-stereo=1;useinbandfec=1;usedtx=1`
    );
  }

  /**
   * Configure high bitrate and priority on RTCRtpSender for HD voice transmission
   */
  private configureHighQualityAudioSender(pc: RTCPeerConnection) {
    try {
      pc.getSenders().forEach((sender) => {
        if (sender.track?.kind === 'audio') {
          const params = sender.getParameters();
          if (!params.encodings || params.encodings.length === 0) {
            params.encodings = [{}];
          }
          params.encodings[0].maxBitrate = 128000; // 128 kbps
          (params.encodings[0] as any).priority = 'high';
          (params.encodings[0] as any).networkPriority = 'high';
          sender.setParameters(params).catch(() => {});
        }
      });
    } catch {}
  }
}

export const webrtcMesh = new WebRTCMeshManager();
