'use client';

import * as React from 'react';
import { Avatar } from '@mivo/ui';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Pin,
  PinOff,
  Maximize2,
  Volume2,
  VolumeX,
  GripVertical,
  Sliders,
  Sparkles,
  X,
} from 'lucide-react';
import { UserSummaryDTO } from '@mivo/shared';

export interface LiveVideoTileProps {
  user: UserSummaryDTO;
  isMe: boolean;
  isMuted: boolean;
  isCameraOn: boolean;
  isPinned?: boolean;
  onTogglePin?: () => void;
  isHost?: boolean;
  onHostAction?: (action: 'MUTE' | 'KICK' | 'TRANSFER_HOST', targetUserId: string) => void;
  mediaStream?: MediaStream | null;
  audioLevel?: number;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
}

export const LiveVideoTile: React.FC<LiveVideoTileProps> = ({
  user,
  isMe,
  isMuted,
  isCameraOn,
  isPinned = false,
  onTogglePin,
  isHost = false,
  onHostAction,
  mediaStream,
  audioLevel = 0,
  onDragStart,
  onDragOver,
  onDrop,
}) => {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [volume, setVolume] = React.useState(100);
  const [showVolumeSlider, setShowVolumeSlider] = React.useState(false);
  const [showHostMenu, setShowHostMenu] = React.useState(false);
  const [isHovered, setIsHovered] = React.useState(false);

  React.useEffect(() => {
    if (videoRef.current && mediaStream && isCameraOn) {
      videoRef.current.srcObject = mediaStream;
      videoRef.current.play().catch((e) => console.log('Video play interrupted:', e));
    } else if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [mediaStream, isCameraOn]);

  const isSpeaking = !isMuted && (isMe ? audioLevel > 5 : true);

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setShowVolumeSlider(false);
      }}
      className={`relative rounded-3xl bg-[#08090E] border flex items-center justify-center overflow-hidden shadow-2xl aspect-video transition-all duration-200 group select-none cursor-grab active:cursor-grabbing ${
        isPinned
          ? 'border-violet-500 ring-2 ring-violet-500/40 shadow-violet-500/20'
          : isSpeaking
          ? 'border-emerald-500 shadow-emerald-500/20 ring-2 ring-emerald-500/30'
          : 'border-white/[0.08] hover:border-violet-500/40'
      }`}
    >
      {/* Real Live Video Feed */}
      {isCameraOn ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isMe}
          className="w-full h-full object-cover rounded-3xl"
        />
      ) : (
        <div className="flex flex-col items-center">
          <Avatar
            size="xl"
            src={user.avatarUrl}
            fallbackText={user.displayName || user.username}
            status={user.status}
            isSpeaking={isSpeaking}
          />
        </div>
      )}

      {/* Top Left Drag Handle & Connection Badge */}
      <div className="absolute top-3 left-3 flex items-center gap-1.5 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
        <div
          className="p-1.5 rounded-xl bg-[#090B10]/80 backdrop-blur-md border border-white/[0.08] text-slate-400 hover:text-white"
          title="Drag & Drop to Reorder"
        >
          <GripVertical className="w-3.5 h-3.5" />
        </div>
        <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur-md text-emerald-400 border border-white/[0.06]">
          1080p • 60fps
        </span>
      </div>

      {/* Top Right Quick-Action Hover Controls */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Pin to Spotlight Button */}
        {onTogglePin && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onTogglePin();
            }}
            className={`p-1.5 rounded-xl backdrop-blur-md border transition-all ${
              isPinned
                ? 'bg-violet-600 text-white border-violet-400'
                : 'bg-[#090B10]/80 border-white/[0.08] text-slate-300 hover:text-white hover:bg-white/[0.08]'
            }`}
            title={isPinned ? 'Unpin from Main Stage' : 'Spotlight / Pin to Main Stage'}
          >
            {isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
          </button>
        )}

        {/* Volume Slider Toggle for Remote Peers */}
        {!isMe && (
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowVolumeSlider(!showVolumeSlider);
              }}
              className="p-1.5 rounded-xl bg-[#090B10]/80 backdrop-blur-md border border-white/[0.08] text-slate-300 hover:text-white hover:bg-white/[0.08] transition-colors"
              title="Adjust Volume"
            >
              {volume === 0 ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>

            {showVolumeSlider && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 top-9 p-3 rounded-2xl bg-[#090B10]/95 backdrop-blur-xl border border-white/[0.1] shadow-2xl z-30 w-36 space-y-1.5"
              >
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                  <span>User Volume</span>
                  <span className="text-violet-400">{volume}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="200"
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-violet-500"
                />
              </div>
            )}
          </div>
        )}

        {/* Host Moderation Menu (for Admins / Hosts) */}
        {isHost && !isMe && (
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowHostMenu(!showHostMenu);
              }}
              className="p-1.5 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 hover:text-white hover:bg-rose-600 transition-all"
              title="Host Moderation Controls"
            >
              <Sliders className="w-3.5 h-3.5" />
            </button>

            {showHostMenu && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 top-9 p-2 rounded-2xl bg-[#090B10]/95 backdrop-blur-2xl border border-white/[0.12] shadow-2xl z-40 w-44 space-y-1"
              >
                <div className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-white/[0.06]">
                  Host Actions
                </div>
                <button
                  onClick={() => {
                    onHostAction?.('MUTE', user.id);
                    setShowHostMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-200 hover:bg-white/[0.06] hover:text-white text-left transition-colors"
                >
                  <MicOff className="w-3.5 h-3.5 text-amber-400" />
                  <span>Mute Participant</span>
                </button>
                <button
                  onClick={() => {
                    onHostAction?.('TRANSFER_HOST', user.id);
                    setShowHostMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-200 hover:bg-white/[0.06] hover:text-white text-left transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                  <span>Transfer Host</span>
                </button>
                <button
                  onClick={() => {
                    onHostAction?.('KICK', user.id);
                    setShowHostMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-950/60 hover:text-rose-300 text-left transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-rose-400" />
                  <span>Remove from Room</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Floating Bottom Nameplate, Dynamic Equalizer & Media Badges */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between px-3.5 py-2 rounded-2xl bg-[#090B10]/85 backdrop-blur-xl border border-white/[0.08] text-xs text-white z-10 shadow-lg">
        <div className="flex items-center gap-2 min-w-0">
          <span className="truncate font-bold text-xs">
            {user.displayName || user.username}
            {isMe && ' (You)'}
          </span>

          {/* Live Dynamic Audio Equalizer Bars */}
          {!isMuted && (
            <div className="flex items-center gap-0.5 h-3">
              <span
                className="w-0.5 bg-emerald-400 rounded-full transition-all duration-75"
                style={{ height: isMe ? `${Math.max(3, (audioLevel / 100) * 12)}px` : '8px' }}
              />
              <span
                className="w-0.5 bg-emerald-400 rounded-full transition-all duration-75"
                style={{ height: isMe ? `${Math.max(4, (audioLevel / 100) * 14)}px` : '12px' }}
              />
              <span
                className="w-0.5 bg-emerald-400 rounded-full transition-all duration-75"
                style={{ height: isMe ? `${Math.max(3, (audioLevel / 100) * 10)}px` : '6px' }}
              />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isMuted ? (
            <MicOff className="w-3.5 h-3.5 text-rose-400" />
          ) : (
            <Mic className="w-3.5 h-3.5 text-emerald-400" />
          )}
          {isCameraOn ? (
            <Video className="w-3.5 h-3.5 text-cyan-400" />
          ) : (
            <VideoOff className="w-3.5 h-3.5 text-slate-500" />
          )}
        </div>
      </div>
    </div>
  );
};
