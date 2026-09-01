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
      await pc.setLocalDescription(offer);

      const socket = realtime.getSocket();
      if (socket && this.currentRoomId) {
        socket.emit(REALTIME_EVENTS.SIGNALING_OFFER, {
          roomId: this.currentRoomId,
          targetUserId: peerUserId,
          sdp: offer,
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
    this.onPeerDisconnectedCallback?.(peerUserId);
  }

  cleanup() {
    this.peers.forEach((pc) => pc.close());
    this.peers.clear();
    this.remoteStreams.clear();
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
        await pc.setLocalDescription(answer);

        socket.emit(REALTIME_EVENTS.SIGNALING_ANSWER, {
          roomId: this.currentRoomId,
          targetUserId: senderId,
          sdp: answer,
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
}

export const webrtcMesh = new WebRTCMeshManager();
