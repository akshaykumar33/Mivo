'use client';

import { useRoomStore } from '@/stores/roomStore';
import { RoomCommunicationMode } from '@mivo/shared';
import { useCallback, useMemo } from 'react';

/**
 * Dedicated high-performance hook for room communication mode transitions.
 * Selectively subscribes ONLY to activeRoom.activeMode and switchMode in Zustand.
 * Prevents cascading re-renders from audioLevel, media stream changes, or participant list updates.
 */
export function useRoomMode() {
  const activeMode = useRoomStore((state) => state.activeRoom?.activeMode ?? 'TEXT');
  const switchModeStore = useRoomStore((state) => state.switchMode);

  const switchMode = useCallback(
    (mode: RoomCommunicationMode) => {
      switchModeStore(mode);
    },
    [switchModeStore]
  );

  return useMemo(
    () => ({
      activeMode,
      switchMode,
      isChat: activeMode === 'TEXT',
      isVoice: activeMode === 'VOICE',
      isVideo: activeMode === 'VIDEO',
      isScreen: activeMode === 'SCREEN_SHARE',
      isCanvas: activeMode === 'CANVAS',
      isCode: activeMode === 'CODE',
      isInCall: activeMode !== 'TEXT',
    }),
    [activeMode, switchMode]
  );
}
