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
  Sparkles,
  Users,
  CircleDot,
  PhoneOff,
  Smile,
  Hand,
  MoreVertical,
  BookOpen,
  Palette,
  PictureInPicture2,
  Code2,
} from 'lucide-react';
import { reactionBus } from '@/features/rooms/FloatingReactionsLayer';
import { useThemeStore } from '@/stores/themeStore';
import { GraphicalReaction } from '@/features/reactions';
import { useRoomAudioLevel } from '@/features/rooms/hooks';

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
  const { setIsThemeModalOpen } = useThemeStore();
  const [isReactionsTrayOpen, setIsReactionsTrayOpen] = React.useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = React.useState(false);
  const reactionsTrayRef = React.useRef<HTMLDivElement>(null);
  const moreMenuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (reactionsTrayRef.current && !reactionsTrayRef.current.contains(e.target as Node)) {
        setIsReactionsTrayOpen(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setIsMoreMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const workspaceModes: Array<{
    id: RoomCommunicationMode;
    label: string;
    icon: any;
    color: string;
    glow: string;
  }> = [
    { id: 'TEXT', label: 'Chat', icon: MessageSquare, color: 'from-[#0A84FF] to-[#5E5CE6]', glow: 'shadow-[0_2px_10px_rgba(10,132,255,0.35)]' },
    { id: 'CANVAS', label: 'Canvas', icon: Palette, color: 'from-[#FF9F0A] to-[#FFD60A]', glow: 'shadow-[0_2px_10px_rgba(255,159,10,0.35)]' },
    { id: 'CODE', label: 'Code', icon: Code2, color: 'from-[#30D158] to-[#0A84FF]', glow: 'shadow-[0_2px_10px_rgba(48,209,88,0.35)]' },
  ];

  const reactionList = ['heart', 'thumbs_up', 'fire', 'party', 'laugh', 'rocket', 'hundred', 'sparkles', 'clap'];

  const handleSendReaction = (emoji: string) => {
    reactionBus.emit(emoji);
    setIsReactionsTrayOpen(false);
  };

  const storeAudioLevel = useRoomAudioLevel();
  const currentAudioLevel = audioLevel ?? storeAudioLevel;
  const isSpeaking = !isMuted && currentAudioLevel > 15;
  const isInCall = activeMode !== 'TEXT' || isCameraOn || !isMuted || isScreenOn;

  // Tooltip helper
  const Tip = ({ text, groupClass }: { text: string; groupClass: string }) => (
    <div className={`absolute -top-10 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-lg bg-[var(--bg-surface-0)] border border-[var(--border-subtle)] text-[10px] font-semibold text-[var(--text-primary)] opacity-0 pointer-events-none ${groupClass} transition-opacity duration-150 whitespace-nowrap shadow-xl backdrop-blur-xl z-50`}>
      {text}
    </div>
  );

  return (
    <div className="fixed bottom-3 sm:bottom-5 left-1/2 -translate-x-1/2 z-40 pointer-events-auto select-none">
      {/* Reactions Popover */}
      {isReactionsTrayOpen && (
        <div
          ref={reactionsTrayRef}
          className="absolute bottom-16 left-1/2 -translate-x-1/2 mb-1 p-2 rounded-2xl bg-[var(--bg-surface-0)] border border-[var(--border-subtle)] backdrop-blur-3xl shadow-2xl flex items-center gap-1 z-50 animate-slide-up"
        >
          {reactionList.map((rId) => (
            <button
              key={rId}
              onClick={() => handleSendReaction(rId)}
              className="p-1.5 sm:p-2 rounded-xl hover:bg-black/[0.06] hover:scale-125 active:scale-95 transition-all cursor-pointer flex items-center justify-center"
            >
              <GraphicalReaction name={rId} size="md" />
            </button>
          ))}
          <div className="w-px h-5 bg-[var(--border-subtle)] mx-0.5" />
          <button
            onClick={() => handleSendReaction('raise_hand')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#FFBD2E]/15 hover:bg-[#FFBD2E]/30 text-[#B45309] text-xs font-bold transition-all cursor-pointer"
          >
            <GraphicalReaction name="raise_hand" size="xs" />
            <span>Raise</span>
          </button>
        </div>
      )}

      {/* More Menu Popover */}
      {isMoreMenuOpen && (
        <div
          ref={moreMenuRef}
          className="absolute bottom-16 right-0 mb-1 w-52 rounded-2xl bg-[var(--bg-surface-0)] border border-[var(--border-subtle)] backdrop-blur-3xl shadow-2xl py-1.5 z-50 animate-slide-up"
        >
          <div className="px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-muted)] border-b border-[var(--border-subtle)]">
            Stage Preferences
          </div>
          {isHost && isInCall && (
            <button
              onClick={() => { onToggleRecording(); setIsMoreMenuOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:bg-white/[0.06] hover:text-[var(--text-primary)] transition-colors text-left cursor-pointer"
            >
              <CircleDot className={`w-4 h-4 ${isRecording ? 'text-white' : 'text-[#FF453A]'}`} />
              <span>{isRecording ? 'Stop Recording' : 'Record Stage'}</span>
            </button>
          )}
          <button
            onClick={() => { onTogglePiP(); setIsMoreMenuOpen(false); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:bg-white/[0.06] hover:text-[var(--text-primary)] transition-colors text-left cursor-pointer"
          >
            <PictureInPicture2 className={`w-4 h-4 ${isPiPOpen ? 'text-[#FF9F0A]' : 'text-[var(--text-muted)]'}`} />
            <span>{isPiPOpen ? 'Close PiP' : 'Picture-in-Picture'}</span>
          </button>
          <button
            onClick={() => { onToggleDocs(); setIsMoreMenuOpen(false); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:bg-white/[0.06] hover:text-[var(--text-primary)] transition-colors text-left cursor-pointer"
          >
            <BookOpen className="w-4 h-4 text-[#5E5CE6]" />
            <span>Documentation Hub</span>
          </button>
          <button
            onClick={() => { setIsThemeModalOpen(true); setIsMoreMenuOpen(false); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:bg-white/[0.06] hover:text-[var(--text-primary)] transition-colors text-left cursor-pointer"
          >
            <Palette className="w-4 h-4 text-[#BF5AF2]" />
            <span>Switch Visual Theme</span>
          </button>
        </div>
      )}

      {/* ═══ Main Dock Bar ═══ */}
      <div
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        className="relative flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-2xl bg-[var(--bg-surface-0)]/95 dark:bg-[#0A0C13]/90 border border-black/10 dark:border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.7)] backdrop-blur-2xl max-w-[calc(100vw-24px)] overflow-x-auto scrollbar-none no-scrollbar"
      >
        {/* Top highlight line */}
        <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        {/* ── Workspace / Stage Pills (Chat, Canvas, Code) ── */}
        <div className="flex items-center gap-0.5 p-0.5 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.08] dark:border-white/10 flex-shrink-0">
          {workspaceModes.map((mode) => {
            const Icon = mode.icon;
            const isActive = activeMode === mode.id;
            return (
              <button
                key={mode.id}
                onClick={() => onModeChange(mode.id)}
                className={`relative group/btn flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-[10px] text-xs font-bold transition-all duration-150 cursor-pointer ${
                  isActive
                    ? `bg-gradient-to-r ${mode.color} !text-white shadow-md ${mode.glow} border border-white/30 scale-[1.02]`
                    : 'text-stone-700 dark:text-stone-300 hover:text-stone-950 dark:hover:text-white hover:bg-white/80 dark:hover:bg-white/10'
                }`}
              >
                <Icon className="w-3.5 h-3.5 stroke-[2.2]" />
                <span className="hidden sm:inline font-display">{mode.label}</span>
                <Tip text={`${mode.label} Stage`} groupClass="group-hover/btn:opacity-100" />
              </button>
            );
          })}
        </div>

        {/* ── Separator ── */}
        <div className="w-px h-4 sm:h-5 bg-black/10 dark:bg-white/15 flex-shrink-0 mx-0.5" />

        {/* ── Media Devices & Stage Controls (Mic / Camera / Screen Share - Single Unique Controls) ── */}
        <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
          {/* Mic / Voice Toggle */}
          <button
            onClick={() => {
              if (activeMode === 'TEXT' || activeMode === 'CANVAS' || activeMode === 'CODE') {
                onModeChange('VOICE');
              }
              onToggleMute();
            }}
            className={`relative group/mic p-2 sm:p-2.5 rounded-xl transition-all duration-150 cursor-pointer ${
              isMuted
                ? 'bg-[#FF453A]/15 text-[#FF453A] border border-[#FF453A]/30 hover:bg-[#FF453A] hover:!text-white'
                : isSpeaking
                ? 'bg-[#30D158] !text-black shadow-[0_0_16px_rgba(48,209,88,0.5)] scale-105 border border-white/30'
                : activeMode === 'VOICE'
                ? 'bg-[#30D158] !text-black shadow-md shadow-[#30D158]/40 border border-white/20'
                : 'bg-[#30D158]/15 text-[#16a34a] dark:text-[#30D158] border border-[#30D158]/30 hover:bg-[#30D158] hover:!text-black'
            }`}
          >
            {isMuted ? <MicOff className="w-3.5 sm:w-4 h-3.5 sm:h-4" /> : <Mic className="w-3.5 sm:w-4 h-3.5 sm:h-4" />}
            <Tip text={isMuted ? 'Unmute Microphone' : 'Mute Microphone'} groupClass="group-hover/mic:opacity-100" />
          </button>

          {/* Camera / Video Meeting Toggle */}
          <button
            onClick={() => {
              if (!isCameraOn) {
                onModeChange('VIDEO');
              }
              onToggleCamera();
            }}
            className={`relative group/cam p-2 sm:p-2.5 rounded-xl transition-all duration-150 cursor-pointer ${
              isCameraOn || activeMode === 'VIDEO'
                ? 'bg-[#0A84FF] !text-white hover:bg-[#0A84FF]/90 shadow-md shadow-[#0A84FF]/35 border border-white/20'
                : 'bg-black/[0.04] dark:bg-white/[0.06] text-stone-700 dark:text-stone-300 border border-black/[0.08] dark:border-white/10 hover:bg-black/[0.08] dark:hover:bg-white/[0.12] hover:text-stone-950 dark:hover:text-white'
            }`}
          >
            {isCameraOn ? <Video className="w-3.5 sm:w-4 h-3.5 sm:h-4" /> : <VideoOff className="w-3.5 sm:w-4 h-3.5 sm:h-4" />}
            <Tip text={isCameraOn ? 'Turn Off Camera' : 'Turn On Camera'} groupClass="group-hover/cam:opacity-100" />
          </button>

          {/* Screen Share / Broadcast Toggle */}
          <button
            onClick={() => {
              if (!isScreenOn) {
                onModeChange('SCREEN_SHARE');
              }
              onToggleScreen();
            }}
            className={`relative group/scr p-2 sm:p-2.5 rounded-xl transition-all duration-150 cursor-pointer ${
              isScreenOn || activeMode === 'SCREEN_SHARE'
                ? 'bg-[#5E5CE6] !text-white hover:bg-[#5E5CE6]/90 shadow-md shadow-[#5E5CE6]/35 border border-white/20'
                : 'bg-black/[0.04] dark:bg-white/[0.06] text-stone-700 dark:text-stone-300 border border-black/[0.08] dark:border-white/10 hover:bg-black/[0.08] dark:hover:bg-white/[0.12] hover:text-stone-950 dark:hover:text-white'
            }`}
          >
            <Monitor className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
            <Tip text={isScreenOn ? 'Stop Screen Share' : 'Share Screen'} groupClass="group-hover/scr:opacity-100" />
          </button>

          {/* Reactions */}
          <button
            onClick={() => setIsReactionsTrayOpen(!isReactionsTrayOpen)}
            className={`relative group/react p-2 sm:p-2.5 rounded-xl transition-all duration-150 cursor-pointer ${
              isReactionsTrayOpen
                ? 'bg-[#FFD60A]/20 text-[#B45309] dark:text-[#FFD60A] border border-[#FFD60A]/40'
                : 'bg-black/[0.04] dark:bg-white/[0.06] text-stone-700 dark:text-stone-300 border border-black/[0.08] dark:border-white/10 hover:bg-black/[0.08] dark:hover:bg-white/[0.12] hover:text-stone-950 dark:hover:text-white'
            }`}
          >
            <Smile className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
            <Tip text="Reactions" groupClass="group-hover/react:opacity-100" />
          </button>
        </div>

        {/* ── Separator ── */}
        <div className="w-px h-5 sm:h-6 bg-black/10 dark:bg-white/15 flex-shrink-0" />

        {/* ── AI + Participants + More ── */}
        <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
          {/* AI Scribe */}
          <button
            onClick={onToggleWhisper}
            className={`relative group/ai p-2 sm:p-2.5 rounded-xl transition-all duration-150 cursor-pointer ${
              isWhisperOpen
                ? 'bg-gradient-to-r from-[#BF5AF2] to-[#5E5CE6] !text-white shadow-[0_0_16px_rgba(191,90,242,0.5)] border border-white/20'
                : 'bg-[#BF5AF2]/15 text-[#9333ea] dark:text-[#BF5AF2] border border-[#BF5AF2]/30 hover:bg-[#BF5AF2] hover:!text-white'
            }`}
          >
            <Sparkles className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
            <Tip text="AI Scribe & MOM" groupClass="group-hover/ai:opacity-100" />
          </button>

          {/* Participants */}
          <button
            onClick={onToggleParticipants}
            className={`relative group/ppl flex items-center gap-1 px-2 sm:px-2.5 py-1.5 sm:py-2 rounded-xl transition-all duration-150 cursor-pointer ${
              isParticipantsOpen
                ? 'bg-black/[0.12] dark:bg-white/20 text-stone-950 dark:text-white border border-black/15 dark:border-white/20'
                : 'bg-black/[0.04] dark:bg-white/[0.06] text-stone-700 dark:text-stone-300 border border-black/[0.08] dark:border-white/10 hover:bg-black/[0.08] dark:hover:bg-white/[0.12] hover:text-stone-950 dark:hover:text-white'
            }`}
          >
            <Users className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-[#5E5CE6]" />
            <span className="text-[10px] sm:text-[11px] font-bold font-mono">{participantCount}</span>
            <Tip text={`${participantCount} Online`} groupClass="group-hover/ppl:opacity-100" />
          </button>

          {/* More Options */}
          <button
            onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
            className={`relative group/more p-2 sm:p-2.5 rounded-xl transition-all duration-150 cursor-pointer ${
              isMoreMenuOpen
                ? 'bg-black/[0.12] dark:bg-white/20 text-stone-950 dark:text-white border border-black/15 dark:border-white/20'
                : 'bg-black/[0.04] dark:bg-white/[0.06] text-stone-700 dark:text-stone-300 border border-black/[0.08] dark:border-white/10 hover:bg-black/[0.08] dark:hover:bg-white/[0.12] hover:text-stone-950 dark:hover:text-white'
            }`}
          >
            <MoreVertical className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
            <Tip text="More Options" groupClass="group-hover/more:opacity-100" />
          </button>
        </div>

        {/* ── Leave Button ── */}
        {isInCall && (
          <>
            <div className="w-px h-5 sm:h-6 bg-[var(--border-subtle)] flex-shrink-0" />
            <button
              onClick={onDisconnect}
              className="relative group/leave p-2 sm:p-2.5 rounded-xl bg-[#FF453A] hover:bg-[#FF2D20] !text-white shadow-[0_4px_16px_rgba(255,69,58,0.4)] hover:scale-105 transition-all cursor-pointer flex-shrink-0"
            >
              <PhoneOff className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
              <Tip text="Leave Call" groupClass="group-hover/leave:opacity-100" />
            </button>
          </>
        )}
      </div>
    </div>
  );
};
