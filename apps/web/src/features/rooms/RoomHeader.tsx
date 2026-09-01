'use client';

import * as React from 'react';
import { RoomDTO, RoomCommunicationMode } from '@mivo/shared';
import { Users, Lock, Hash, Sparkles, CircleDot, BookOpen } from 'lucide-react';
import { InteractiveDocsModal } from '@/features/docs/InteractiveDocsModal';

export interface RoomHeaderProps {
  room: RoomDTO;
  activeMode: RoomCommunicationMode;
  onModeChange: (mode: RoomCommunicationMode) => void;
  participantCount: number;
  isRecording?: boolean;
  isHost?: boolean;
  onToggleRecording?: () => void;
  onToggleParticipants?: () => void;
  onToggleWhisper?: () => void;
}

export const RoomHeader: React.FC<RoomHeaderProps> = ({
  room,
  activeMode,
  participantCount,
  isRecording = false,
  isHost = false,
  onToggleRecording,
  onToggleParticipants,
  onToggleWhisper,
}) => {
  const [elapsedSeconds, setElapsedSeconds] = React.useState(0);
  const [isDocsOpen, setIsDocsOpen] = React.useState(false);

  React.useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isRecording) {
      setElapsedSeconds(0);
      timer = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setElapsedSeconds(0);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isRecording]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <header className="h-16 px-6 bg-[#07090F]/80 border-b border-white/[0.07] backdrop-blur-2xl flex items-center justify-between shadow-sm select-none z-10 flex-shrink-0">
        {/* Room Title & macOS-Style Hash Badge */}
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[12px] bg-[#5E5CE6]/15 border border-[#5E5CE6]/30 flex items-center justify-center text-[#5E5CE6] shadow-sm">
              <Hash className="w-4 h-4 stroke-[2.5]" />
            </div>
            <h2 className="text-sm font-bold text-white font-display tracking-tight truncate">{room.name}</h2>
            {room.isLocked && (
              <span title="Private Encrypted Room">
                <Lock className="w-3.5 h-3.5 text-[#FF9F0A]" />
              </span>
            )}
          </div>

          {/* Apple Live Recording Status Badge */}
          {isRecording && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FF453A]/15 border border-[#FF453A]/40 text-[#FF453A] text-[10px] font-mono font-bold shadow-[0_0_12px_rgba(255,69,58,0.3)] animate-pulse">
              <span className="w-2 h-2 rounded-full bg-[#FF453A] animate-ping" />
              <span>REC {formatTimer(elapsedSeconds)}</span>
            </div>
          )}

          {room.description && (
            <span className="hidden lg:inline text-xs text-white/40 truncate border-l border-white/[0.08] pl-3.5">
              {room.description}
            </span>
          )}
        </div>

        {/* Center Stage Status Badge */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.06] text-xs text-white/60">
          <span className="w-1.5 h-1.5 rounded-full bg-[#30D158] animate-pulse" />
          <span className="font-semibold text-white/80 font-display">Active Stage</span>
          <span className="text-white/30">•</span>
          <span className="text-[11px] font-mono text-[#64D2FF] font-bold uppercase">{activeMode}</span>
        </div>

        {/* Right Glass Action Tray */}
        <div className="flex items-center gap-2">
          {/* Host Recording Guard */}
          {isHost && (
            <button
              onClick={onToggleRecording}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-[12px] text-xs font-semibold transition-all duration-150 cursor-pointer ${
                isRecording
                  ? 'bg-[#FF453A] text-white shadow-[0_4px_16px_rgba(255,69,58,0.5)] border border-white/20 animate-pulse'
                  : 'bg-white/[0.04] text-white/70 hover:text-white hover:bg-white/[0.08] border border-white/[0.08]'
              }`}
              title={isRecording ? 'Stop Recording' : 'Start Recording Session'}
            >
              <CircleDot className={`w-3.5 h-3.5 ${isRecording ? 'text-white' : 'text-[#FF453A]'}`} />
              <span className="hidden sm:inline">{isRecording ? 'Recording...' : 'Record'}</span>
            </button>
          )}

          {/* Whisper AI Scribe & Notes Drawer */}
          <button
            onClick={onToggleWhisper}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-[12px] text-xs font-semibold text-[#BF5AF2] hover:text-white bg-[#BF5AF2]/15 hover:bg-[#BF5AF2] border border-[#BF5AF2]/30 hover:border-[#BF5AF2] transition-all duration-200 shadow-sm cursor-pointer"
            title="Open Whisper AI Scribe, Multilingual Translation & MOM"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#BF5AF2] group-hover:text-white transition-colors" />
            <span className="hidden sm:inline">AI Notes & MOM</span>
          </button>

          {/* System User Documentation */}
          <button
            onClick={() => setIsDocsOpen(true)}
            className="p-2 rounded-[12px] text-white/50 hover:text-white hover:bg-white/[0.08] border border-white/[0.08] transition-all cursor-pointer"
            title="Interactive User Guide & Documentation"
          >
            <BookOpen className="w-4 h-4 text-[#5E5CE6]" />
          </button>

          {/* Connected Participants Toggle */}
          <button
            onClick={onToggleParticipants}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[12px] text-xs font-semibold text-white/70 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-all cursor-pointer"
            title="Toggle Stage Members Roster"
          >
            <Users className="w-3.5 h-3.5 text-[#5E5CE6]" />
            <span className="font-mono">{participantCount}</span>
          </button>
        </div>
      </header>

      <InteractiveDocsModal isOpen={isDocsOpen} onClose={() => setIsDocsOpen(false)} />
    </>
  );
};
