'use client';

import * as React from 'react';
import { RoomCommunicationMode } from '@mivo/shared';
import { MessageSquare, Mic, Video, Monitor, Radio } from 'lucide-react';

export interface RoomModeSwitcherProps {
  activeMode: RoomCommunicationMode;
  onModeChange: (mode: RoomCommunicationMode) => void;
}

export const RoomModeSwitcher: React.FC<RoomModeSwitcherProps> = ({
  activeMode,
  onModeChange,
}) => {
  const modes: Array<{ id: RoomCommunicationMode; label: string; icon: any }> = [
    { id: 'TEXT', label: 'Chat', icon: MessageSquare },
    { id: 'VOICE', label: 'Voice Huddle', icon: Mic },
    { id: 'VIDEO', label: 'Video Meeting', icon: Video },
    { id: 'SCREEN_SHARE', label: 'Screen Share', icon: Monitor },
    { id: 'STREAM', label: 'Live Stage', icon: Radio },
  ];

  return (
    <div className="flex items-center gap-1 p-1 bg-slate-900/90 border border-slate-800 rounded-xl shadow-inner select-none">
      {modes.map((item) => {
        const Icon = item.icon;
        const isActive = activeMode === item.id;

        return (
          <button
            key={item.id}
            onClick={() => onModeChange(item.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer ${
              isActive
                ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
};
