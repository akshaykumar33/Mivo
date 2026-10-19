'use client';

import * as React from 'react';
import { RoomMemberDTO } from '@mivo/shared';
import { Avatar } from '@mivo/ui';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  PhoneOff,
  Minimize2,
  Maximize2,
  X,
  GripHorizontal,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

export interface FloatingPiPOverlayProps {
  participants: RoomMemberDTO[];
  currentUserId?: string;
  isMuted: boolean;
  isCameraOn: boolean;
  isScreenOn?: boolean;
  localStream?: MediaStream | null;
  screenStream?: MediaStream | null;
  remoteStreams?: Record<string, MediaStream>;
  audioLevel?: number;
  isOpen: boolean;
  onClose: () => void;
  onToggleMute?: () => void;
  onToggleCamera?: () => void;
  onToggleScreen?: () => void;
  onDisconnect?: () => void;
}

export const FloatingPiPOverlay: React.FC<FloatingPiPOverlayProps> = ({
  participants,
  currentUserId,
  isMuted,
  isCameraOn,
  isScreenOn = false,
  localStream,
  screenStream,
  remoteStreams = {},
  audioLevel = 0,
  isOpen,
  onClose,
  onToggleMute,
  onToggleCamera,
  onToggleScreen,
  onDisconnect,
}) => {
  const [isMinimized, setIsMinimized] = React.useState(false);
  const [position, setPosition] = React.useState({ x: 24, y: 24 });
  const [isDragging, setIsDragging] = React.useState(false);
  const dragStartRef = React.useRef({ mouseX: 0, mouseY: 0, posX: 24, posY: 24 });

  const localVideoRef = React.useRef<HTMLVideoElement>(null);
  const screenVideoRef = React.useRef<HTMLVideoElement>(null);

  React.useEffect(() => {
    if (localVideoRef.current && localStream && isCameraOn) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play().catch(() => {});
    } else if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
  }, [localStream, isCameraOn]);

  React.useEffect(() => {
    if (screenVideoRef.current && screenStream) {
      screenVideoRef.current.srcObject = screenStream;
      screenVideoRef.current.play().catch(() => {});
    } else if (screenVideoRef.current) {
      screenVideoRef.current.srcObject = null;
    }
  }, [screenStream]);

  // Draggable logic
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      posX: position.x,
      posY: position.y,
    };
  };

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = dragStartRef.current.mouseX - e.clientX;
      const dy = dragStartRef.current.mouseY - e.clientY;
      setPosition({
        x: Math.max(8, Math.min(window.innerWidth - 280, dragStartRef.current.posX + dx)),
        y: Math.max(8, Math.min(window.innerHeight - 180, dragStartRef.current.posY + dy)),
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        bottom: `${position.y}px`,
        right: `${position.x}px`,
      }}
      className="fixed z-50 select-none shadow-2xl transition-shadow duration-150 animate-slide-up max-w-[calc(100vw-16px)]"
    >
      <div className="w-[calc(100vw-32px)] sm:w-96 max-w-sm rounded-3xl bg-[var(--bg-surface-0)]/95 border border-[var(--border-subtle)] backdrop-blur-3xl overflow-hidden shadow-[0_16px_50px_rgba(0,0,0,0.7)] flex flex-col">
        {/* Header / Drag Bar */}
        <div
          onMouseDown={handleMouseDown}
          className="h-11 px-3.5 bg-gradient-to-r from-violet-600/25 via-indigo-600/15 to-transparent border-b border-[var(--border-subtle)] flex items-center justify-between cursor-grab active:cursor-grabbing"
        >
          <div className="flex items-center gap-2">
            <GripHorizontal className="w-3.5 h-3.5 text-white/40" />
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-[11px] font-bold text-[var(--text-primary)] font-display tracking-tight truncate max-w-[140px]">
              Stage PiP ({participants.length})
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/[0.08] transition-colors cursor-pointer"
              title={isMinimized ? 'Expand PiP' : 'Minimize PiP'}
            >
              {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-rose-400 hover:bg-white/[0.08] transition-colors cursor-pointer"
              title="Close PiP"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        {!isMinimized && (
          <div className="p-3 space-y-3 max-h-[360px] overflow-y-auto scrollbar-none">
            {/* Screen Share Dominant Broadcast if active */}
            {isScreenOn && (
              <div className="relative w-full aspect-video rounded-2xl bg-black border border-cyan-500/40 overflow-hidden shadow-lg flex items-center justify-center">
                {screenStream ? (
                  <video
                    ref={screenVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-1.5 text-cyan-400">
                    <Monitor className="w-6 h-6 animate-pulse" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Screen Broadcast</span>
                  </div>
                )}
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-rose-600 text-white text-[9px] font-extrabold shadow">
                  PRESENTING
                </div>
              </div>
            )}

            {/* Grid of Attendee Mini Video Tiles */}
            <div className={`grid gap-2 ${participants.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {participants.slice(0, 4).map((p) => {
                const isMe = p.userId === currentUserId;
                const camOn = isMe ? isCameraOn : p.isCameraOn;
                const micMuted = isMe ? isMuted : p.isMuted;
                const speaking = !micMuted && (isMe ? audioLevel > 5 : true);

                return (
                  <div
                    key={p.id}
                    className={`relative rounded-2xl bg-[#0B0D14] border aspect-video flex items-center justify-center overflow-hidden transition-all ${
                      speaking
                        ? 'border-emerald-500 ring-2 ring-emerald-500/30'
                        : 'border-white/[0.08]'
                    }`}
                  >
                    {isMe && camOn ? (
                      <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Avatar
                        size="md"
                        src={p.user.avatarUrl}
                        fallbackText={p.user.displayName || p.user.username}
                        status={p.user.status}
                        isSpeaking={speaking}
                      />
                    )}

                    <div className="absolute bottom-1.5 left-1.5 right-1.5 px-2 py-1 rounded-lg bg-black/75 backdrop-blur-md text-[9px] font-bold text-white flex items-center justify-between shadow">
                      <span className="truncate max-w-[70px]">
                        {p.user.displayName || p.user.username}
                        {isMe && ' (You)'}
                      </span>
                      {micMuted ? (
                        <MicOff className="w-2.5 h-2.5 text-rose-400" />
                      ) : (
                        <Mic className="w-2.5 h-2.5 text-emerald-400" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {participants.length > 4 && (
              <div className="text-center text-[10px] font-semibold text-[var(--text-muted)]">
                +{participants.length - 4} more participants in stage
              </div>
            )}
          </div>
        )}

        {/* Embedded Google Meet Style In-Overlay Call Controls */}
        <div className="p-2.5 bg-[var(--bg-surface-1)] border-t border-[var(--border-subtle)] flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {/* Mic Toggle */}
            {onToggleMute && (
              <button
                onClick={onToggleMute}
                className={`p-2 rounded-xl transition-all cursor-pointer ${
                  isMuted
                    ? 'bg-rose-600/20 text-rose-400 hover:bg-rose-600 hover:text-white'
                    : 'bg-white/[0.06] text-white hover:bg-white/[0.12]'
                }`}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              </button>
            )}

            {/* Camera Toggle */}
            {onToggleCamera && (
              <button
                onClick={onToggleCamera}
                className={`p-2 rounded-xl transition-all cursor-pointer ${
                  isCameraOn
                    ? 'bg-cyan-600 text-white shadow-md'
                    : 'bg-white/[0.06] text-white hover:bg-white/[0.12]'
                }`}
                title={isCameraOn ? 'Turn Camera Off' : 'Turn Camera On'}
              >
                {isCameraOn ? <Video className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5" />}
              </button>
            )}

            {/* Screen Share Toggle */}
            {onToggleScreen && (
              <button
                onClick={onToggleScreen}
                className={`p-2 rounded-xl transition-all cursor-pointer ${
                  isScreenOn
                    ? 'bg-violet-600 text-white shadow-md'
                    : 'bg-white/[0.06] text-white hover:bg-white/[0.12]'
                }`}
                title={isScreenOn ? 'Stop Screen Share' : 'Share Screen'}
              >
                <Monitor className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {/* Return to Full Stage */}
            <button
              onClick={onClose}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-xs font-semibold text-[var(--text-primary)] transition-all cursor-pointer"
              title="Return to Full Meeting Stage"
            >
              <ExternalLink className="w-3 h-3 text-[#5E5CE6]" />
              <span className="text-[10px]">Expand Stage</span>
            </button>

            {/* End Call */}
            {onDisconnect && (
              <button
                onClick={onDisconnect}
                className="p-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white shadow-md transition-all cursor-pointer"
                title="Leave Meeting"
              >
                <PhoneOff className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
