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
      <div className="flex-1 flex flex-col items-center justify-center p-6 pb-28 sm:p-8 sm:pb-28 bg-[#0E1017] select-none relative overflow-hidden">
        {/* Subtle Ambient Glow */}
        <div className="absolute inset-0 bg-radial from-violet-600/10 via-transparent to-transparent pointer-events-none" />

        <div className="mb-6 sm:mb-8 text-center z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold mb-3 shadow-lg shadow-emerald-500/10">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Spatial Voice Huddle Active</span>
          </div>
          <div className="flex items-center justify-center gap-3">
            <h3 className="text-xl font-bold text-white font-display">
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
                className={`relative flex flex-col items-center p-4 sm:p-5 rounded-3xl bg-white/[0.02] border transition-all duration-200 group w-40 sm:w-44 shadow-lg cursor-grab active:cursor-grabbing ${
                  isSpeaking
                    ? 'border-emerald-500 shadow-emerald-500/20 ring-2 ring-emerald-500/30'
                    : 'border-white/[0.05] hover:border-violet-500/30'
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
                      participantMuted ? 'bg-rose-600 ring-2 ring-[#0E1017]' : 'bg-emerald-600 ring-2 ring-[#0E1017]'
                    }`}
                  >
                    {participantMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                  </div>
                </div>

                <div className="mt-3.5 text-center w-full">
                  <div className="text-xs font-bold text-white truncate">
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
                    <span className="text-[10px] text-slate-500 font-semibold block mt-1">Muted</span>
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
      <div className="flex-1 p-6 pb-28 bg-[#0E1017] select-none flex flex-col overflow-hidden">
        {pinnedParticipant ? (
          // Spotlight Mode: Dominant Pinned Tile + Attendee Strip
          <div className="flex-1 flex flex-col gap-4 overflow-hidden">
            <div className="flex-1 max-h-[70vh]">
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
                    <div key={p.id} className="w-52 h-full flex-shrink-0">
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
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                Live Video Stage ({participants.length} Active)
              </span>
              <button
                onClick={handleAutoArrange}
                className="flex items-center gap-1.5 text-[11px] font-bold text-violet-300 hover:text-white px-3 py-1 rounded-xl bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] transition-colors"
                title="Reset to Auto-Arranged Grid"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Auto-Arrange Grid</span>
              </button>
            </div>

            <div
              className={`grid gap-4 sm:gap-5 h-full min-h-[340px] overflow-y-auto ${
                sortedParticipants.length === 1
                  ? 'grid-cols-1 max-w-4xl mx-auto w-full'
                  : sortedParticipants.length === 2
                  ? 'grid-cols-1 sm:grid-cols-2'
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

  // SCREEN_SHARE or STREAM MODE: Real Display Stream Theater
  return (
    <div className="flex-1 p-6 pb-28 bg-[#0E1017] flex flex-col select-none overflow-hidden">
      {/* Primary Dominant Stage */}
      <div className="flex-1 rounded-3xl bg-[#08090E] border border-white/[0.08] relative flex items-center justify-center shadow-2xl overflow-hidden min-h-[300px]">
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
            <h4 className="text-xl font-extrabold text-white font-display">
              {mode === 'SCREEN_SHARE' ? 'Interactive Screen Broadcast' : 'Live Broadcaster Stage'}
            </h4>
            <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-md mx-auto">
              Click &quot;Share Screen&quot; in the bottom controls bar to broadcast your window or full display.
            </p>
          </div>
        )}

        {/* Live Badge */}
        <div className="absolute top-5 left-5 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-600 text-white text-xs font-extrabold shadow-lg shadow-rose-600/40 z-10">
          <span className="w-2 h-2 rounded-full bg-white animate-ping" />
          <span>{mode === 'SCREEN_SHARE' ? 'PRESENTING' : 'LIVE ON STAGE'}</span>
        </div>
      </div>

      {/* Attendee Filmstrip */}
      <div className="h-16 mt-4 flex items-center gap-3 overflow-x-auto py-1">
        {participants.map((p) => (
          <div
            key={p.id}
            className="flex-shrink-0 px-3.5 py-2 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center gap-2.5 text-xs"
          >
            <Avatar size="xs" src={p.user.avatarUrl} fallbackText={p.user.displayName || p.user.username} />
            <span className="text-slate-200 truncate max-w-[100px] font-semibold">
              {p.user.displayName || p.user.username}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
