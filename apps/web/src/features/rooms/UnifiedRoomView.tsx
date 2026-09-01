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
import { FloatingCyberDock } from '@/features/navigation/FloatingCyberDock';
import { InteractiveDocsModal } from '@/features/docs/InteractiveDocsModal';
import { LiveSubtitlesOverlay } from './LiveSubtitlesOverlay';
import { FloatingReactionsLayer } from './FloatingReactionsLayer';
import { RoomCommunicationMode, REALTIME_EVENTS, RoomRecordingStatePayload } from '@mivo/shared';
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
  const [isDocsOpen, setIsDocsOpen] = React.useState(false);
  const [isRecording, setIsRecording] = React.useState(false);
  const [recordingHostName, setRecordingHostName] = React.useState('Host');
  const [isSubtitlesEnabled, setIsSubtitlesEnabled] = React.useState(true);

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
      <div className="flex-1 h-full bg-[#06070B] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#5E5CE6] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-white/50 font-semibold font-display">Connecting to Stage...</span>
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
    <div className="flex-1 h-full flex flex-col bg-[#06070B] overflow-hidden select-none relative">
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

        {/* Live Closed Captions & Dual Subtitles Overlay (Google Meet / Zoom style) */}
        {activeRoom.activeMode !== 'TEXT' && (
          <LiveSubtitlesOverlay isEnabled={isSubtitlesEnabled} targetLang="es" />
        )}

        {/* In-Call Floating Emoji Reactions Layer (Telegram / Zoom style) */}
        {activeRoom.activeMode !== 'TEXT' && <FloatingReactionsLayer />}

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

        {/* Floating Interactive Documentation Hub */}
        <InteractiveDocsModal isOpen={isDocsOpen} onClose={() => setIsDocsOpen(false)} />

        {/* Ultra-Modern Glowing Floating Cyber Navigation Dock */}
        <FloatingCyberDock
          activeMode={activeRoom.activeMode}
          onModeChange={(mode) => switchMode(mode)}
          isMuted={isMuted}
          isCameraOn={isCameraOn}
          isScreenOn={isScreenOn}
          isPiPOpen={isPiPOpen}
          isRecording={isRecording}
          isHost={isHost}
          isWhisperOpen={isWhisperOpen}
          isParticipantsOpen={isParticipantsOpen}
          participantCount={participants.length}
          audioLevel={audioLevel}
          onToggleMute={() => toggleMute()}
          onToggleCamera={() => toggleCamera()}
          onToggleScreen={() => toggleScreenShare()}
          onTogglePiP={() => setIsPiPOpen(!isPiPOpen)}
          onToggleRecording={handleToggleRecording}
          onToggleWhisper={() => setIsWhisperOpen(!isWhisperOpen)}
          onToggleParticipants={() => setIsParticipantsOpen(!isParticipantsOpen)}
          onToggleDocs={() => setIsDocsOpen(!isDocsOpen)}
          onDisconnect={handleDisconnect}
        />
      </div>
    </div>
  );
};
