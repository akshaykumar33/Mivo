'use client';

import * as React from 'react';
import { RoomDTO, RoomCommunicationMode } from '@mivo/shared';
import { RoomModeSwitcher } from './RoomModeSwitcher';
import { Users, Lock, Unlock } from 'lucide-react';

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
    <header className="h-14 px-5 bg-[#151A26] border-b border-slate-800/80 flex items-center justify-between shadow-sm select-none z-10">
      {/* Room Title & Metadata */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-1.5">
          <h2 className="text-sm font-bold text-slate-100 truncate">{room.name}</h2>
          {room.isLocked ? (
            <span title="Locked Room">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
            </span>
          ) : null}
        </div>
        {room.description && (
          <span className="text-xs text-slate-400 truncate border-l border-slate-700 pl-3">
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
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 transition-colors"
          title="Toggle Participant List"
        >
          <Users className="w-3.5 h-3.5 text-violet-400" />
          <span>{participantCount}</span>
        </button>
      </div>
    </header>
  );
};
