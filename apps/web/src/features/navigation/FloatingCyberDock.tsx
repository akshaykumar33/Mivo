'use client';

import * as React from 'react';
import { RoomCommunicationMode } from '@mivo/shared';
import {
  MessageSquare,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  Radio,
  Sparkles,
  Users,
  CircleDot,
  PictureInPicture2,
  BookOpen,
  PhoneOff,
  Smile,
  Hand,
} from 'lucide-react';
import { reactionBus } from '@/features/rooms/FloatingReactionsLayer';

export interface FloatingCyberDockProps {
  activeMode: RoomCommunicationMode;
  onModeChange: (mode: RoomCommunicationMode) => void;
  isMuted: boolean;
  isCameraOn: boolean;
  isScreenOn: boolean;
  isPiPOpen: boolean;
  isRecording: boolean;
  isHost: boolean;
  isWhisperOpen: boolean;
  isParticipantsOpen: boolean;
  participantCount: number;
  audioLevel?: number;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onToggleScreen: () => void;
  onTogglePiP: () => void;
  onToggleRecording: () => void;
  onToggleWhisper: () => void;
  onToggleParticipants: () => void;
  onToggleDocs: () => void;
  onDisconnect: () => void;
}

export const FloatingCyberDock: React.FC<FloatingCyberDockProps> = ({
  activeMode,
  onModeChange,
  isMuted,
  isCameraOn,
  isScreenOn,
  isPiPOpen,
  isRecording,
  isHost,
  isWhisperOpen,
  isParticipantsOpen,
  participantCount,
  audioLevel = 0,
  onToggleMute,
  onToggleCamera,
  onToggleScreen,
  onTogglePiP,
  onToggleRecording,
  onToggleWhisper,
  onToggleParticipants,
  onToggleDocs,
  onDisconnect,
}) => {
  const [isReactionsTrayOpen, setIsReactionsTrayOpen] = React.useState(false);
  const reactionsTrayRef = React.useRef<HTMLDivElement>(null);

  // Click outside to close reactions tray
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (reactionsTrayRef.current && !reactionsTrayRef.current.contains(e.target as Node)) {
        setIsReactionsTrayOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const stageModes: Array<{
    id: RoomCommunicationMode;
    label: string;
    icon: any;
    color: string;
    glow: string;
  }> = [
    {
      id: 'TEXT',
      label: 'Chat',
      icon: MessageSquare,
      color: 'from-[#0A84FF] to-[#5E5CE6]',
      glow: 'shadow-[0_4px_16px_rgba(10,132,255,0.4)]',
    },
    {
      id: 'VOICE',
      label: 'Voice',
      icon: Mic,
      color: 'from-[#30D158] to-[#63E6E2]',
      glow: 'shadow-[0_4px_16px_rgba(48,209,88,0.4)]',
    },
    {
      id: 'VIDEO',
      label: 'Video',
      icon: Video,
      color: 'from-[#64D2FF] to-[#0A84FF]',
      glow: 'shadow-[0_4px_16px_rgba(100,210,255,0.4)]',
    },
    {
      id: 'SCREEN_SHARE',
      label: 'Screen',
      icon: Monitor,
      color: 'from-[#5E5CE6] to-[#BF5AF2]',
      glow: 'shadow-[0_4px_16px_rgba(94,92,230,0.4)]',
    },
  ];

  const reactionEmojis = ['❤️', '👏', '🔥', '🎉', '👍', '😂', '🚀', '💯'];

  const handleSendReaction = (emoji: string) => {
    reactionBus.emit(emoji);
    setIsReactionsTrayOpen(false);
  };

  const isSpeaking = !isMuted && audioLevel > 15;

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 pointer-events-auto select-none transition-all duration-300"
    >
      {/* Floating Google Meet / Zoom Style Reactions Tray Popover */}
      {isReactionsTrayOpen && (
        <div
          ref={reactionsTrayRef}
          className="absolute bottom-16 left-1/2 -translate-x-1/2 mb-2 p-2 rounded-[22px] bg-[#0A0D18]/95 border border-white/[0.14] backdrop-blur-3xl shadow-[0_16px_40px_rgba(0,0,0,0.85)] flex items-center gap-1.5 ring-1 ring-white/[0.08] animate-slide-up z-50 whitespace-nowrap"
        >
          {reactionEmojis.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleSendReaction(emoji)}
              className="p-2 rounded-[14px] hover:bg-white/[0.1] hover:scale-125 active:scale-95 transition-all text-xl cursor-pointer"
              title={`Send ${emoji} Reaction`}
            >
              {emoji}
            </button>
          ))}

          <div className="w-[1px] h-6 bg-white/[0.1] mx-1" />

          <button
            onClick={() => handleSendReaction('✋')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[14px] bg-[#FFBD2E]/15 hover:bg-[#FFBD2E]/30 text-[#FFBD2E] border border-[#FFBD2E]/40 text-xs font-bold transition-all hover:scale-105 cursor-pointer"
            title="Raise Hand"
          >
            <Hand className="w-3.5 h-3.5" />
            <span>Raise Hand</span>
          </button>
        </div>
      )}

      {/* Apple Liquid Glass Floating Dock Container */}
      <div className="relative flex items-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-[26px] bg-[#0A0C14]/85 border border-white/[0.12] backdrop-blur-3xl shadow-[0_20px_50px_rgba(0,0,0,0.7)] ring-1 ring-white/[0.06]">
        {/* Top Specular Line Highlight */}
        <div className="absolute inset-x-6 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        {/* 1. Stage Mode Switcher Segmented Pills */}
        <div className="flex items-center gap-1 p-1 rounded-[18px] bg-white/[0.03] border border-white/[0.06]">
          {stageModes.map((mode) => {
            const Icon = mode.icon;
            const isActive = activeMode === mode.id;

            return (
              <button
                key={mode.id}
                onClick={() => onModeChange(mode.id)}
                className={`relative group/btn flex items-center gap-1.5 px-3 py-2 rounded-[14px] text-xs font-bold transition-all duration-200 cursor-pointer ${
                  isActive
                    ? `bg-gradient-to-r ${mode.color} text-white shadow-md ${mode.glow} border border-white/30 scale-105`
                    : 'text-white/60 hover:text-white hover:bg-white/[0.06] hover:scale-102'
                }`}
                title={`Switch stage to ${mode.label} mode`}
              >
                <Icon className={`w-4 h-4 stroke-[2.2] ${isActive ? 'text-white' : 'text-white/60 group-hover/btn:text-white'}`} />
                <span className="hidden md:inline font-display">{mode.label}</span>

                {/* Apple Native Tooltip */}
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-[10px] bg-[#141724]/95 border border-white/[0.12] text-[10px] font-semibold text-white opacity-0 pointer-events-none group-hover/btn:opacity-100 transition-all duration-150 whitespace-nowrap shadow-[0_8px_20px_rgba(0,0,0,0.5)] backdrop-blur-xl">
                  {mode.label} Mode
                </div>
              </button>
            );
          })}
        </div>

        {/* Apple Glass Hairline Separator */}
        <div className="w-[1px] h-7 bg-white/[0.1] mx-0.5" />

        {/* 2. Media Hardware & Live Controls (Rendered during active calls / live stages) */}
        {activeMode !== 'TEXT' && (
          <>
            <div className="flex items-center gap-1.5">
              {/* Microphone Toggle with Speaking Wave Halo */}
              <button
                onClick={onToggleMute}
                className={`relative group/mic p-2.5 sm:p-3 rounded-[16px] transition-all duration-200 cursor-pointer ${
                  isMuted
                    ? 'bg-[#FF453A]/15 text-[#FF453A] border border-[#FF453A]/40 hover:bg-[#FF453A] hover:text-white shadow-sm'
                    : isSpeaking
                    ? 'bg-[#30D158] text-black font-bold border border-white shadow-[0_0_20px_rgba(48,209,88,0.7)] scale-105 animate-speaking'
                    : 'bg-[#30D158]/15 text-[#30D158] border border-[#30D158]/40 hover:bg-[#30D158] hover:text-black shadow-sm'
                }`}
                title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
              >
                {isMuted ? <MicOff className="w-4 h-4 stroke-[2.2]" /> : <Mic className="w-4 h-4 stroke-[2.2]" />}

                <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-[10px] bg-[#141724]/95 border border-white/[0.12] text-[10px] font-semibold text-white opacity-0 pointer-events-none group-hover/mic:opacity-100 transition-all duration-150 whitespace-nowrap shadow-[0_8px_20px_rgba(0,0,0,0.5)] backdrop-blur-xl">
                  {isMuted ? 'Mic: Muted' : 'Mic: Live'}
                </div>
              </button>

              {/* Camera Toggle */}
              <button
                onClick={() => {
                  if (activeMode !== 'VIDEO' && activeMode !== 'SCREEN_SHARE') {
                    onModeChange('VIDEO');
                  }
                  onToggleCamera();
                }}
                className={`relative group/cam p-2.5 sm:p-3 rounded-[16px] transition-all duration-200 cursor-pointer ${
                  isCameraOn
                    ? 'bg-gradient-to-tr from-[#0A84FF] to-[#64D2FF] text-white shadow-[0_0_20px_rgba(100,210,255,0.5)] border border-white/30 scale-105'
                    : 'bg-white/[0.04] text-white/70 hover:bg-white/[0.09] hover:text-white border border-white/[0.08]'
                }`}
                title={isCameraOn ? 'Turn Camera Off' : 'Turn Camera On'}
              >
                {isCameraOn ? <Video className="w-4 h-4 stroke-[2.2]" /> : <VideoOff className="w-4 h-4 stroke-[2.2]" />}

                <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-[10px] bg-[#141724]/95 border border-white/[0.12] text-[10px] font-semibold text-white opacity-0 pointer-events-none group-hover/cam:opacity-100 transition-all duration-150 whitespace-nowrap shadow-[0_8px_20px_rgba(0,0,0,0.5)] backdrop-blur-xl">
                  {isCameraOn ? 'Camera: Active' : 'Camera: Off'}
                </div>
              </button>

              {/* Screen Share Toggle */}
              <button
                onClick={() => {
                  if (activeMode !== 'SCREEN_SHARE') {
                    onModeChange('SCREEN_SHARE');
                  }
                  onToggleScreen();
                }}
                className={`relative group/screen p-2.5 sm:p-3 rounded-[16px] transition-all duration-200 cursor-pointer ${
                  isScreenOn
                    ? 'bg-gradient-to-tr from-[#5E5CE6] to-[#BF5AF2] text-white shadow-[0_0_20px_rgba(191,90,242,0.5)] border border-white/30 scale-105'
                    : 'bg-white/[0.04] text-white/70 hover:bg-white/[0.09] hover:text-white border border-white/[0.08]'
                }`}
                title={isScreenOn ? 'Stop Sharing' : 'Share Screen'}
              >
                <Monitor className="w-4 h-4 stroke-[2.2]" />

                <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-[10px] bg-[#141724]/95 border border-white/[0.12] text-[10px] font-semibold text-white opacity-0 pointer-events-none group-hover/screen:opacity-100 transition-all duration-150 whitespace-nowrap shadow-[0_8px_20px_rgba(0,0,0,0.5)] backdrop-blur-xl">
                  {isScreenOn ? 'Sharing Screen' : 'Share Display'}
                </div>
              </button>

              {/* Google Meet / Zoom Style In-Meeting Reactions Trigger */}
              <button
                onClick={() => setIsReactionsTrayOpen(!isReactionsTrayOpen)}
                className={`relative group/react p-2.5 sm:p-3 rounded-[16px] transition-all duration-200 cursor-pointer ${
                  isReactionsTrayOpen
                    ? 'bg-gradient-to-tr from-[#FFBD2E] to-[#FF9F0A] text-black font-bold shadow-[0_0_20px_rgba(255,189,46,0.6)] scale-105'
                    : 'bg-white/[0.04] text-white/70 hover:bg-white/[0.09] hover:text-white border border-white/[0.08]'
                }`}
                title="In-Meeting Emoji Reactions"
              >
                <Smile className="w-4 h-4 stroke-[2.2]" />

                <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-[10px] bg-[#141724]/95 border border-white/[0.12] text-[10px] font-semibold text-white opacity-0 pointer-events-none group-hover/react:opacity-100 transition-all duration-150 whitespace-nowrap shadow-[0_8px_20px_rgba(0,0,0,0.5)] backdrop-blur-xl">
                  Send Reactions
                </div>
              </button>

              {/* Floating Picture-in-Picture (PiP) */}
              <button
                onClick={onTogglePiP}
                className={`relative group/pip p-2.5 sm:p-3 rounded-[16px] transition-all duration-200 cursor-pointer ${
                  isPiPOpen
                    ? 'bg-[#FF9F0A]/20 text-[#FF9F0A] border border-[#FF9F0A]/50 shadow-[0_0_16px_rgba(255,159,10,0.3)]'
                    : 'bg-white/[0.04] text-white/70 hover:bg-white/[0.09] hover:text-white border border-white/[0.08]'
                }`}
                title="Floating Presenter Stage (Picture-in-Picture)"
              >
                <PictureInPicture2 className="w-4 h-4 stroke-[2.2]" />

                <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-[10px] bg-[#141724]/95 border border-white/[0.12] text-[10px] font-semibold text-white opacity-0 pointer-events-none group-hover/pip:opacity-100 transition-all duration-150 whitespace-nowrap shadow-[0_8px_20px_rgba(0,0,0,0.5)] backdrop-blur-xl">
                  Floating PiP Stage
                </div>
              </button>
            </div>

            <div className="w-[1px] h-7 bg-white/[0.1] mx-0.5" />
          </>
        )}

        {/* 3. Intelligent Tools: Recording, AI Whisper, Docs, Roster */}
        <div className="flex items-center gap-1.5">
          {/* Permission-Gated Host Recording (Only during live calls) */}
          {isHost && activeMode !== 'TEXT' && (
            <button
              onClick={onToggleRecording}
              className={`relative group/rec p-2.5 sm:p-3 rounded-[16px] transition-all duration-200 cursor-pointer ${
                isRecording
                  ? 'bg-[#FF453A] text-white shadow-[0_0_20px_rgba(255,69,58,0.7)] border border-white/20 animate-pulse'
                  : 'bg-white/[0.04] text-white/70 hover:bg-white/[0.09] hover:text-white border border-white/[0.08]'
              }`}
              title={isRecording ? 'Stop Recording' : 'Start Recording Session'}
            >
              <CircleDot className={`w-4 h-4 stroke-[2.2] ${isRecording ? 'text-white' : 'text-[#FF453A]'}`} />

              <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-[10px] bg-[#141724]/95 border border-white/[0.12] text-[10px] font-semibold text-white opacity-0 pointer-events-none group-hover/rec:opacity-100 transition-all duration-150 whitespace-nowrap shadow-[0_8px_20px_rgba(0,0,0,0.5)] backdrop-blur-xl">
                {isRecording ? 'Recording (Consent Active)' : 'Record Meeting'}
              </div>
            </button>
          )}

          {/* Whisper AI Scribe, Live Translation & MOM */}
          <button
            onClick={onToggleWhisper}
            className={`relative group/whisper p-2.5 sm:p-3 rounded-[16px] transition-all duration-200 cursor-pointer ${
              isWhisperOpen
                ? 'bg-gradient-to-tr from-[#BF5AF2] via-[#5E5CE6] to-[#0A84FF] text-white shadow-[0_0_24px_rgba(191,90,242,0.6)] border border-white/30 scale-105'
                : 'bg-[#BF5AF2]/15 text-[#BF5AF2] hover:bg-[#BF5AF2] hover:text-white border border-[#BF5AF2]/30 shadow-sm'
            }`}
            title="Open Whisper AI Scribe, Live Translation & MOM"
          >
            <Sparkles className="w-4 h-4 stroke-[2.2]" />

            <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-[10px] bg-[#141724]/95 border border-white/[0.12] text-[10px] font-semibold text-white opacity-0 pointer-events-none group-hover/whisper:opacity-100 transition-all duration-150 whitespace-nowrap shadow-[0_8px_20px_rgba(0,0,0,0.5)] backdrop-blur-xl">
              AI Scribe & MOM
            </div>
          </button>

          {/* Stage Roster Members */}
          <button
            onClick={onToggleParticipants}
            className={`relative group/roster flex items-center gap-1.5 px-3 py-2 rounded-[16px] transition-all duration-200 cursor-pointer ${
              isParticipantsOpen
                ? 'bg-white/[0.12] text-white border border-white/20'
                : 'bg-white/[0.04] text-white/70 hover:bg-white/[0.09] hover:text-white border border-white/[0.08]'
            }`}
            title="Toggle Stage Members Roster"
          >
            <Users className="w-4 h-4 text-[#5E5CE6] stroke-[2.2]" />
            <span className="text-xs font-bold font-mono">{participantCount}</span>

            <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-[10px] bg-[#141724]/95 border border-white/[0.12] text-[10px] font-semibold text-white opacity-0 pointer-events-none group-hover/roster:opacity-100 transition-all duration-150 whitespace-nowrap shadow-[0_8px_20px_rgba(0,0,0,0.5)] backdrop-blur-xl">
              {participantCount} Connected
            </div>
          </button>

          {/* Interactive User Documentation */}
          <button
            onClick={onToggleDocs}
            className="relative group/docs p-2.5 sm:p-3 rounded-[16px] bg-white/[0.04] text-white/70 hover:bg-[#5E5CE6] hover:text-white border border-white/[0.08] hover:border-[#5E5CE6] transition-all duration-200 cursor-pointer shadow-sm hover:scale-105"
            title="Interactive User Guide & Documentation"
          >
            <BookOpen className="w-4 h-4 text-[#5E5CE6] group-hover/docs:text-white transition-colors stroke-[2.2]" />

            <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-[10px] bg-[#141724]/95 border border-white/[0.12] text-[10px] font-semibold text-white opacity-0 pointer-events-none group-hover/docs:opacity-100 transition-all duration-150 whitespace-nowrap shadow-[0_8px_20px_rgba(0,0,0,0.5)] backdrop-blur-xl">
              Documentation Hub
            </div>
          </button>

          {/* Leave Stage Button (Only during active calling modes) */}
          {activeMode !== 'TEXT' && (
            <>
              <div className="w-[1px] h-7 bg-white/[0.1] mx-0.5" />
              <button
                onClick={onDisconnect}
                className="relative group/leave p-2.5 sm:p-3 rounded-[16px] bg-[#FF453A] hover:bg-[#FF375F] text-white shadow-[0_4px_20px_rgba(255,69,58,0.5)] border border-white/20 hover:scale-105 transition-all duration-200 cursor-pointer"
                title="Leave Stage (Ctrl+W)"
              >
                <PhoneOff className="w-4 h-4 stroke-[2.2]" />

                <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-[10px] bg-[#141724]/95 border border-white/[0.12] text-[10px] font-semibold text-[#FF453A] opacity-0 pointer-events-none group-hover/leave:opacity-100 transition-all duration-150 whitespace-nowrap shadow-[0_8px_20px_rgba(0,0,0,0.5)] backdrop-blur-xl">
                  Leave Stage
                </div>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
