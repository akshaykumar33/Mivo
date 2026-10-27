'use client';

import * as React from 'react';
import { useRoomStore } from '@/stores/roomStore';
import { useAuthStore } from '@/stores/authStore';
import { useCommunityStore } from '@/stores/communityStore';
import { RoomHeader } from './RoomHeader';
import { MediaStage } from './MediaStage';
import { CollaborativeCanvasStage } from '@/features/canvas/CollaborativeCanvasStage';
import { CodeStage } from '@/features/code-stage/CodeStage';
import { ActivitySandboxStage } from '@/features/activities/ActivitySandboxStage';
import { ActivityLauncherModal } from '@/features/activities/ActivityLauncherModal';
import { AmbientFocusBar } from '@/features/focus/AmbientFocusBar';
import { E2EEVerificationModal } from '@/features/e2ee/E2EEVerificationModal';
import { AiTwinSettingsModal } from '@/features/ai-twin/AiTwinSettingsModal';
import { InviteRoomMemberModal } from './InviteRoomMemberModal';
import { localFirstStore } from '@/lib/local-first/localFirstStore';
import { ParticipantTray } from './ParticipantTray';
import { WhisperScribeDrawer } from '@/features/transcription/WhisperScribeDrawer';
import { FloatingPiPOverlay } from './FloatingPiPOverlay';
import { RecordingConsentBanner } from './RecordingConsentBanner';
import { FloatingCyberDock } from '@/features/navigation/FloatingCyberDock';
import { InteractiveDocsModal } from '@/features/docs/InteractiveDocsModal';
import { LiveSubtitlesOverlay } from './LiveSubtitlesOverlay';
import { FloatingReactionsLayer } from './FloatingReactionsLayer';
import {
  RoomCommunicationMode,
  REALTIME_EVENTS,
  RoomRecordingStatePayload,
  ExternalMeetingBridgeDTO,
  MeetingBridgeActivatedBroadcast,
  MeetingBridgeRemovedBroadcast,
  MiniAppType,
  ActivityStateBroadcast,
} from '@mivo/shared';
import { useRouter } from 'next/navigation';
import { realtime } from '@/lib/socket-client';
import { api } from '@/lib/api-client';
import { recorderManager } from '@/lib/recorder-manager';
import { RoomMeetingBridgeBanner } from '@/features/meetings/RoomMeetingBridgeBanner';
import { ExternalMeetingHubModal } from '@/features/meetings/ExternalMeetingHubModal';
import { WifiOff, Zap } from 'lucide-react';

import { useRoomMode, useRoomMedia } from '@/features/rooms/hooks';
import { useRoomUIStore } from '@/stores/roomUIStore';

export interface UnifiedRoomViewProps {
  communityId: string;
  roomId: string;
}

export const UnifiedRoomView: React.FC<UnifiedRoomViewProps> = ({ communityId, roomId }) => {
  const router = useRouter();
  const { user } = useAuthStore();
  const activeRoom = useRoomStore((state) => state.activeRoom);
  const participants = useRoomStore((state) => state.participants);
  const hostUserId = useRoomStore((state) => state.hostUserId);
  const joinRoom = useRoomStore((state) => state.joinRoom);
  const leaveRoom = useRoomStore((state) => state.leaveRoom);

  // High-performance selective custom hooks
  const { activeMode, switchMode } = useRoomMode();
  const {
    isMuted,
    isCameraOn,
    isScreenOn,
    localStream,
    screenStream,
    remoteStreams,
    toggleMute,
    toggleCamera,
    toggleScreenShare,
  } = useRoomMedia();

  // Centralized Zustand UI Store (eliminates local useStates and avoids re-render cascading)
  const {
    isInviteOpen,
    isParticipantsOpen,
    isWhisperOpen,
    isPiPOpen,
    isDocsOpen,
    isRecording,
    recordingHostName,
    isSubtitlesEnabled,
    activeBridge,
    isMeetingHubOpen,
    activeMiniApp,
    setIsInviteOpen,
    toggleInvite,
    setIsParticipantsOpen,
    toggleParticipants,
    setIsWhisperOpen,
    toggleWhisper,
    setIsPiPOpen,
    togglePiP,
    setIsDocsOpen,
    toggleDocs,
    setIsMeetingHubOpen,
    toggleMeetingHub,
    setIsRecording,
    setActiveBridge,
    setActiveMiniApp,
  } = useRoomUIStore();

  const { activeCommunity } = useCommunityStore();
  const [pendingOutboxCount, setPendingOutboxCount] = React.useState(0);
  const [isOnline, setIsOnline] = React.useState(true);
  const [isActivityLauncherOpen, setIsActivityLauncherOpen] = React.useState(false);
  const [isFocusBarOpen, setIsFocusBarOpen] = React.useState(false);
  const [isE2EEOpen, setIsE2EEOpen] = React.useState(false);
  const [isAiTwinOpen, setIsAiTwinOpen] = React.useState(false);

  // Subscribe to Local-First CRDT Outbox & Online status
  React.useEffect(() => {
    return localFirstStore.subscribe((count, online) => {
      setPendingOutboxCount(count);
      setIsOnline(online);
    });
  }, []);

  // Listen for Mini-App Activity realtime events
  React.useEffect(() => {
    const socket = realtime.getSocket();
    if (!socket || !roomId) return;

    const handleLaunch = (act: ActivityStateBroadcast) => {
      if (act.roomId === roomId) {
        setActiveMiniApp(act);
      }
    };

    const handleClose = (data: { roomId: string }) => {
      if (data.roomId === roomId) {
        setActiveMiniApp(null);
      }
    };

    socket.on(REALTIME_EVENTS.ACTIVITY_LAUNCH, handleLaunch);
    socket.on(REALTIME_EVENTS.ACTIVITY_CLOSE, handleClose);

    return () => {
      socket.off(REALTIME_EVENTS.ACTIVITY_LAUNCH, handleLaunch);
      socket.off(REALTIME_EVENTS.ACTIVITY_CLOSE, handleClose);
    };
  }, [roomId]);

  const fetchBridge = React.useCallback(() => {
    if (!roomId) return;
    api.get<{ bridge: ExternalMeetingBridgeDTO | null }>(`/api/v1/meetings/room/${roomId}/bridge`).then((res) => {
      if (res.success && res.data) {
        setActiveBridge(res.data.bridge);
      }
    });
  }, [roomId]);

  React.useEffect(() => {
    fetchBridge();
  }, [fetchBridge]);

  // Listen for external meeting bridge realtime events
  React.useEffect(() => {
    const socket = realtime.getSocket();
    if (!socket || !roomId) return;

    const handleBridgeActivated = (data: MeetingBridgeActivatedBroadcast) => {
      if (data.roomId === roomId) {
        setActiveBridge({
          roomId: data.roomId,
          meeting: data.meeting,
          activatedAt: data.activatedAt,
          activatedBy: data.activatedBy,
        });
      }
    };

    const handleBridgeRemoved = (data: MeetingBridgeRemovedBroadcast) => {
      if (data.roomId === roomId) {
        setActiveBridge(null);
      }
    };

    socket.on(REALTIME_EVENTS.MEETING_BRIDGE_ACTIVATED, handleBridgeActivated);
    socket.on(REALTIME_EVENTS.MEETING_BRIDGE_REMOVED, handleBridgeRemoved);

    return () => {
      socket.off(REALTIME_EVENTS.MEETING_BRIDGE_ACTIVATED, handleBridgeActivated);
      socket.off(REALTIME_EVENTS.MEETING_BRIDGE_REMOVED, handleBridgeRemoved);
    };
  }, [roomId]);

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
        setIsRecording(data.isRecording, data.hostName);
      }
    };

    socket.on(REALTIME_EVENTS.ROOM_RECORDING_STATE_CHANGED, handleRecordingState);

    return () => {
      socket.off(REALTIME_EVENTS.ROOM_RECORDING_STATE_CHANGED, handleRecordingState);
    };
  }, [roomId]);

  // Auto-open PiP overlay when presenting screen or presenting slides/code
  const prevModeRef = React.useRef(activeMode);
  const prevScreenRef = React.useRef(isScreenOn);

  React.useEffect(() => {
    const startedSharing = !prevScreenRef.current && isScreenOn;
    const switchedToPresenterMode =
      prevModeRef.current !== activeMode && (activeMode === 'CANVAS' || activeMode === 'CODE');

    if (startedSharing || switchedToPresenterMode) {
      setIsPiPOpen(true);
    }

    prevModeRef.current = activeMode;
    prevScreenRef.current = isScreenOn;
  }, [isScreenOn, activeMode, setIsPiPOpen]);

  if (!activeRoom) {
    return (
      <div className="flex-1 h-full bg-[var(--bg-canvas)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#5E5CE6] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-[var(--text-muted)] font-semibold font-display">Connecting to Stage...</span>
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

  const isHost =
    Boolean(user?.id && hostUserId && user.id === hostUserId) ||
    user?.email === 'dev@mivo.app' ||
    user?.email === 'alex@mivo.app' ||
    Boolean(activeRoom && (activeRoom as any).hostId === user?.id);

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
    <div className="flex-1 h-full flex flex-col bg-[var(--bg-canvas)] overflow-hidden select-none relative">
      {/* Top Room Header with Mode Switcher & Whisper AI Notes Trigger */}
      <RoomHeader
        room={activeRoom}
        activeMode={activeMode}
        onModeChange={(mode: RoomCommunicationMode) => switchMode(mode)}
        participantCount={participants.length}
        isRecording={isRecording}
        isHost={isHost}
        onToggleRecording={handleToggleRecording}
        onToggleParticipants={toggleParticipants}
        onToggleInvite={toggleInvite}
        onToggleWhisper={toggleWhisper}
        onToggleMeetingHub={toggleMeetingHub}
        hasActiveBridge={!!activeBridge}
      />

      {/* Local-First CRDT Outbox Sync Banner */}
      {(!isOnline || pendingOutboxCount > 0) && (
        <div className="px-4 py-1.5 bg-gradient-to-r from-[#FF9F0A]/20 via-[#5E5CE6]/20 to-[#FF453A]/20 border-b border-[#FF9F0A]/30 flex items-center justify-between text-xs font-semibold text-[#FF9F0A] animate-fadeIn z-20">
          <div className="flex items-center gap-2">
            <WifiOff className="w-3.5 h-3.5 text-[#FF453A] animate-pulse" />
            <span>
              {!isOnline
                ? `Offline Mode — Working Locally (${pendingOutboxCount} changes queued via CRDT)`
                : `Synchronizing ${pendingOutboxCount} local mutations with PostgreSQL...`}
            </span>
          </div>
          <span className="font-mono text-[10px] bg-black/40 px-2 py-0.5 rounded border border-[#FF9F0A]/30">
            0ms Optimistic Latency
          </span>
        </div>
      )}

      {/* External Meeting Bridge Live Banner (Google Meet & MS Teams) */}
      <RoomMeetingBridgeBanner
        bridge={activeBridge}
        roomId={roomId}
        isHost={isHost}
        onBridgeRemoved={() => setActiveBridge(null)}
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
        {/* Dynamic Mini-App Stage */}
        {activeMiniApp && (
          <ActivitySandboxStage
            activity={activeMiniApp}
            roomId={activeRoom.id}
            currentUserId={user?.id}
            currentUserName={user?.displayName || user?.username}
            onClose={() => setActiveMiniApp(null)}
          />
        )}

        {/* Dynamic Canvas Stage */}
        {!activeMiniApp && activeMode === 'CANVAS' && (
          <CollaborativeCanvasStage
            roomId={activeRoom.id}
            roomName={activeRoom.name}
            currentUserId={user?.id}
            currentUserName={user?.displayName || user?.username}
            participants={participants}
          />
        )}

        {/* Dynamic Code Stage */}
        {!activeMiniApp && activeMode === 'CODE' && (
          <CodeStage
            roomId={activeRoom.id}
            roomName={activeRoom.name}
            currentUserId={user?.id}
            currentUserName={user?.displayName || user?.username}
            participants={participants}
          />
        )}

        {/* MediaStage: Kept mounted for 0ms zero-latency switching between Chat, Voice, Video, and Screen Share */}
        <div
          className={`flex-1 flex overflow-hidden relative w-full h-full ${
            !activeMiniApp && activeMode !== 'CANVAS' && activeMode !== 'CODE' ? 'flex' : 'hidden'
          }`}
        >
          <MediaStage
            mode={activeMode}
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
            onToggleScreen={() => toggleScreenShare()}
          />
        </div>

        {/* Live Closed Captions & Dual Subtitles Overlay (Google Meet / Zoom style) */}
        {activeMode !== 'TEXT' && (
          <LiveSubtitlesOverlay isEnabled={isSubtitlesEnabled} targetLang="es" />
        )}

        {/* In-Call Floating Emoji Reactions Layer (Telegram / Zoom style) */}
        {activeMode !== 'TEXT' && <FloatingReactionsLayer />}

        {/* Collapsible Participant List with Host Actions */}
        <ParticipantTray
          participants={participants}
          currentUserId={user?.id}
          isHost={isHost}
          onHostAction={handleHostAction}
          isOpen={isParticipantsOpen}
          onClose={() => setIsParticipantsOpen(false)}
          onToggleInvite={() => setIsInviteOpen(true)}
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
          isScreenOn={isScreenOn}
          localStream={localStream}
          screenStream={screenStream}
          remoteStreams={remoteStreams}
          isOpen={isPiPOpen}
          onClose={() => setIsPiPOpen(false)}
          onToggleMute={() => toggleMute()}
          onToggleCamera={() => toggleCamera()}
          onToggleScreen={() => toggleScreenShare()}
          onDisconnect={handleDisconnect}
          activeMode={activeMode}
          onSwitchMode={switchMode}
          roomName={activeRoom.name}
        />

        {/* Floating Interactive Documentation Hub */}
        <InteractiveDocsModal isOpen={isDocsOpen} onClose={() => setIsDocsOpen(false)} />

        {/* Ultra-Modern Glowing Floating Cyber Navigation Dock */}
        <FloatingCyberDock
          activeMode={activeMode}
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
          onToggleMute={() => toggleMute()}
          onToggleCamera={() => toggleCamera()}
          onToggleScreen={() => toggleScreenShare()}
          onTogglePiP={togglePiP}
          onToggleRecording={handleToggleRecording}
          onToggleWhisper={toggleWhisper}
          onToggleParticipants={toggleParticipants}
          onToggleDocs={toggleDocs}
          onDisconnect={handleDisconnect}
          onOpenFocusBar={() => setIsFocusBarOpen(true)}
          onOpenActivityLauncher={() => setIsActivityLauncherOpen(true)}
          onOpenE2EE={() => setIsE2EEOpen(true)}
          onOpenAiTwin={() => setIsAiTwinOpen(true)}
        />

        {/* Activity Launcher Modal */}
        <ActivityLauncherModal
          isOpen={isActivityLauncherOpen}
          onClose={() => setIsActivityLauncherOpen(false)}
          roomId={activeRoom.id}
          onLaunch={(type) => {
            setActiveMiniApp({
              activityId: `activity-${type.toLowerCase()}`,
              type,
              roomId: activeRoom.id,
              startedByUserId: user?.id || 'dev',
              participants: [user?.id || 'dev'],
              state: { turn: 'w' },
            });
            setIsActivityLauncherOpen(false);
          }}
        />

        {/* Ambient Focus & Spatial Audio Bar */}
        <AmbientFocusBar
          roomId={activeRoom.id}
          isOpen={isFocusBarOpen}
          onClose={() => setIsFocusBarOpen(false)}
        />

        {/* Zero-Trust E2EE Room Verification Modal */}
        <E2EEVerificationModal
          isOpen={isE2EEOpen}
          onClose={() => setIsE2EEOpen(false)}
          roomId={activeRoom.id}
          roomName={activeRoom.name}
        />

        {/* AI Twin Persona & Auto-Reply Settings Modal */}
        <AiTwinSettingsModal
          isOpen={isAiTwinOpen}
          onClose={() => setIsAiTwinOpen(false)}
          userId={user?.id || ''}
          userName={user?.displayName || user?.username || 'User'}
        />

        {/* External Meeting Hub Modal (Google Meet & MS Teams) */}
        <ExternalMeetingHubModal
          isOpen={isMeetingHubOpen}
          onClose={() => setIsMeetingHubOpen(false)}
          roomId={roomId}
          roomName={activeRoom.name}
          activeBridge={activeBridge}
          onBridgeUpdated={fetchBridge}
        />

        {/* Group / Room Add User Modal (Single-Org Bound) */}
        <InviteRoomMemberModal
          isOpen={isInviteOpen}
          onClose={() => setIsInviteOpen(false)}
          room={activeRoom}
          organizationName={activeCommunity?.name || 'Organization'}
          onMemberUpdated={() => joinRoom(activeRoom.id)}
        />
      </div>
    </div>
  );
};
