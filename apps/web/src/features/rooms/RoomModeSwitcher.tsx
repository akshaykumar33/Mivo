'use client';

import * as React from 'react';
import { RoomCommunicationMode } from '@mivo/shared';
import { MessageSquare, Mic, Video, Monitor, Radio, Palette } from 'lucide-react';

export interface RoomModeSwitcherProps {
  activeMode: RoomCommunicationMode;
  onModeChange: (mode: RoomCommunicationMode) => void;
}

export const RoomModeSwitcher: React.FC<RoomModeSwitcherProps> = ({
  activeMode,
  onModeChange,
}) => {
  const modes: Array<{ id: RoomCommunicationMode; label: string; icon: any; color: string }> = [
    { id: 'TEXT', label: 'Chat', icon: MessageSquare, color: 'from-[#0A84FF] to-[#5E5CE6]' },
    { id: 'VOICE', label: 'Voice Huddle', icon: Mic, color: 'from-[#30D158] to-[#63E6E2]' },
    { id: 'VIDEO', label: 'Video Meeting', icon: Video, color: 'from-[#64D2FF] to-[#0A84FF]' },
    { id: 'SCREEN_SHARE', label: 'Screen Share', icon: Monitor, color: 'from-[#5E5CE6] to-[#BF5AF2]' },
    { id: 'STREAM', label: 'Live Stage', icon: Radio, color: 'from-[#FF375F] to-[#FF453A]' },
    { id: 'CANVAS', label: 'Canvas Stage', icon: Palette, color: 'from-[#FF9F0A] to-[#FFD60A]' },
  ];

  return (
    <div className="flex items-center gap-1 p-1 bg-white/[0.04] border border-white/[0.07] rounded-[14px] shadow-inner select-none backdrop-blur-xl">
      {modes.map((item) => {
        const Icon = item.icon;
        const isActive = activeMode === item.id;

        return (
          <button
            key={item.id}
            onClick={() => onModeChange(item.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-xs font-semibold transition-all duration-200 cursor-pointer ${
              isActive
                ? `bg-gradient-to-r ${item.color} text-white shadow-[0_4px_14px_rgba(94,92,230,0.35)] border border-white/25 scale-102`
                : 'text-white/50 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <Icon className={`w-3.5 h-3.5 stroke-[2.2] ${isActive ? 'text-white' : 'text-white/50'}`} />
            <span className="hidden sm:inline font-display">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
};
