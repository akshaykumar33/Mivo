'use client';

import * as React from 'react';
import { useConversationStore } from '@/stores/conversationStore';
import { Mic, MicOff, Volume2, VolumeX, PhoneOff, Users, Radio } from 'lucide-react';

export const ActiveCallOverlay: React.FC = () => {
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

  if (!activeCall) return null;

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed bottom-6 right-6 z-40 animate-in slide-in-from-bottom-6 duration-300">
      <div className="flex items-center gap-4 bg-[var(--bg-surface-0)]/95 backdrop-blur-xl border border-violet-500/40 p-3.5 rounded-2xl shadow-2xl shadow-violet-950/60 text-white">
        {/* Call Info & Pulsing Indicator */}
        <div className="flex items-center gap-3 pr-2 border-r border-[var(--border-subtle)]">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center font-bold text-xs shadow-md">
              {activeCall.isGroup ? <Users className="w-5 h-5" /> : <Radio className="w-5 h-5 animate-pulse" />}
            </div>
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white max-w-[140px] truncate">
                {activeCall.isGroup ? activeCall.groupName || 'Group Call' : 'Direct Audio Call'}
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-violet-600/30 text-violet-300 border border-violet-500/30">
                {activeCall.status === 'dialing' ? 'Dialing...' : formatTimer(duration)}
              </span>
            </div>
            <div className="text-[11px] text-[var(--text-muted)] flex items-center gap-1.5 mt-0.5">
              <span>{callParticipants.length} participant{callParticipants.length === 1 ? '' : 's'}</span>
              <span>•</span>
              <span className="text-emerald-400 font-medium">Encrypted WebRTC</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Mute Button */}
          <button
            type="button"
            title={isCallMuted ? 'Unmute Microphone' : 'Mute Microphone'}
            onClick={toggleCallMute}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
              isCallMuted
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/40'
                : 'bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-white'
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
                : 'bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-white'
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
