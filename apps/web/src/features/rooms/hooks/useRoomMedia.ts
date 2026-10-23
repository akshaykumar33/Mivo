'use client';

import { useRoomStore } from '@/stores/roomStore';
import { useShallow } from 'zustand/react/shallow';

/**
 * High-performance hook for room media controls and streams.
 * Isolates media states without triggering re-renders on audio level fluctuations.
 */
export function useRoomMedia() {
  return useRoomStore(
    useShallow((state) => ({
      isMuted: state.isMuted,
      isCameraOn: state.isCameraOn,
      isScreenOn: state.isScreenOn,
      isDeafened: state.isDeafened,
      localStream: state.localStream,
      screenStream: state.screenStream,
      remoteStreams: state.remoteStreams,
      toggleMute: state.toggleMute,
      toggleCamera: state.toggleCamera,
      toggleScreenShare: state.toggleScreenShare,
      toggleDeafen: state.toggleDeafen,
    }))
  );
}
