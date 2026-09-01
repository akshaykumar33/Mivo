'use client';

import * as React from 'react';
import { useRoomStore } from '@/stores/roomStore';
import { useAuthStore } from '@/stores/authStore';
import { RoomHeader } from './RoomHeader';
import { MediaStage } from './MediaStage';
import { ParticipantTray } from './ParticipantTray';
import { RoomCommunicationMode } from '@mivo/shared';
import { Mic, MicOff, Video, VideoOff, Monitor, PhoneOff } from 'lucide-react';
import { useRouter } from 'next/navigation';

export interface UnifiedRoomViewProps {
  communityId: string;
  roomId: string;
}

export const UnifiedRoomView: React.FC<UnifiedRoomViewProps> = ({ communityId, roomId }) => {
  const router = useRouter();
  const { user } = useAuthStore();
  const {
    activeRoom,
    participants,
    isMuted,
    isCameraOn,
    isScreenOn,
    localStream,
    screenStream,
    audioLevel,
    joinRoom,
    leaveRoom,
    switchMode,
    toggleMute,
    toggleCamera,
    toggleScreenShare,
  } = useRoomStore();

  const [isParticipantsOpen, setIsParticipantsOpen] = React.useState(true);

  React.useEffect(() => {
    if (roomId) {
      joinRoom(roomId);
    }
    return () => {
      leaveRoom();
    };
  }, [roomId, joinRoom, leaveRoom]);

  if (!activeRoom) {
    return (
      <div className="flex-1 h-full bg-[#0E1017] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-violet-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-slate-400 font-semibold font-display">Connecting to Stage...</span>
        </div>
      </div>
    );
  }

  const handleDisconnect = () => {
    leaveRoom();
    router.push(`/communities/${communityId}`);
  };

  return (
    <div className="flex-1 h-full flex flex-col bg-[#0E1017] overflow-hidden select-none">
      {/* Top Room Header with Mode Switcher */}
      <RoomHeader
        room={activeRoom}
        activeMode={activeRoom.activeMode}
        onModeChange={(mode: RoomCommunicationMode) => switchMode(mode)}
        participantCount={participants.length}
        onToggleParticipants={() => setIsParticipantsOpen(!isParticipantsOpen)}
      />

      {/* Main Content Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Dynamic Stage View with Live Media */}
        <MediaStage
          mode={activeRoom.activeMode}
          room={activeRoom}
          participants={participants}
          currentUserId={user?.id}
          isMuted={isMuted}
          isCameraOn={isCameraOn}
          isScreenOn={isScreenOn}
          localStream={localStream}
          screenStream={screenStream}
          audioLevel={audioLevel}
        />

        {/* Collapsible Participant List */}
        <ParticipantTray
          participants={participants}
          currentUserId={user?.id}
          isOpen={isParticipantsOpen}
        />

        {/* Floating Bottom Luxury Media Bar (when mode is active) */}
        {activeRoom.activeMode !== 'TEXT' && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2.5 p-2 rounded-3xl bg-[#090B10]/90 border border-white/[0.1] backdrop-blur-2xl shadow-2xl z-30">
            <button
              onClick={() => toggleMute()}
              className={`p-3 rounded-2xl transition-all duration-200 ${
                isMuted
                  ? 'bg-rose-600/20 text-rose-400 border border-rose-500/40 hover:bg-rose-600 hover:text-white'
                  : 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-600 hover:text-white'
              }`}
              title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            <button
              onClick={() => toggleCamera()}
              className={`p-3 rounded-2xl transition-all duration-200 ${
                isCameraOn
                  ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/40 border border-cyan-400/50'
                  : 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-white border border-white/[0.06]'
              }`}
              title={isCameraOn ? 'Turn Camera Off' : 'Turn Camera On'}
            >
              {isCameraOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            </button>

            <button
              onClick={() => toggleScreenShare()}
              className={`p-3 rounded-2xl transition-all duration-200 ${
                isScreenOn
                  ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-600/40 border border-white/20'
                  : 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-white border border-white/[0.06]'
              }`}
              title={isScreenOn ? 'Stop Screen Share' : 'Share Screen'}
            >
              <Monitor className="w-5 h-5" />
            </button>

            <div className="w-[1px] h-6 bg-white/[0.1] mx-1" />

            <button
              onClick={handleDisconnect}
              className="p-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 transition-all duration-200"
              title="Leave Room"
            >
              <PhoneOff className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
