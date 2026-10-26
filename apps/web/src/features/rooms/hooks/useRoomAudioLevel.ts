'use client';

import { useRoomStore } from '@/stores/roomStore';

/**
 * Dedicated hook for real-time audio volume levels.
 * Only components visualizing sound waves or active speaking indicators
 * will re-render when audioLevel changes, preventing room-wide render storms.
 */
export function useRoomAudioLevel() {
  return useRoomStore((state) => state.audioLevel);
}
