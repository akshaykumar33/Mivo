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
      <div className="flex-1 h-full bg-[#1C2232] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-violet-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-slate-400 font-medium">Connecting to Room...</span>
        </div>
      </div>
    );
  }

  const handleDisconnect = () => {
    leaveRoom();
    router.push(`/communities/${communityId}`);
  };

  return (
    <div className="flex-1 h-full flex flex-col bg-[#1C2232] overflow-hidden select-none">
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
        {/* Dynamic Stage View */}
        <MediaStage
          mode={activeRoom.activeMode}
          room={activeRoom}
          participants={participants}
          currentUserId={user?.id}
          isMuted={isMuted}
          isCameraOn={isCameraOn}
          isScreenOn={isScreenOn}
        />

        {/* Collapsible Participant List */}
        <ParticipantTray
          participants={participants}
          currentUserId={user?.id}
          isOpen={isParticipantsOpen}
        />

        {/* Floating Bottom Media Bar (when mode is active) */}
        {activeRoom.activeMode !== 'TEXT' && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 p-2 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-xl shadow-2xl z-20">
            <button
              onClick={toggleMute}
              className={`p-3 rounded-xl transition-all duration-150 ${
                isMuted
                  ? 'bg-rose-600/20 text-rose-400 border border-rose-500/40 hover:bg-rose-600 hover:text-white'
                  : 'bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white'
              }`}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            <button
              onClick={toggleCamera}
              className={`p-3 rounded-xl transition-all duration-150 ${
                isCameraOn
                  ? 'bg-cyan-600/20 text-cyan-400 border border-cyan-500/40 hover:bg-cyan-600 hover:text-white'
                  : 'bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white'
              }`}
              title={isCameraOn ? 'Turn Camera Off' : 'Turn Camera On'}
            >
              {isCameraOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            </button>

            <button
              onClick={toggleScreenShare}
              className={`p-3 rounded-xl transition-all duration-150 ${
                isScreenOn
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/40'
                  : 'bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white'
              }`}
              title="Share Screen"
            >
              <Monitor className="w-5 h-5" />
            </button>

            <div className="w-[1px] h-6 bg-slate-800 mx-1" />

            <button
              onClick={handleDisconnect}
              className="p-3 rounded-xl bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white shadow-lg shadow-rose-600/30 transition-all"
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
