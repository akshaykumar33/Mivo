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
  ChevronLeft,
  ChevronRight,
  Headphones,
  ArrowLeftRight,
} from 'lucide-react';
import { UserSummaryDTO } from '@mivo/shared';
import { spatialAudio } from '../audio/SpatialAudioEngine';
import { webrtcMesh } from '@/lib/webrtc-mesh';

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
  onDragEnter?: (e: React.DragEvent) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  isDragging?: boolean;
  isDragOver?: boolean;
  onMoveLeft?: () => void;
  onMoveRight?: () => void;
  spatialPanLabel?: string;
  onClick?: () => void;
  isSpotlightHero?: boolean;
  filmstripMode?: boolean;
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
  onDragEnter,
  onDragLeave,
  onDragEnd,
  onDrop,
  isDragging = false,
  isDragOver = false,
  onMoveLeft,
  onMoveRight,
  spatialPanLabel,
  onClick,
  isSpotlightHero = false,
  filmstripMode = false,
}) => {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [volume, setVolume] = React.useState<number>(() => {
    return typeof window !== 'undefined' ? spatialAudio.getPeerVolume(user.id) : 100;
  });
  const [showVolumeSlider, setShowVolumeSlider] = React.useState(false);
  const [showHostMenu, setShowHostMenu] = React.useState(false);
  const [isHovered, setIsHovered] = React.useState(false);

  const handleVolumeChange = React.useCallback(
    (newVol: number) => {
      const clamped = Math.max(0, Math.min(200, newVol));
      setVolume(clamped);
      spatialAudio.setPeerVolume(user.id, clamped);
      webrtcMesh.setPeerVolume(user.id, clamped);
      if (videoRef.current) {
        videoRef.current.volume = Math.max(0, Math.min(1.0, clamped / 100));
      }
    },
    [user.id]
  );

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
      draggable={!isSpotlightHero}
      onDragStart={!isSpotlightHero ? onDragStart : undefined}
      onDragOver={!isSpotlightHero ? onDragOver : undefined}
      onDragEnter={!isSpotlightHero ? onDragEnter : undefined}
      onDragLeave={!isSpotlightHero ? onDragLeave : undefined}
      onDragEnd={!isSpotlightHero ? onDragEnd : undefined}
      onDrop={!isSpotlightHero ? onDrop : undefined}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('button, input, [data-prevent-tile-click]')) {
          return;
        }
        onClick?.();
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setShowVolumeSlider(false);
      }}
      className={`relative w-full aspect-video rounded-3xl bg-[#0D1017] border flex items-center justify-center overflow-hidden shadow-2xl transition-all duration-300 group select-none ${
        onClick ? 'cursor-pointer' : ''
      } ${
        isDragging
          ? 'opacity-35 scale-[0.97] border-dashed border-violet-400 ring-2 ring-violet-500/40 shadow-none cursor-grabbing'
          : isDragOver
          ? 'scale-[1.03] border-violet-400 ring-4 ring-violet-500/60 shadow-2xl shadow-violet-500/30 bg-violet-950/40 cursor-pointer'
          : isSpotlightHero
          ? isSpeaking
            ? 'border-emerald-400 ring-4 ring-emerald-500/50 shadow-2xl shadow-emerald-500/30'
            : 'border-violet-500/80 ring-2 ring-violet-500/50 shadow-2xl shadow-violet-950/60'
          : isPinned
          ? 'border-violet-500 ring-2 ring-violet-500/40 shadow-violet-500/20'
          : isSpeaking
          ? 'border-emerald-500 shadow-emerald-500/20 ring-2 ring-emerald-500/30'
          : filmstripMode
          ? 'border-white/[0.08] hover:border-violet-400 hover:ring-2 hover:ring-violet-500/50'
          : 'border-white/[0.08] hover:border-violet-500/40'
      }`}
    >
      {/* Subtle Ambient Radial Glow */}
      <div className="absolute inset-0 bg-radial from-violet-600/10 via-transparent to-transparent pointer-events-none" />

      {/* Filmstrip Hover Overlay: Click to Spotlight prompt */}
      {filmstripMode && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-600/95 text-white text-[11px] font-extrabold shadow-xl border border-violet-400/40 tracking-wide uppercase">
            <Pin className="w-3 h-3 fill-current text-amber-300" />
            <span>Click to Spotlight</span>
          </div>
        </div>
      )}

      {/* Drop Target Indicator Overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-violet-950/75 backdrop-blur-xs border-2 border-dashed border-violet-400 rounded-3xl pointer-events-none animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-violet-600 text-white text-xs font-bold shadow-xl">
            <ArrowLeftRight className="w-3.5 h-3.5 animate-pulse" />
            <span>Drop to Swap with {user.displayName || user.username}</span>
          </div>
        </div>
      )}

      {/* Active Dragging Indicator Overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-xs rounded-3xl pointer-events-none">
          <span className="text-xs font-semibold text-white flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--bg-surface-0)] border border-[var(--border-subtle)] shadow-xs">
            <GripVertical className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
            Reordering Tile...
          </span>
        </div>
      )}

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
        <div className="flex items-center justify-center z-10">
          <div className="relative flex items-center justify-center">
            {isSpeaking && (
              <div className="absolute -inset-4 rounded-full bg-emerald-500/20 animate-ping pointer-events-none" />
            )}
            <Avatar
              size="xl"
              src={user.avatarUrl}
              fallbackText={user.displayName || user.username}
              status={user.status}
              isSpeaking={isSpeaking}
            />
          </div>
        </div>
      )}

      {/* Top Left Controls: Spotlight Hero Badge OR Drag Handle */}
      {isSpotlightHero ? (
        <div className="absolute top-3 left-3 flex items-center gap-2 z-20">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-violet-600/90 backdrop-blur-md border border-violet-400/50 text-white shadow-xl">
            <Pin className="w-3.5 h-3.5 fill-current text-amber-300 animate-pulse" />
            <span className="text-[11px] font-black tracking-wider uppercase">
              Spotlight Hero
            </span>
          </div>
          <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-xl bg-black/60 backdrop-blur-md text-emerald-400 border border-white/[0.08] hidden sm:inline-block">
            1080p • 60fps
          </span>
        </div>
      ) : (
        <div className="absolute top-3 left-3 flex items-center gap-1.5 z-20 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
          <div
            draggable
            onDragStart={(e) => {
              e.stopPropagation();
              onDragStart?.(e);
            }}
            onDragEnd={(e) => {
              e.stopPropagation();
              onDragEnd?.(e);
            }}
            className="p-1.5 px-2.5 rounded-xl bg-[#090B10]/90 backdrop-blur-md border border-white/[0.12] text-white/70 hover:text-white hover:border-violet-500/60 hover:bg-violet-600/30 cursor-grab active:cursor-grabbing shadow-lg flex items-center gap-1.5 transition-all group/handle"
            title="Grab handle to reorder tile on the fly"
          >
            <GripVertical className="w-3.5 h-3.5 text-violet-400 group-hover/handle:text-violet-300" />
            <span className="text-[10px] font-bold tracking-wider uppercase text-zinc-300 group-hover/handle:text-white">
              Drag
            </span>
          </div>
          {onMoveLeft && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMoveLeft();
              }}
              className="p-1.5 rounded-xl bg-[#090B10]/80 backdrop-blur-md border border-white/[0.08] text-white/60 hover:text-white hover:bg-white/[0.1] transition-all cursor-pointer"
              title="Move Tile Left"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          )}
          {onMoveRight && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMoveRight();
              }}
              className="p-1.5 rounded-xl bg-[#090B10]/80 backdrop-blur-md border border-white/[0.08] text-white/60 hover:text-white hover:bg-white/[0.1] transition-all cursor-pointer"
              title="Move Tile Right"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
          <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur-md text-emerald-400 border border-white/[0.06] hidden sm:inline-block">
            1080p • 60fps
          </span>
        </div>
      )}

      {/* Top Right Quick-Action Hover Controls */}
      <div
        className={`absolute top-3 right-3 flex items-center gap-1.5 z-20 transition-opacity ${
          isSpotlightHero || showVolumeSlider || showHostMenu ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}
      >
        {/* Pin to Spotlight / Unpin Button */}
        {onTogglePin && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onTogglePin();
            }}
            className={`p-1.5 px-2 rounded-xl backdrop-blur-md border transition-all cursor-pointer flex items-center gap-1.5 shadow-lg ${
              isPinned
                ? 'bg-violet-600/90 text-white border-violet-400 hover:bg-violet-700'
                : 'bg-[#090B10]/80 border-white/[0.08] text-slate-300 hover:text-white hover:bg-white/[0.08]'
            }`}
            title={isPinned ? 'Unpin from Main Stage' : 'Spotlight / Pin to Main Stage'}
          >
            {isPinned ? <PinOff className="w-3.5 h-3.5 text-amber-300" /> : <Pin className="w-3.5 h-3.5" />}
            {isSpotlightHero && (
              <span className="text-[10px] font-bold text-white hidden sm:inline-block">
                Unpin
              </span>
            )}
          </button>
        )}

        {/* Volume Slider Toggle for Remote Peers */}
        {!isMe && (
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowVolumeSlider(!showVolumeSlider);
                setShowHostMenu(false);
              }}
              className="p-1.5 rounded-xl bg-[#090B10]/80 backdrop-blur-md border border-white/[0.08] text-slate-300 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
              title="Adjust Volume"
            >
              {volume === 0 ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>

            {showVolumeSlider && (
              <>
                <div
                  className="fixed inset-0 z-20 cursor-default"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowVolumeSlider(false);
                  }}
                />
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute right-0 top-9 p-3 rounded-2xl bg-[#090B10]/95 backdrop-blur-xl border border-white/[0.1] shadow-2xl z-30 w-44 space-y-2 animate-in fade-in duration-150"
                >
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                    <span>User Volume</span>
                    <span className={volume > 100 ? 'text-emerald-400 font-mono font-extrabold' : 'text-violet-400 font-mono font-bold'}>
                      {volume}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="200"
                    value={volume}
                    onChange={(e) => handleVolumeChange(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-violet-500"
                  />
                  <div className="flex items-center justify-between gap-1 pt-1 border-t border-white/[0.06]">
                    <button
                      type="button"
                      onClick={() => handleVolumeChange(0)}
                      className="px-2 py-0.5 rounded text-[9px] font-bold bg-white/[0.04] hover:bg-rose-500/20 text-rose-400 transition-colors cursor-pointer"
                    >
                      0%
                    </button>
                    <button
                      type="button"
                      onClick={() => handleVolumeChange(100)}
                      className="px-2 py-0.5 rounded text-[9px] font-bold bg-white/[0.04] hover:bg-violet-500/20 text-violet-300 transition-colors cursor-pointer"
                    >
                      100%
                    </button>
                    <button
                      type="button"
                      onClick={() => handleVolumeChange(200)}
                      className="px-2 py-0.5 rounded text-[9px] font-bold bg-white/[0.04] hover:bg-emerald-500/20 text-emerald-300 transition-colors cursor-pointer"
                    >
                      200%
                    </button>
                  </div>
                </div>
              </>
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
                setShowVolumeSlider(false);
              }}
              className="p-1.5 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 hover:text-white hover:bg-rose-600 transition-all cursor-pointer"
              title="Host Moderation Controls"
            >
              <Sliders className="w-3.5 h-3.5" />
            </button>

            {showHostMenu && (
              <>
                <div
                  className="fixed inset-0 z-20 cursor-default"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowHostMenu(false);
                  }}
                />
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute right-0 top-9 p-2 rounded-2xl bg-[#090B10]/95 backdrop-blur-2xl border border-white/[0.12] shadow-2xl z-40 w-44 space-y-1 animate-in fade-in duration-150"
                >
                  <div className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-white/[0.06]">
                    Host Actions
                  </div>
                  <button
                    onClick={() => {
                      onHostAction?.('MUTE', user.id);
                      setShowHostMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-200 hover:bg-white/[0.06] hover:text-white text-left transition-colors cursor-pointer"
                  >
                    <MicOff className="w-3.5 h-3.5 text-amber-400" />
                    <span>Mute Participant</span>
                  </button>
                  <button
                    onClick={() => {
                      onHostAction?.('TRANSFER_HOST', user.id);
                      setShowHostMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-200 hover:bg-white/[0.06] hover:text-white text-left transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                    <span>Transfer Host</span>
                  </button>
                  <button
                    onClick={() => {
                      onHostAction?.('KICK', user.id);
                      setShowHostMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-950/60 hover:text-rose-300 text-left transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5 text-rose-400" />
                    <span>Remove from Room</span>
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Floating Bottom Nameplate, Dynamic Equalizer & Media Badges */}
      <div
        className={`absolute bottom-2 left-2 right-2 flex items-center justify-between rounded-xl bg-black/85 backdrop-blur-md border border-white/10 text-white z-10 shadow-lg gap-2 transition-all ${
          isSpotlightHero ? 'px-3.5 py-2 text-sm' : 'px-2.5 py-1.5 text-xs'
        }`}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <span
            className={`truncate font-semibold text-white ${isSpotlightHero ? 'text-sm font-bold' : 'text-xs'}`}
            title={user.displayName || user.username}
          >
            {user.displayName || user.username}
          </span>
          {isMe && (
            <span className="text-violet-300 font-semibold text-[10px] flex-shrink-0 bg-violet-950/60 px-1.5 py-0.5 rounded border border-violet-500/30">
              You
            </span>
          )}

          {/* Live Dynamic Audio Equalizer Bars */}
          {!isMuted && (
            <div className="flex items-center gap-0.5 h-3 flex-shrink-0">
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

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {spatialPanLabel && (
            <span
              className="text-[9px] font-mono font-semibold px-1 py-0.5 rounded bg-white/10 text-emerald-400 border border-white/10 flex items-center gap-1"
              title={`3D Spatial Pan: ${spatialPanLabel}`}
            >
              <Headphones className="w-2.5 h-2.5 text-emerald-400" />
              <span>{spatialPanLabel.replace('Left', 'L').replace('Right', 'R').replace('Center', 'C')}</span>
            </span>
          )}
          {isMuted ? (
            <MicOff className="w-3.5 h-3.5 text-rose-400" />
          ) : (
            <Mic className="w-3.5 h-3.5 text-emerald-400" />
          )}
          {isCameraOn ? (
            <Video className="w-3.5 h-3.5 text-cyan-400" />
          ) : (
            <VideoOff className="w-3.5 h-3.5 text-slate-400" />
          )}
        </div>
      </div>
    </div>
  );
};
