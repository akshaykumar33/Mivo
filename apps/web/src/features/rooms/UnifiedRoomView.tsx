'use client';

import * as React from 'react';
import { useRoomStore } from '@/stores/roomStore';
import { useAuthStore } from '@/stores/authStore';
import { RoomHeader } from './RoomHeader';
import { MediaStage } from './MediaStage';
import { ParticipantTray } from './ParticipantTray';
import { WhisperScribeDrawer } from '@/features/transcription/WhisperScribeDrawer';
import { FloatingPiPOverlay } from './FloatingPiPOverlay';
import { RecordingConsentBanner } from './RecordingConsentBanner';
import { RoomCommunicationMode, REALTIME_EVENTS, RoomRecordingStatePayload } from '@mivo/shared';
import { Mic, MicOff, Video, VideoOff, Monitor, PhoneOff, PictureInPicture2, CircleDot } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { realtime } from '@/lib/socket-client';
import { recorderManager } from '@/lib/recorder-manager';

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
    remoteStreams,
    audioLevel,
    joinRoom,
    leaveRoom,
    switchMode,
    toggleMute,
    toggleCamera,
    toggleScreenShare,
  } = useRoomStore();

  const [isParticipantsOpen, setIsParticipantsOpen] = React.useState(true);
  const [isWhisperOpen, setIsWhisperOpen] = React.useState(false);
  const [isPiPOpen, setIsPiPOpen] = React.useState(false);
  const [isRecording, setIsRecording] = React.useState(false);
  const [recordingHostName, setRecordingHostName] = React.useState('Host');

  React.useEffect(() => {
    if (roomId && user?.id) {
      joinRoom(roomId, user.id);
    }
    return () => {
      leaveRoom();
    };
  }, [roomId, user?.id, joinRoom, leaveRoom]);

  // Listen for room-wide recording state changes
  React.useEffect(() => {
    const socket = realtime.getSocket();
    if (!socket || !roomId) return;

    const handleRecordingState = (data: RoomRecordingStatePayload) => {
      if (data.roomId === roomId) {
        setIsRecording(data.isRecording);
        if (data.hostName) setRecordingHostName(data.hostName);
      }
    };

    socket.on(REALTIME_EVENTS.ROOM_RECORDING_STATE_CHANGED, handleRecordingState);

    return () => {
      socket.off(REALTIME_EVENTS.ROOM_RECORDING_STATE_CHANGED, handleRecordingState);
    };
  }, [roomId]);

  // Auto-open PiP overlay if presenting screen
  React.useEffect(() => {
    if (isScreenOn) {
      setIsPiPOpen(true);
    }
  }, [isScreenOn]);

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
    if (isRecording) {
      recorderManager.stopRecording();
    }
    leaveRoom();
    router.push(`/communities/${communityId}`);
  };

  const isHost = user?.email === 'dev@mivo.app' || user?.email === 'alex@mivo.app';

  const handleToggleRecording = async () => {
    const socket = realtime.getSocket();
    if (!socket || !activeRoom) return;

    if (!isRecording) {
      const started = await recorderManager.startRecording(screenStream || localStream);
      if (started) {
        setIsRecording(true);
        socket.emit(REALTIME_EVENTS.ROOM_RECORDING_START, { roomId: activeRoom.id });
      }
    } else {
      recorderManager.stopRecording();
      setIsRecording(false);
      socket.emit(REALTIME_EVENTS.ROOM_RECORDING_STOP, { roomId: activeRoom.id });
    }
  };

  const handleHostAction = (action: 'MUTE' | 'KICK' | 'TRANSFER_HOST', targetUserId: string) => {
    const socket = realtime.getSocket();
    if (socket && activeRoom) {
      socket.emit(REALTIME_EVENTS.ROOM_HOST_ACTION, {
        roomId: activeRoom.id,
        action,
        targetUserId,
      });
    }
  };

  return (
    <div className="flex-1 h-full flex flex-col bg-[#0E1017] overflow-hidden select-none">
      {/* Top Room Header with Mode Switcher & Whisper AI Notes Trigger */}
      <RoomHeader
        room={activeRoom}
        activeMode={activeRoom.activeMode}
        onModeChange={(mode: RoomCommunicationMode) => switchMode(mode)}
        participantCount={participants.length}
        isRecording={isRecording}
        isHost={isHost}
        onToggleRecording={handleToggleRecording}
        onToggleParticipants={() => setIsParticipantsOpen(!isParticipantsOpen)}
        onToggleWhisper={() => setIsWhisperOpen(!isWhisperOpen)}
      />

      {/* Permission-Gated Room-Wide Recording Consent Alert Banner */}
      <RecordingConsentBanner
        isRecording={isRecording}
        hostName={recordingHostName}
        onConsentDismiss={() => {}}
        onLeaveCall={handleDisconnect}
      />

      {/* Main Content Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Dynamic Stage View with Live Media */}
        <MediaStage
          mode={activeRoom.activeMode}
          room={activeRoom}
          participants={participants}
          currentUserId={user?.id}
          isHost={isHost}
          isMuted={isMuted}
          isCameraOn={isCameraOn}
          isScreenOn={isScreenOn}
          localStream={localStream}
          screenStream={screenStream}
          remoteStreams={remoteStreams}
          audioLevel={audioLevel}
        />

        {/* Collapsible Participant List with Host Actions */}
        <ParticipantTray
          participants={participants}
          currentUserId={user?.id}
          isHost={isHost}
          onHostAction={handleHostAction}
          isOpen={isParticipantsOpen}
        />

        {/* Whisper AI Multilingual Translation, Notes & MOM Drawer */}
        <WhisperScribeDrawer
          room={activeRoom}
          currentUser={user}
          isOpen={isWhisperOpen}
          onClose={() => setIsWhisperOpen(false)}
        />

        {/* Floating PiP Multi-Tile Presenter Stage */}
        <FloatingPiPOverlay
          participants={participants}
          currentUserId={user?.id}
          isMuted={isMuted}
          isCameraOn={isCameraOn}
          localStream={localStream}
          remoteStreams={remoteStreams}
          audioLevel={audioLevel}
          isOpen={isPiPOpen}
          onClose={() => setIsPiPOpen(false)}
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

            <button
              onClick={() => setIsPiPOpen(!isPiPOpen)}
              className={`p-3 rounded-2xl transition-all duration-200 ${
                isPiPOpen
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/40 border border-violet-400'
                  : 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-white border border-white/[0.06]'
              }`}
              title="Toggle Floating Picture-in-Picture Stage"
            >
              <PictureInPicture2 className="w-5 h-5" />
            </button>

            {isHost && (
              <button
                onClick={handleToggleRecording}
                className={`p-3 rounded-2xl transition-all duration-200 ${
                  isRecording
                    ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/40 border border-rose-400 animate-pulse'
                    : 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-white border border-white/[0.06]'
                }`}
                title={isRecording ? 'Stop Recording' : 'Record Session'}
              >
                <CircleDot className={`w-5 h-5 ${isRecording ? 'text-white' : 'text-rose-400'}`} />
              </button>
            )}

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
