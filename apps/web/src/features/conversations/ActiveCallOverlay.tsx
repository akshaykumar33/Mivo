'use client';

import * as React from 'react';
import { useConversationStore } from '@/stores/conversationStore';
import { useAuthStore } from '@/stores/authStore';
import { Mic, MicOff, Volume2, VolumeX, PhoneOff, Users, Radio } from 'lucide-react';

export const ActiveCallOverlay: React.FC = () => {
  const { isGuest } = useAuthStore();
  const {
    activeCall,
    endCall,
    isCallMuted,
    isCallDeafened,
    toggleCallMute,
    toggleCallDeafen,
    callParticipants,
  } = useConversationStore();

  const [duration, setDuration] = React.useState(0);

  React.useEffect(() => {
    if (!activeCall) {
      setDuration(0);
      return;
    }

    const timer = setInterval(() => {
      setDuration((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [activeCall]);

  if (!activeCall || isGuest) return null;

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:bottom-6 sm:right-6 z-40 max-w-full sm:max-w-md animate-in slide-in-from-bottom-6 duration-300">
      <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-4 bg-[var(--bg-surface-0)]/95 backdrop-blur-xl border border-red-500/30 p-2.5 sm:p-3.5 rounded-2xl shadow-2xl shadow-red-950/20 text-[#111827]">
        {/* Call Info & Pulsing Indicator */}
        <div className="flex items-center gap-2 sm:gap-3 pr-2 border-r border-[var(--border-subtle)] min-w-0 flex-1 sm:flex-initial">
          <div className="relative flex-shrink-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-[#DC2626] to-[#991B1B] text-white flex items-center justify-center font-bold text-xs shadow-md shadow-red-600/25">
              {activeCall.isGroup ? <Users className="w-4 h-4 sm:w-5 sm:h-5" /> : <Radio className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" />}
            </div>
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 sm:h-3 sm:w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 sm:h-3 sm:w-3 bg-emerald-500" />
            </span>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-xs font-bold text-[#111827] max-w-[100px] sm:max-w-[140px] truncate">
                {activeCall.isGroup ? activeCall.groupName || 'Group Call' : 'Direct Audio Call'}
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-600 border border-red-500/25 flex-shrink-0">
                {activeCall.status === 'dialing' ? 'Dialing...' : formatTimer(duration)}
              </span>
            </div>
            <div className="text-[10px] sm:text-[11px] text-[#4B5563] flex items-center gap-1.5 mt-0.5 truncate">
              <span>{callParticipants.length} user{callParticipants.length === 1 ? '' : 's'}</span>
              <span>•</span>
              <span className="text-emerald-600 font-semibold">WebRTC</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          {/* Mute Button */}
          <button
            type="button"
            title={isCallMuted ? 'Unmute Microphone' : 'Mute Microphone'}
            onClick={toggleCallMute}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
              isCallMuted
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/40'
                : 'bg-black/[0.05] hover:bg-black/[0.1] text-[#4B5563] hover:text-[#111827]'
            }`}
          >
            {isCallMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          {/* Deafen Button */}
          <button
            type="button"
            title={isCallDeafened ? 'Undeafen Audio' : 'Deafen Audio'}
            onClick={toggleCallDeafen}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
              isCallDeafened
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-900/40'
                : 'bg-black/[0.05] hover:bg-black/[0.1] text-[#4B5563] hover:text-[#111827]'
            }`}
          >
            {isCallDeafened ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Hang Up Button */}
          <button
            type="button"
            title="Leave / End Call"
            onClick={endCall}
            className="h-9 px-3.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-lg shadow-rose-900/40"
          >
            <PhoneOff className="w-4 h-4" />
            <span>End</span>
          </button>
        </div>
      </div>
    </div>
  );
};
