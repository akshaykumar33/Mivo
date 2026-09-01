'use client';

import * as React from 'react';
import { RoomDTO, RoomCommunicationMode } from '@mivo/shared';
import { RoomModeSwitcher } from './RoomModeSwitcher';
import { Users, Lock, Unlock, Hash, Sparkles, CircleDot, BookOpen } from 'lucide-react';
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
  onModeChange,
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
      <header className="h-16 px-6 bg-[#080A10]/95 border-b border-white/[0.06] backdrop-blur-xl flex items-center justify-between shadow-sm select-none z-10">
        {/* Room Title & Metadata */}
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400">
              <Hash className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-white font-display tracking-tight truncate">{room.name}</h2>
            {room.isLocked ? (
              <span title="Locked Room">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
              </span>
            ) : null}
          </div>

          {/* Global REC Pulsing Badge with Live Elapsed Timer */}
          {isRecording && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-600/20 border border-rose-500/50 text-rose-300 text-[10px] font-extrabold shadow-lg shadow-rose-600/10 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              <span>REC {formatTimer(elapsedSeconds)}</span>
            </div>
          )}

          {room.description && (
            <span className="hidden lg:inline text-xs text-slate-400 truncate border-l border-white/[0.08] pl-3.5">
              {room.description}
            </span>
          )}
        </div>

        {/* Mode Switcher */}
        <RoomModeSwitcher activeMode={activeMode} onModeChange={onModeChange} />

        {/* Right Action Tray */}
        <div className="flex items-center gap-2">
          {/* Host Record Button */}
          {isHost && (
            <button
              onClick={onToggleRecording}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                isRecording
                  ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/40 border border-rose-400 animate-pulse'
                  : 'bg-white/[0.04] text-slate-300 hover:text-white hover:bg-white/[0.08] border border-white/[0.06]'
              }`}
              title={isRecording ? 'Stop Recording' : 'Start Recording with Consent'}
            >
              <CircleDot className={`w-3.5 h-3.5 ${isRecording ? 'text-white' : 'text-rose-400'}`} />
              <span className="hidden sm:inline">{isRecording ? 'Recording...' : 'Record'}</span>
            </button>
          )}

          {/* Whisper AI Scribe & Notes Toggle */}
          <button
            onClick={onToggleWhisper}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-violet-300 hover:text-white bg-violet-600/20 hover:bg-violet-600/40 border border-violet-500/40 transition-all shadow-sm shadow-violet-600/20"
            title="Open Whisper AI Scribe, Translation & MOM"
          >
            <Sparkles className="w-3.5 h-3.5 text-violet-400" />
            <span className="hidden sm:inline">AI Notes & MOM</span>
          </button>

          {/* Interactive Documentation Button */}
          <button
            onClick={() => setIsDocsOpen(true)}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.06] border border-white/[0.06] transition-all"
            title="Platform User Documentation"
          >
            <BookOpen className="w-4 h-4 text-violet-400" />
          </button>

          {/* Participant Count Toggle */}
          <button
            onClick={onToggleParticipants}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition-all"
            title="Toggle Participant List"
          >
            <Users className="w-3.5 h-3.5 text-violet-400" />
            <span>{participantCount}</span>
          </button>
        </div>
      </header>

      <InteractiveDocsModal isOpen={isDocsOpen} onClose={() => setIsDocsOpen(false)} />
    </>
  );
};
