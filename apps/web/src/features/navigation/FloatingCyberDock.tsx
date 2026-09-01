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
  ChevronUp,
  LayoutGrid,
} from 'lucide-react';

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
  const [isExpanded, setIsExpanded] = React.useState(true);

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
      color: 'from-blue-500 to-indigo-600',
      glow: 'shadow-blue-500/40',
    },
    {
      id: 'VOICE',
      label: 'Voice',
      icon: Mic,
      color: 'from-emerald-500 to-teal-600',
      glow: 'shadow-emerald-500/40',
    },
    {
      id: 'VIDEO',
      label: 'Video',
      icon: Video,
      color: 'from-cyan-500 to-blue-600',
      glow: 'shadow-cyan-500/40',
    },
    {
      id: 'SCREEN_SHARE',
      label: 'Screen',
      icon: Monitor,
      color: 'from-violet-500 to-purple-600',
      glow: 'shadow-violet-500/40',
    },
    {
      id: 'STREAM',
      label: 'Stage',
      icon: Radio,
      color: 'from-rose-500 to-pink-600',
      glow: 'shadow-rose-500/40',
    },
  ];

  const isSpeaking = !isMuted && audioLevel > 15;

  return (
    <div
      className={`fixed ${
        activeMode === 'TEXT' ? 'bottom-20 sm:bottom-22' : 'bottom-6'
      } left-1/2 -translate-x-1/2 z-40 pointer-events-auto select-none transition-all duration-300`}
    >
      {/* Outer Floating Glow Aura */}
      <div className="absolute -inset-1.5 bg-gradient-to-r from-violet-600/30 via-cyan-500/20 to-indigo-600/30 rounded-[32px] blur-xl opacity-80 group-hover:opacity-100 transition duration-500" />

      {/* Main Glass Cyber Dock Container */}
      <div className="relative flex items-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-[28px] bg-[#07090F]/90 border border-white/[0.12] backdrop-blur-3xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] ring-1 ring-white/[0.05]">
        {/* 1. Dynamic Mode Switcher Pills */}
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
          {stageModes.map((mode) => {
            const Icon = mode.icon;
            const isActive = activeMode === mode.id;

            return (
              <button
                key={mode.id}
                onClick={() => onModeChange(mode.id)}
                className={`relative group/btn flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-extrabold transition-all duration-200 cursor-pointer ${
                  isActive
                    ? `bg-gradient-to-r ${mode.color} text-white shadow-lg ${mode.glow} border border-white/30 scale-105`
                    : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.06] hover:scale-102'
                }`}
                title={`Switch stage to ${mode.label} mode`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400 group-hover/btn:text-slate-200'}`} />
                <span className="hidden md:inline font-display">{mode.label}</span>

                {/* Floating Tooltip for mobile / compact */}
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-lg bg-[#0C0E16] border border-white/[0.1] text-[10px] font-bold text-white opacity-0 pointer-events-none group-hover/btn:opacity-100 transition-opacity whitespace-nowrap shadow-xl">
                  {mode.label} Mode
                </div>
              </button>
            );
          })}
        </div>

        {/* Vertical Separator Hairline */}
        <div className="w-[1px] h-7 bg-white/[0.12] mx-0.5" />

        {/* 2. Media Hardware & Live Controls (Voice/Video/Screen Modes) */}
        <div className="flex items-center gap-1.5">
          {/* Microphone Toggle with Audio Level Halo */}
          <button
            onClick={onToggleMute}
            className={`relative group/mic p-2.5 sm:p-3 rounded-2xl transition-all duration-200 cursor-pointer ${
              isMuted
                ? 'bg-rose-500/15 text-rose-400 border border-rose-500/40 hover:bg-rose-600 hover:text-white shadow-lg shadow-rose-600/20'
                : isSpeaking
                ? 'bg-emerald-500 text-white border border-emerald-300 shadow-[0_0_25px_rgba(16,185,129,0.7)] scale-105 animate-pulse'
                : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-600 hover:text-white shadow-lg shadow-emerald-500/20'
            }`}
            title={isMuted ? 'Unmute Microphone (Ctrl+D)' : 'Mute Microphone (Ctrl+D)'}
          >
            {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}

            {/* Speaking audio wave indicator ring */}
            {isSpeaking && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            )}

            <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-lg bg-[#0C0E16] border border-white/[0.1] text-[10px] font-bold text-white opacity-0 pointer-events-none group-hover/mic:opacity-100 transition-opacity whitespace-nowrap shadow-xl">
              {isMuted ? 'Microphone: OFF' : 'Microphone: LIVE'}
            </div>
          </button>

          {/* Camera Toggle */}
          <button
            onClick={onToggleCamera}
            className={`relative group/cam p-2.5 sm:p-3 rounded-2xl transition-all duration-200 cursor-pointer ${
              isCameraOn
                ? 'bg-gradient-to-tr from-cyan-600 to-blue-600 text-white shadow-[0_0_25px_rgba(6,182,212,0.5)] border border-cyan-300/50 scale-105'
                : 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.09] hover:text-white border border-white/[0.08]'
            }`}
            title={isCameraOn ? 'Turn Camera Off (Ctrl+E)' : 'Turn Camera On (Ctrl+E)'}
          >
            {isCameraOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}

            <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-lg bg-[#0C0E16] border border-white/[0.1] text-[10px] font-bold text-white opacity-0 pointer-events-none group-hover/cam:opacity-100 transition-opacity whitespace-nowrap shadow-xl">
              {isCameraOn ? 'Camera: ON (HD)' : 'Camera: OFF'}
            </div>
          </button>

          {/* Screen Share Toggle */}
          <button
            onClick={onToggleScreen}
            className={`relative group/screen p-2.5 sm:p-3 rounded-2xl transition-all duration-200 cursor-pointer ${
              isScreenOn
                ? 'bg-gradient-to-tr from-violet-600 to-purple-600 text-white shadow-[0_0_25px_rgba(139,92,246,0.6)] border border-violet-300/50 scale-105'
                : 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.09] hover:text-white border border-white/[0.08]'
            }`}
            title={isScreenOn ? 'Stop Screen Share' : 'Share Screen / Window'}
          >
            <Monitor className="w-4 h-4" />

            <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-lg bg-[#0C0E16] border border-white/[0.1] text-[10px] font-bold text-white opacity-0 pointer-events-none group-hover/screen:opacity-100 transition-opacity whitespace-nowrap shadow-xl">
              {isScreenOn ? 'Sharing Screen' : 'Share Screen'}
            </div>
          </button>

          {/* Floating Picture-in-Picture (PiP) */}
          <button
            onClick={onTogglePiP}
            className={`relative group/pip p-2.5 sm:p-3 rounded-2xl transition-all duration-200 cursor-pointer ${
              isPiPOpen
                ? 'bg-amber-500/20 text-amber-300 border border-amber-400/50 shadow-[0_0_20px_rgba(245,158,11,0.3)]'
                : 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.09] hover:text-white border border-white/[0.08]'
            }`}
            title="Floating Presenter Stage (Picture-in-Picture)"
          >
            <PictureInPicture2 className="w-4 h-4" />

            <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-lg bg-[#0C0E16] border border-white/[0.1] text-[10px] font-bold text-white opacity-0 pointer-events-none group-hover/pip:opacity-100 transition-opacity whitespace-nowrap shadow-xl">
              Floating PiP Presenter
            </div>
          </button>
        </div>

        {/* Vertical Separator Hairline */}
        <div className="w-[1px] h-7 bg-white/[0.12] mx-0.5" />

        {/* 3. Intelligent Tools: Recording, AI Whisper, Docs, Roster */}
        <div className="flex items-center gap-1.5">
          {/* Permission-Gated Host Recording */}
          {isHost && (
            <button
              onClick={onToggleRecording}
              className={`relative group/rec p-2.5 sm:p-3 rounded-2xl transition-all duration-200 cursor-pointer ${
                isRecording
                  ? 'bg-rose-600 text-white shadow-[0_0_25px_rgba(225,29,72,0.7)] border border-rose-400 animate-pulse'
                  : 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.09] hover:text-white border border-white/[0.08]'
              }`}
              title={isRecording ? 'Stop Recording' : 'Start Recording Session'}
            >
              <CircleDot className={`w-4 h-4 ${isRecording ? 'text-white' : 'text-rose-400'}`} />

              <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-lg bg-[#0C0E16] border border-white/[0.1] text-[10px] font-bold text-white opacity-0 pointer-events-none group-hover/rec:opacity-100 transition-opacity whitespace-nowrap shadow-xl">
                {isRecording ? 'Recording (Consent Active)' : 'Record Meeting'}
              </div>
            </button>
          )}

          {/* Whisper AI Scribe, Live Translation & MOM */}
          <button
            onClick={onToggleWhisper}
            className={`relative group/whisper p-2.5 sm:p-3 rounded-2xl transition-all duration-200 cursor-pointer ${
              isWhisperOpen
                ? 'bg-gradient-to-tr from-violet-600 via-indigo-600 to-cyan-500 text-white shadow-[0_0_30px_rgba(124,58,237,0.6)] border border-violet-300/60 scale-105'
                : 'bg-violet-600/20 text-violet-300 hover:bg-violet-600 hover:text-white border border-violet-500/40 shadow-sm shadow-violet-600/20'
            }`}
            title="Open Whisper AI Scribe, Live Translation & MOM"
          >
            <Sparkles className="w-4 h-4" />

            <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-lg bg-[#0C0E16] border border-white/[0.1] text-[10px] font-bold text-white opacity-0 pointer-events-none group-hover/whisper:opacity-100 transition-opacity whitespace-nowrap shadow-xl">
              AI Scribe & MOM
            </div>
          </button>

          {/* Stage Roster Members Toggle */}
          <button
            onClick={onToggleParticipants}
            className={`relative group/roster flex items-center gap-1.5 px-3 py-2 rounded-2xl transition-all duration-200 cursor-pointer ${
              isParticipantsOpen
                ? 'bg-white/[0.12] text-white border border-white/20'
                : 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.09] hover:text-white border border-white/[0.08]'
            }`}
            title="Toggle Stage Members Roster"
          >
            <Users className="w-4 h-4 text-violet-400" />
            <span className="text-xs font-bold font-mono">{participantCount}</span>

            <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-lg bg-[#0C0E16] border border-white/[0.1] text-[10px] font-bold text-white opacity-0 pointer-events-none group-hover/roster:opacity-100 transition-opacity whitespace-nowrap shadow-xl">
              {participantCount} Connected
            </div>
          </button>

          {/* Interactive User Documentation */}
          <button
            onClick={onToggleDocs}
            className="relative group/docs p-2.5 sm:p-3 rounded-2xl bg-white/[0.04] text-slate-300 hover:bg-violet-600 hover:text-white border border-white/[0.08] hover:border-violet-400 transition-all duration-200 cursor-pointer shadow-sm hover:scale-105"
            title="Interactive User Guide & Documentation"
          >
            <BookOpen className="w-4 h-4 text-violet-300 group-hover/docs:text-white transition-colors" />

            <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-lg bg-[#0C0E16] border border-white/[0.1] text-[10px] font-bold text-white opacity-0 pointer-events-none group-hover/docs:opacity-100 transition-opacity whitespace-nowrap shadow-xl">
              Documentation Hub
            </div>
          </button>

          {/* Vertical Separator Hairline */}
          <div className="w-[1px] h-7 bg-white/[0.12] mx-0.5" />

          {/* Disconnect / Leave Stage Button */}
          <button
            onClick={onDisconnect}
            className="relative group/leave p-2.5 sm:p-3 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white shadow-[0_0_25px_rgba(225,29,72,0.5)] border border-rose-400/40 hover:scale-105 transition-all duration-200 cursor-pointer"
            title="Leave Stage / Disconnect (Ctrl+W)"
          >
            <PhoneOff className="w-4 h-4" />

            <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-lg bg-[#0C0E16] border border-white/[0.1] text-[10px] font-bold text-rose-300 opacity-0 pointer-events-none group-hover/leave:opacity-100 transition-opacity whitespace-nowrap shadow-xl">
              Leave Stage
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
