'use client';

import * as React from 'react';
import { RoomMemberDTO } from '@mivo/shared';
import { Avatar } from '@mivo/ui';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Minimize2,
  Maximize2,
  X,
  GripHorizontal,
  Sparkles,
} from 'lucide-react';

export interface FloatingPiPOverlayProps {
  participants: RoomMemberDTO[];
  currentUserId?: string;
  isMuted: boolean;
  isCameraOn: boolean;
  localStream?: MediaStream | null;
  remoteStreams?: Record<string, MediaStream>;
  audioLevel?: number;
  isOpen: boolean;
  onClose: () => void;
}

export const FloatingPiPOverlay: React.FC<FloatingPiPOverlayProps> = ({
  participants,
  currentUserId,
  isMuted,
  isCameraOn,
  localStream,
  remoteStreams = {},
  audioLevel = 0,
  isOpen,
  onClose,
}) => {
  const [isMinimized, setIsMinimized] = React.useState(false);
  const [position, setPosition] = React.useState({ x: 24, y: 24 });
  const [isDragging, setIsDragging] = React.useState(false);
  const dragStartPos = React.useRef({ x: 0, y: 0 });

  const localVideoRef = React.useRef<HTMLVideoElement>(null);

  React.useEffect(() => {
    if (localVideoRef.current && localStream && isCameraOn) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play().catch(() => {});
    }
  }, [localStream, isCameraOn]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        bottom: `${position.y}px`,
        right: `${position.x}px`,
      }}
      className="fixed z-50 select-none shadow-2xl transition-shadow duration-200"
    >
      <div className="w-80 rounded-3xl bg-[var(--bg-surface-0)] border border-[var(--border-subtle)] backdrop-blur-2xl overflow-hidden shadow-2xl">
        {/* Header / Drag Bar */}
        <div className="h-10 px-3.5 bg-gradient-to-r from-violet-600/20 to-transparent border-b border-[var(--border-subtle)] flex items-center justify-between cursor-move">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-[11px] font-bold text-[var(--text-primary)] font-display tracking-tight">
              PiP Active Stage ({participants.length})
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/[0.06] transition-colors cursor-pointer"
              title={isMinimized ? 'Expand PiP' : 'Minimize PiP'}
            >
              {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-[var(--text-muted)] hover:text-rose-400 hover:bg-white/[0.06] transition-colors cursor-pointer"
              title="Close PiP"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        {!isMinimized && (
          <div className="p-3 space-y-2.5 max-h-80 overflow-y-auto">
            {/* Grid of Mini Tiles */}
            <div className="grid grid-cols-2 gap-2">
              {participants.map((p) => {
                const isMe = p.userId === currentUserId;
                const camOn = isMe ? isCameraOn : p.isCameraOn;
                const micMuted = isMe ? isMuted : p.isMuted;
                const speaking = !micMuted && (isMe ? audioLevel > 5 : true);

                return (
                  <div
                    key={p.id}
                    className={`relative rounded-2xl bg-[#0E1017] border aspect-video flex items-center justify-center overflow-hidden transition-all ${
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
                        size="sm"
                        src={p.user.avatarUrl}
                        fallbackText={p.user.displayName || p.user.username}
                        status={p.user.status}
                        isSpeaking={speaking}
                      />
                    )}

                    <div className="absolute bottom-1 left-1 right-1 px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[9px] font-bold text-white flex items-center justify-between">
                      <span className="truncate max-w-[60px]">{p.user.displayName || p.user.username}</span>
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
          </div>
        )}
      </div>
    </div>
  );
};
