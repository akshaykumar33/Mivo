'use client';

import * as React from 'react';
import { RoomCommunicationMode } from '@mivo/shared';
import { MessageSquare, Mic, Video, Monitor, Palette, Code2 } from 'lucide-react';

export interface RoomModeSwitcherProps {
  activeMode: RoomCommunicationMode;
  onModeChange: (mode: RoomCommunicationMode) => void;
}

export const RoomModeSwitcher: React.FC<RoomModeSwitcherProps> = ({
  activeMode,
  onModeChange,
}) => {
  const modes: Array<{
    id: RoomCommunicationMode;
    label: string;
    icon: any;
    color: string;
    glow: string;
  }> = [
    { id: 'TEXT', label: 'Chat', icon: MessageSquare, color: 'from-[#0A84FF] to-[#5E5CE6]', glow: 'shadow-[0_2px_10px_rgba(10,132,255,0.35)]' },
    { id: 'VOICE', label: 'Voice', icon: Mic, color: 'from-[#30D158] to-[#63E6E2]', glow: 'shadow-[0_2px_10px_rgba(48,209,88,0.35)]' },
    { id: 'VIDEO', label: 'Video', icon: Video, color: 'from-[#64D2FF] to-[#0A84FF]', glow: 'shadow-[0_2px_10px_rgba(10,132,255,0.35)]' },
    { id: 'SCREEN_SHARE', label: 'Screen', icon: Monitor, color: 'from-[#5E5CE6] to-[#BF5AF2]', glow: 'shadow-[0_2px_10px_rgba(94,92,230,0.35)]' },
    { id: 'CANVAS', label: 'Canvas', icon: Palette, color: 'from-[#FF9F0A] to-[#FFD60A]', glow: 'shadow-[0_2px_10px_rgba(255,159,10,0.35)]' },
    { id: 'CODE', label: 'Code', icon: Code2, color: 'from-[#30D158] to-[#0A84FF]', glow: 'shadow-[0_2px_10px_rgba(48,209,88,0.35)]' },
  ];

  return (
    <div className="flex items-center gap-0.5 sm:gap-1 p-1 bg-black/[0.05] dark:bg-white/[0.06] border border-black/[0.08] dark:border-white/10 rounded-2xl shadow-inner select-none backdrop-blur-xl">
      {modes.map((item) => {
        const Icon = item.icon;
        const isActive = activeMode === item.id;

        return (
          <button
            key={item.id}
            onClick={() => onModeChange(item.id)}
            title={`${item.label} Mode`}
            className={`group relative flex items-center gap-1.5 px-2.5 xl:px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer ${
              isActive
                ? `bg-gradient-to-r ${item.color} !text-white font-bold shadow-md ${item.glow} border border-white/30 scale-[1.02]`
                : 'text-stone-700 dark:text-stone-300 hover:text-stone-950 dark:hover:text-white hover:bg-white/90 dark:hover:bg-white/10 hover:shadow-xs'
            }`}
          >
            <Icon className={`w-3.5 h-3.5 stroke-[2.2] flex-shrink-0 transition-colors ${isActive ? '!text-white' : 'text-stone-500 dark:text-stone-400 group-hover:text-stone-900 dark:group-hover:text-white'}`} />
            <span className="hidden xl:inline font-display truncate">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
};
