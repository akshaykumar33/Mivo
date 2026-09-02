'use client';

import * as React from 'react';
import { RoomMemberDTO, RoomCommunicationMode, RoomDTO, REALTIME_EVENTS } from '@mivo/shared';
import { Avatar } from '@mivo/ui';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  Radio,
  Activity,
  Volume2,
  Pin,
  PinOff,
  LayoutGrid,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Users,
} from 'lucide-react';
import { ChatStream } from '../chat/ChatStream';
import { LiveVideoTile } from './LiveVideoTile';
import { realtime } from '@/lib/socket-client';

export interface MediaStageProps {
  mode: RoomCommunicationMode;
  participants: RoomMemberDTO[];
  room?: RoomDTO;
  currentUserId?: string;
  isHost?: boolean;
  isMuted: boolean;
  isCameraOn: boolean;
  isScreenOn: boolean;
  localStream?: MediaStream | null;
  screenStream?: MediaStream | null;
  remoteStreams?: Record<string, MediaStream>;
  audioLevel?: number;
}

export const MediaStage: React.FC<MediaStageProps> = ({
  mode,
  participants,
  room,
  currentUserId,
  isHost = false,
  isMuted,
  isCameraOn,
  isScreenOn,
  localStream,
  screenStream,
  remoteStreams = {},
  audioLevel = 0,
}) => {
  const screenVideoRef = React.useRef<HTMLVideoElement>(null);
  const [pinnedUserId, setPinnedUserId] = React.useState<string | null>(null);
  const [orderedParticipantIds, setOrderedParticipantIds] = React.useState<string[]>([]);
  const [draggedId, setDraggedId] = React.useState<string | null>(null);
  const [isAttendeeDrawerOpen, setIsAttendeeDrawerOpen] = React.useState(true);

  // Sync participant list to ordered array
  React.useEffect(() => {
    setOrderedParticipantIds((prev) => {
      const incomingIds = participants.map((p) => p.userId);
      const existing = prev.filter((id) => incomingIds.includes(id));
      const added = incomingIds.filter((id) => !existing.includes(id));
      return [...existing, ...added];
    });
  }, [participants]);

  React.useEffect(() => {
    if (screenVideoRef.current) {
      if (screenStream) {
        screenVideoRef.current.srcObject = screenStream;
        screenVideoRef.current.play().catch((e) => console.log('Screen play interrupted:', e));
      } else {
        screenVideoRef.current.srcObject = null;
      }
    }
  }, [screenStream]);

  // Host Action Handler
  const handleHostAction = (action: 'MUTE' | 'KICK' | 'TRANSFER_HOST', targetUserId: string) => {
    if (!room) return;
    const socket = realtime.getSocket();
    if (socket) {
      socket.emit(REALTIME_EVENTS.ROOM_HOST_ACTION, {
        roomId: room.id,
        action,
        targetUserId,
      });
    }
  };

  // Reset to auto-arranged speaker grid
  const handleAutoArrange = () => {
    setPinnedUserId(null);
    setOrderedParticipantIds(participants.map((p) => p.userId));
  };

  // Drag & Drop Reordering handlers
  const handleDragStart = (userId: string) => (e: React.DragEvent) => {
    setDraggedId(userId);
    e.dataTransfer.setData('text/plain', userId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (targetUserId: string) => (e: React.DragEvent) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('text/plain') || draggedId;
    if (!sourceId || sourceId === targetUserId) return;

    setOrderedParticipantIds((prev) => {
      const currentList = prev.length === participants.length ? [...prev] : participants.map((p) => p.userId);
      const fromIndex = currentList.indexOf(sourceId);
      const toIndex = currentList.indexOf(targetUserId);
      if (fromIndex !== -1 && toIndex !== -1) {
        currentList.splice(fromIndex, 1);
        currentList.splice(toIndex, 0, sourceId);
      }
      return [...currentList];
    });
    setDraggedId(null);
  };

  const handleMoveTile = (userId: string, direction: 'left' | 'right') => {
    setOrderedParticipantIds((prev) => {
      const currentList = prev.length === participants.length ? [...prev] : participants.map((p) => p.userId);
      const fromIndex = currentList.indexOf(userId);
      if (fromIndex === -1) return currentList;
      const toIndex = direction === 'left' ? fromIndex - 1 : fromIndex + 1;
      if (toIndex < 0 || toIndex >= currentList.length) return currentList;

      const item = currentList.splice(fromIndex, 1)[0];
      currentList.splice(toIndex, 0, item);
      return [...currentList];
    });
  };

  // Sort participants by current drag order
  const sortedParticipants = React.useMemo(() => {
    return [...participants].sort((a, b) => {
      const indexA = orderedParticipantIds.indexOf(a.userId);
      const indexB = orderedParticipantIds.indexOf(b.userId);
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
  }, [participants, orderedParticipantIds]);

  const pinnedParticipant = participants.find((p) => p.userId === pinnedUserId);

  // TEXT MODE: Real-Time Chat Stream
  if (mode === 'TEXT') {
    if (!room) {
      return (
        <div className="flex-1 flex items-center justify-center bg-[#0E1017]">
          <div className="w-8 h-8 border-3 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      );
    }

    return <ChatStream room={room} />;
  }

  // VOICE MODE: Real Spatial Voice Huddle Stage with Dynamic Audio Levels
  if (mode === 'VOICE') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 pb-28 sm:p-8 sm:pb-28 bg-[var(--bg-canvas)] select-none relative overflow-hidden">
        {/* Subtle Ambient Glow */}
        <div className="absolute inset-0 bg-radial from-violet-600/10 via-transparent to-transparent pointer-events-none" />

        <div className="mb-6 sm:mb-8 text-center z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold mb-3 shadow-lg shadow-emerald-500/10">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Spatial Voice Huddle Active</span>
          </div>
          <div className="flex items-center justify-center gap-3">
            <h3 className="text-xl font-bold text-[var(--text-primary)] font-display">
              {participants.length} {participants.length === 1 ? 'Speaker' : 'Speakers'} in Stage
            </h3>
            <button
              onClick={handleAutoArrange}
              className="flex items-center gap-1 text-[11px] font-bold text-violet-400 hover:text-violet-300 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06] transition-colors"
              title="Auto-Arrange Speaker Order"
            >
              <LayoutGrid className="w-3 h-3" />
              <span>Auto-Arrange</span>
            </button>
          </div>
        </div>

        <div className="w-full max-w-4xl grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 sm:gap-8 place-items-center z-10">
          {sortedParticipants.map((p) => {
            const isMe = p.userId === currentUserId;
            const participantMuted = isMe ? isMuted : p.isMuted;
            const isSpeaking = !participantMuted && (isMe ? audioLevel > 5 : true);

            return (
              <div
                key={p.id}
                draggable
                onDragStart={handleDragStart(p.userId)}
                onDragOver={handleDragOver}
                onDrop={handleDrop(p.userId)}
                className={`relative flex flex-col items-center p-4 sm:p-5 rounded-3xl bg-[var(--bg-surface-1)] border transition-all duration-200 group w-40 sm:w-44 shadow-lg cursor-grab active:cursor-grabbing ${
                  isSpeaking
                    ? 'border-emerald-500 shadow-emerald-500/20 ring-2 ring-emerald-500/30'
                    : 'border-[var(--border-subtle)] hover:border-violet-500/30'
                }`}
              >
                {/* Voice Card Reorder Arrows */}
                <div className="absolute top-2 left-2 right-2 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity z-20">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMoveTile(p.userId, 'left');
                    }}
                    className="p-1 rounded-lg bg-black/60 hover:bg-white/[0.15] text-white/60 hover:text-white transition-all cursor-pointer"
                    title="Move Left"
                  >
                    <ChevronLeft className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMoveTile(p.userId, 'right');
                    }}
                    className="p-1 rounded-lg bg-black/60 hover:bg-white/[0.15] text-white/60 hover:text-white transition-all cursor-pointer"
                    title="Move Right"
                  >
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>

                <div className="relative">
                  <Avatar
                    size="xl"
                    src={p.user.avatarUrl}
                    fallbackText={p.user.displayName || p.user.username}
                    status={p.user.status}
                    isSpeaking={isSpeaking}
                  />

                  {/* Mic Mute Indicator Bubble */}
                  <div
                    className={`absolute -bottom-1 -right-1 p-1.5 rounded-full text-white shadow-lg transition-all ${
                      participantMuted ? 'bg-rose-600 ring-2 ring-[var(--bg-canvas)]' : 'bg-emerald-600 ring-2 ring-[var(--bg-canvas)]'
                    }`}
                  >
                    {participantMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                  </div>
                </div>

                <div className="mt-3.5 text-center w-full">
                  <div className="text-xs font-bold text-[var(--text-primary)] truncate">
                    {p.user.displayName || p.user.username}
                    {isMe && ' (You)'}
                  </div>

                  {/* Dynamic Soundwave animation driven by audioLevel */}
                  {!participantMuted ? (
                    <div className="flex items-center justify-center gap-1 mt-2 h-3.5">
                      <span
                        className="w-0.5 bg-emerald-400 rounded-full transition-all duration-75"
                        style={{ height: isMe ? `${Math.max(4, (audioLevel / 100) * 14)}px` : '10px' }}
                      />
                      <span
                        className="w-0.5 bg-emerald-400 rounded-full transition-all duration-75"
                        style={{ height: isMe ? `${Math.max(6, (audioLevel / 100) * 18)}px` : '14px' }}
                      />
                      <span
                        className="w-0.5 bg-emerald-400 rounded-full transition-all duration-75"
                        style={{ height: isMe ? `${Math.max(4, (audioLevel / 100) * 12)}px` : '8px' }}
                      />
                      <span
                        className="w-0.5 bg-emerald-400 rounded-full transition-all duration-75"
                        style={{ height: isMe ? `${Math.max(5, (audioLevel / 100) * 16)}px` : '12px' }}
                      />
                    </div>
                  ) : (
                    <span className="text-[10px] text-[var(--text-muted)] font-semibold block mt-1">Muted</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // VIDEO MODE: Grid with Drag & Drop, Host Moderation & Spotlight Pinning
  if (mode === 'VIDEO') {
    return (
      <div className="flex-1 p-6 pb-28 bg-[var(--bg-canvas)] select-none flex flex-col overflow-hidden">
        {pinnedParticipant ? (
          // Spotlight Mode: Dominant Pinned Tile + Attendee Strip
          <div className="flex-1 flex flex-col gap-4 overflow-hidden">
            <div className="flex-1 flex items-center justify-center max-w-4xl mx-auto w-full aspect-video">
              <LiveVideoTile
                user={pinnedParticipant.user}
                isMe={pinnedParticipant.userId === currentUserId}
                isMuted={pinnedParticipant.userId === currentUserId ? isMuted : pinnedParticipant.isMuted}
                isCameraOn={pinnedParticipant.userId === currentUserId ? isCameraOn : pinnedParticipant.isCameraOn}
                isPinned={true}
                onTogglePin={() => setPinnedUserId(null)}
                isHost={isHost}
                onHostAction={handleHostAction}
                mediaStream={pinnedParticipant.userId === currentUserId ? localStream : remoteStreams[pinnedParticipant.userId]}
                audioLevel={pinnedParticipant.userId === currentUserId ? audioLevel : 0}
              />
            </div>

            {/* Bottom attendee filmstrip */}
            <div className="h-32 flex items-center gap-3 overflow-x-auto py-1">
              {sortedParticipants
                .filter((p) => p.userId !== pinnedUserId)
                .map((p) => {
                  const isMe = p.userId === currentUserId;
                  return (
                    <div key={p.id} className="w-48 aspect-video flex-shrink-0 flex items-center">
                      <LiveVideoTile
                        user={p.user}
                        isMe={isMe}
                        isMuted={isMe ? isMuted : p.isMuted}
                        isCameraOn={isMe ? isCameraOn : p.isCameraOn}
                        isPinned={false}
                        onTogglePin={() => setPinnedUserId(p.userId)}
                        isHost={isHost}
                        onHostAction={handleHostAction}
                        mediaStream={isMe ? localStream : remoteStreams[p.userId]}
                        audioLevel={isMe ? audioLevel : 0}
                      />
                    </div>
                  );
                })}
            </div>
          </div>
        ) : (
          // Standard Equal Auto-Adjusting Grid with Drag & Drop
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--text-secondary)]">
                Live Video Stage ({participants.length} Active)
              </span>
              <button
                onClick={handleAutoArrange}
                className="flex items-center gap-1.5 text-[11px] font-bold text-violet-400 hover:text-violet-300 px-3 py-1 rounded-xl bg-[var(--bg-surface-1)] border border-[var(--border-subtle)] hover:bg-[var(--bg-surface-2)] transition-colors"
                title="Reset to Auto-Arranged Grid"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Auto-Arrange Grid</span>
              </button>
            </div>

            <div
              className={`grid gap-4 sm:gap-5 h-full min-h-[340px] overflow-y-auto items-center ${
                sortedParticipants.length === 1
                  ? 'grid-cols-1 max-w-2xl mx-auto w-full my-auto'
                  : sortedParticipants.length === 2
                  ? 'grid-cols-1 sm:grid-cols-2 max-w-5xl mx-auto w-full my-auto'
                  : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
              }`}
            >
              {sortedParticipants.map((p) => {
                const isMe = p.userId === currentUserId;
                const camOn = isMe ? isCameraOn : p.isCameraOn;
                const participantMuted = isMe ? isMuted : p.isMuted;
                const participantStream = isMe ? localStream : remoteStreams[p.userId];

                return (
                  <LiveVideoTile
                    key={p.id}
                    user={p.user}
                    isMe={isMe}
                    isMuted={participantMuted}
                    isCameraOn={camOn}
                    isPinned={false}
                    onTogglePin={() => setPinnedUserId(p.userId)}
                    isHost={isHost}
                    onHostAction={handleHostAction}
                    mediaStream={participantStream}
                    audioLevel={isMe ? audioLevel : 0}
                    onDragStart={handleDragStart(p.userId)}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop(p.userId)}
                    onMoveLeft={() => handleMoveTile(p.userId, 'left')}
                    onMoveRight={() => handleMoveTile(p.userId, 'right')}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // SCREEN_SHARE or STREAM MODE: Real Display Stream Theater with Interactive Participant Video Strip
  return (
    <div className="flex-1 p-4 sm:p-6 pb-28 bg-[var(--bg-canvas)] flex flex-col select-none overflow-hidden gap-4">
      {/* Primary Dominant Screen Share Stage */}
      <div className="flex-1 rounded-3xl bg-[#0B0D14] border border-[var(--border-subtle)] relative flex items-center justify-center shadow-2xl overflow-hidden min-h-[280px]">
        {screenStream ? (
          <video
            ref={screenVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-contain rounded-3xl bg-black"
          />
        ) : (
          <div className="text-center p-8">
            <div className="inline-flex p-6 rounded-3xl bg-gradient-to-tr from-violet-600/20 to-indigo-600/20 text-violet-400 mb-5 border border-violet-500/30 shadow-2xl shadow-violet-600/20">
              {mode === 'SCREEN_SHARE' ? (
                <Monitor className="w-12 h-12 text-cyan-400" />
              ) : (
                <Radio className="w-12 h-12 animate-pulse text-rose-400" />
              )}
            </div>
            <h4 className="text-xl font-extrabold text-[var(--text-primary)] font-display">
              {mode === 'SCREEN_SHARE' ? 'Interactive Screen Broadcast' : 'Live Broadcaster Stage'}
            </h4>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-2 max-w-md mx-auto">
              Click &quot;Share Screen&quot; in the bottom dock to broadcast your window, or collaborate with attendee video feeds below.
            </p>
          </div>
        )}

        {/* Live Presentation Status Badge */}
        <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1 rounded-full bg-rose-600 text-white text-xs font-extrabold shadow-lg shadow-rose-600/40 z-10">
          <span className="w-2 h-2 rounded-full bg-white animate-ping" />
          <span>{mode === 'SCREEN_SHARE' ? 'PRESENTING' : 'LIVE ON STAGE'}</span>
        </div>

        {/* Participant Count & Quick Drawer Toggle Chip */}
        <div className="absolute top-4 right-4 flex items-center gap-1.5 z-10">
          <button
            onClick={() => setIsAttendeeDrawerOpen(!isAttendeeDrawerOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--bg-surface-0)]/90 hover:bg-[var(--bg-surface-1)] backdrop-blur-md border border-[var(--border-subtle)] text-[11px] font-bold text-[var(--text-primary)] transition-all cursor-pointer shadow-lg"
            title={isAttendeeDrawerOpen ? 'Collapse Attendee Video Drawer' : 'Expand Attendee Video Drawer'}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>{participants.length} in Meet</span>
            <span className="text-[var(--text-muted)]">•</span>
            <span className="text-violet-400 flex items-center gap-1">
              {isAttendeeDrawerOpen ? (
                <>
                  <span>Hide Videos</span>
                  <EyeOff className="w-3 h-3" />
                </>
              ) : (
                <>
                  <span>Show Videos</span>
                  <Eye className="w-3 h-3" />
                </>
              )}
            </span>
          </button>
        </div>
      </div>

      {/* Interactive Closeable / Expandable Drag & Drop Video Drawer */}
      {isAttendeeDrawerOpen ? (
        <div className="flex-shrink-0 flex flex-col gap-2 animate-slide-up">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-secondary)]">
                Meeting Participants ({participants.length}) • Drag or Use ◀ / ▶ to Reorder
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={handleAutoArrange}
                className="flex items-center gap-1 text-[10px] font-bold text-violet-400 hover:text-violet-300 px-2.5 py-1 rounded-lg bg-[var(--bg-surface-1)] border border-[var(--border-subtle)] hover:bg-[var(--bg-surface-2)] transition-colors cursor-pointer"
                title="Auto-Arrange Video Strip"
              >
                <LayoutGrid className="w-3 h-3" />
                <span>Auto-Arrange</span>
              </button>

              <button
                onClick={() => setIsAttendeeDrawerOpen(false)}
                className="flex items-center gap-1 text-[10px] font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)] px-2 py-1 rounded-lg bg-[var(--bg-surface-1)] border border-[var(--border-subtle)] hover:bg-[var(--bg-surface-2)] transition-colors cursor-pointer"
                title="Collapse Video Drawer (Full-Screen Share View)"
              >
                <ChevronDown className="w-3 h-3" />
                <span>Hide</span>
              </button>
            </div>
          </div>

          <div
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-none no-scrollbar"
          >
            {sortedParticipants.map((p) => {
              const isMe = p.userId === currentUserId;
              const camOn = isMe ? isCameraOn : p.isCameraOn;
              const participantMuted = isMe ? isMuted : p.isMuted;
              const participantStream = isMe ? localStream : remoteStreams[p.userId];

              return (
                <div key={p.id} className="w-56 sm:w-64 aspect-video flex-shrink-0">
                  <LiveVideoTile
                    user={p.user}
                    isMe={isMe}
                    isMuted={participantMuted}
                    isCameraOn={camOn}
                    isPinned={pinnedUserId === p.userId}
                    onTogglePin={() => setPinnedUserId(pinnedUserId === p.userId ? null : p.userId)}
                    isHost={isHost}
                    onHostAction={handleHostAction}
                    mediaStream={participantStream}
                    audioLevel={isMe ? audioLevel : 0}
                    onDragStart={handleDragStart(p.userId)}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop(p.userId)}
                    onMoveLeft={() => handleMoveTile(p.userId, 'left')}
                    onMoveRight={() => handleMoveTile(p.userId, 'right')}
                  />
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Collapsed State: Sleek Restore Drawer Button */
        <div className="flex justify-center flex-shrink-0 animate-fade-in">
          <button
            onClick={() => setIsAttendeeDrawerOpen(true)}
            className="flex items-center gap-2 px-4 py-1.5 rounded-2xl bg-[var(--bg-surface-1)] hover:bg-[var(--bg-surface-2)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] shadow-xl transition-all hover:scale-105 cursor-pointer"
          >
            <Users className="w-3.5 h-3.5 text-[#5E5CE6]" />
            <span>Show Attendee Video Drawer ({participants.length})</span>
            <ChevronUp className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          </button>
        </div>
      )}
    </div>
  );
};

