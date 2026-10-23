import { create } from 'zustand';
import { ExternalMeetingBridgeDTO, ActivityStateBroadcast } from '@mivo/shared';

interface RoomUIState {
  isInviteOpen: boolean;
  isParticipantsOpen: boolean;
  isWhisperOpen: boolean;
  isPiPOpen: boolean;
  isDocsOpen: boolean;
  isMeetingHubOpen: boolean;
  isRecording: boolean;
  recordingHostName: string;
  isSubtitlesEnabled: boolean;
  activeBridge: ExternalMeetingBridgeDTO | null;
  activeMiniApp: ActivityStateBroadcast | null;

  // Actions
  setIsInviteOpen: (isOpen: boolean) => void;
  toggleInvite: () => void;

  setIsParticipantsOpen: (isOpen: boolean) => void;
  toggleParticipants: () => void;

  setIsWhisperOpen: (isOpen: boolean) => void;
  toggleWhisper: () => void;

  setIsPiPOpen: (isOpen: boolean) => void;
  togglePiP: () => void;

  setIsDocsOpen: (isOpen: boolean) => void;
  toggleDocs: () => void;

  setIsMeetingHubOpen: (isOpen: boolean) => void;
  toggleMeetingHub: () => void;

  setIsRecording: (isRecording: boolean, hostName?: string) => void;
  setIsSubtitlesEnabled: (isEnabled: boolean) => void;
  toggleSubtitles: () => void;

  setActiveBridge: (bridge: ExternalMeetingBridgeDTO | null) => void;
  setActiveMiniApp: (miniApp: ActivityStateBroadcast | null) => void;

  resetUI: () => void;
}

export const useRoomUIStore = create<RoomUIState>((set) => ({
  isInviteOpen: false,
  isParticipantsOpen: false,
  isWhisperOpen: false,
  isPiPOpen: false,
  isDocsOpen: false,
  isMeetingHubOpen: false,
  isRecording: false,
  recordingHostName: 'Host',
  isSubtitlesEnabled: true,
  activeBridge: null,
  activeMiniApp: null,

  setIsInviteOpen: (isOpen) => set({ isInviteOpen: isOpen }),
  toggleInvite: () => set((state) => ({ isInviteOpen: !state.isInviteOpen })),

  setIsParticipantsOpen: (isOpen) => set({ isParticipantsOpen: isOpen }),
  toggleParticipants: () => set((state) => ({ isParticipantsOpen: !state.isParticipantsOpen })),

  setIsWhisperOpen: (isOpen) => set({ isWhisperOpen: isOpen }),
  toggleWhisper: () => set((state) => ({ isWhisperOpen: !state.isWhisperOpen })),

  setIsPiPOpen: (isOpen) => set({ isPiPOpen: isOpen }),
  togglePiP: () => set((state) => ({ isPiPOpen: !state.isPiPOpen })),

  setIsDocsOpen: (isOpen) => set({ isDocsOpen: isOpen }),
  toggleDocs: () => set((state) => ({ isDocsOpen: !state.isDocsOpen })),

  setIsMeetingHubOpen: (isOpen) => set({ isMeetingHubOpen: isOpen }),
  toggleMeetingHub: () => set((state) => ({ isMeetingHubOpen: !state.isMeetingHubOpen })),

  setIsRecording: (isRecording, hostName) =>
    set({
      isRecording,
      recordingHostName: hostName || 'Host',
    }),

  setIsSubtitlesEnabled: (isEnabled) => set({ isSubtitlesEnabled: isEnabled }),
  toggleSubtitles: () => set((state) => ({ isSubtitlesEnabled: !state.isSubtitlesEnabled })),

  setActiveBridge: (bridge) => set({ activeBridge: bridge }),
  setActiveMiniApp: (miniApp) => set({ activeMiniApp: miniApp }),

  resetUI: () =>
    set({
      isInviteOpen: false,
      isParticipantsOpen: false,
      isWhisperOpen: false,
      isPiPOpen: false,
      isDocsOpen: false,
      isMeetingHubOpen: false,
      isRecording: false,
      recordingHostName: 'Host',
      isSubtitlesEnabled: true,
      activeBridge: null,
      activeMiniApp: null,
    }),
}));
