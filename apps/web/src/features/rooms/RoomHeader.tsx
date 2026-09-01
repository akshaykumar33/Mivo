'use client';

import * as React from 'react';
import { RoomDTO, RoomCommunicationMode } from '@mivo/shared';
import { RoomModeSwitcher } from './RoomModeSwitcher';
import { Users, Lock, Unlock, Hash } from 'lucide-react';

export interface RoomHeaderProps {
  room: RoomDTO;
  activeMode: RoomCommunicationMode;
  onModeChange: (mode: RoomCommunicationMode) => void;
  participantCount: number;
  onToggleParticipants?: () => void;
}

export const RoomHeader: React.FC<RoomHeaderProps> = ({
  room,
  activeMode,
  onModeChange,
  participantCount,
  onToggleParticipants,
}) => {
  return (
    <header className="h-14 px-5 bg-[#0B0D14]/95 border-b border-white/[0.06] backdrop-blur-xl flex items-center justify-between shadow-sm select-none z-10">
      {/* Room Title & Metadata */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400">
            <Hash className="w-4 h-4" />
          </div>
          <h2 className="text-sm font-bold text-white font-display tracking-tight truncate">{room.name}</h2>
          {room.isLocked ? (
            <span title="Locked Room">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
            </span>
          ) : null}
        </div>
        {room.description && (
          <span className="hidden md:inline text-xs text-slate-400 truncate border-l border-white/[0.08] pl-3">
            {room.description}
          </span>
        )}
      </div>

      {/* Mode Switcher */}
      <RoomModeSwitcher activeMode={activeMode} onModeChange={onModeChange} />

      {/* Right Action Tray */}
      <div className="flex items-center gap-2">
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
  );
};
