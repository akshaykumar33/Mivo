'use client';

import * as React from 'react';
import { RoomMemberDTO, RoomCommunicationMode } from '@mivo/shared';
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
  ExternalLink,
  Pin,
  PinOff,
  LayoutGrid,
  Users,
  Code,
  Presentation,
  PictureInPicture2,
  Radio,
  ChevronDown,
  ChevronUp,
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
  activeMode?: RoomCommunicationMode;
  onSwitchMode?: (mode: RoomCommunicationMode) => void;
  roomName?: string;
}

type SizeMode = 'compact' | 'standard' | 'expanded';
type LayoutMode = 'grid' | 'spotlight';

/**
 * High-performance Video Tile for PiP Overlay.
 * Attaches real live WebRTC MediaStream for both local and remote peers.
 */
interface PiPVideoTileProps {
  participant: RoomMemberDTO;
  stream?: MediaStream | null;
  isMe: boolean;
  isCameraOn: boolean;
  isMuted: boolean;
  audioLevel?: number;
  isPinned?: boolean;
  onTogglePin?: () => void;
  isSpotlight?: boolean;
  onClick?: () => void;
}

const PiPVideoTile: React.FC<PiPVideoTileProps> = ({
  participant,
  stream,
  isMe,
  isCameraOn,
  isMuted,
  audioLevel = 0,
  isPinned = false,
  onTogglePin,
  isSpotlight = false,
  onClick,
}) => {
  const videoRef = React.useRef<HTMLVideoElement>(null);

  const hasLiveVideoTrack = React.useMemo(() => {
    if (!stream) return false;
    const tracks = stream.getVideoTracks();
    return tracks.length > 0 && tracks.some((t) => t.enabled);
  }, [stream]);

  const shouldRenderVideo = isCameraOn && (hasLiveVideoTrack || isMe);

  React.useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (stream && shouldRenderVideo) {
      video.srcObject = stream;
      video.play().catch(() => {});
    } else {
      video.srcObject = null;
    }
  }, [stream, shouldRenderVideo]);

  const isSpeaking = !isMuted && (isMe ? audioLevel > 5 : true);
  const displayName = participant.user.displayName || participant.user.username;

  // Request native OS Picture-in-Picture on this video element if supported
  const handleRequestOSPiP = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (videoRef.current && document.pictureInPictureEnabled) {
        if (document.pictureInPictureElement === videoRef.current) {
          await document.exitPictureInPicture();
        } else {
          await videoRef.current.requestPictureInPicture();
        }
      }
    } catch (err) {
      console.warn('Native OS PiP request failed:', err);
    }
  };

  return (
    <div
      onClick={onClick}
      className={`group relative rounded-2xl bg-[#090B10] border overflow-hidden transition-all duration-200 select-none flex items-center justify-center ${
        isSpotlight ? 'aspect-video w-full' : 'aspect-video w-full'
      } ${
        isPinned
          ? 'border-violet-500 ring-2 ring-violet-500/40 shadow-lg shadow-violet-500/20'
          : isSpeaking
          ? 'border-emerald-500 ring-2 ring-emerald-500/40 shadow-lg shadow-emerald-500/20'
          : 'border-white/[0.08] hover:border-violet-500/50'
      } ${onClick ? 'cursor-pointer' : ''}`}
    >
      {/* Background radial gradient */}
      <div className="absolute inset-0 bg-radial from-violet-600/10 via-transparent to-transparent pointer-events-none" />

      {/* Real Live Video Feed */}
      {shouldRenderVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isMe}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="flex flex-col items-center justify-center p-2 text-center">
          <div className="relative">
            {isSpeaking && (
              <span className="absolute -inset-2 rounded-full bg-emerald-500/20 animate-ping pointer-events-none" />
            )}
            <Avatar
              size={isSpotlight ? 'lg' : 'md'}
              src={participant.user.avatarUrl}
              fallbackText={displayName}
              status={participant.user.status}
              isSpeaking={isSpeaking}
            />
          </div>
          <span className="mt-1 text-[9px] font-semibold text-white/50 tracking-tight">Camera Off</span>
        </div>
      )}

      {/* Spotlight / Pin Indicator Badge */}
      {isPinned && (
        <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-violet-600/90 text-white text-[8px] font-bold tracking-wider flex items-center gap-1 shadow">
          <Pin className="w-2.5 h-2.5" />
          <span>SPOTLIGHT</span>
        </div>
      )}

      {/* Hover Action Buttons */}
      <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
        {onTogglePin && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onTogglePin();
            }}
            className={`p-1 rounded-lg backdrop-blur-md transition-colors cursor-pointer ${
              isPinned
                ? 'bg-violet-600 text-white'
                : 'bg-black/60 text-white/80 hover:text-white hover:bg-black/80'
            }`}
            title={isPinned ? 'Unpin participant' : 'Spotlight participant'}
          >
            {isPinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
          </button>
        )}
        {shouldRenderVideo && typeof document !== 'undefined' && 'pictureInPictureEnabled' in document && (
          <button
            onClick={handleRequestOSPiP}
            className="p-1 rounded-lg bg-black/60 text-white/80 hover:text-white hover:bg-black/80 backdrop-blur-md transition-colors cursor-pointer"
            title="Pop out to Native OS Picture-in-Picture"
          >
            <PictureInPicture2 className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Bottom Nameplate with Real-Time Decibel Equalizer & Mic Indicator */}
      <div className="absolute bottom-1.5 left-1.5 right-1.5 px-2 py-1 rounded-lg bg-black/75 backdrop-blur-md text-[9px] font-bold text-white flex items-center justify-between shadow border border-white/[0.06] z-10">
        <div className="flex items-center gap-1 min-w-0">
          <span className="truncate max-w-[85px]" title={displayName}>
            {displayName}
          </span>
          {isMe && <span className="text-white/50 font-normal">(You)</span>}

          {/* 3-Bar Real-Time Decibel Equalizer */}
          {!isMuted && isSpeaking && (
            <div className="flex items-center gap-0.5 h-2.5 ml-0.5">
              <span
                className="w-0.5 rounded-full bg-emerald-400 animate-pulse transition-all duration-75"
                style={{ height: isMe ? `${Math.max(2, (audioLevel / 100) * 10)}px` : '6px' }}
              />
              <span
                className="w-0.5 rounded-full bg-emerald-400 animate-pulse transition-all duration-75"
                style={{ height: isMe ? `${Math.max(4, (audioLevel / 100) * 12)}px` : '10px' }}
              />
              <span
                className="w-0.5 rounded-full bg-emerald-400 animate-pulse transition-all duration-75"
                style={{ height: isMe ? `${Math.max(2, (audioLevel / 100) * 8)}px` : '5px' }}
              />
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {isMuted ? (
            <MicOff className="w-2.5 h-2.5 text-rose-400" />
          ) : (
            <Mic className="w-2.5 h-2.5 text-emerald-400" />
          )}
        </div>
      </div>
    </div>
  );
};

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
  activeMode = 'VIDEO',
  onSwitchMode,
  roomName,
}) => {
  const [isMinimized, setIsMinimized] = React.useState(false);
  const [sizeMode, setSizeMode] = React.useState<SizeMode>('standard');
  const [layoutMode, setLayoutMode] = React.useState<LayoutMode>('grid');
  const [pinnedUserId, setPinnedUserId] = React.useState<string | null>(null);
  const [showScreenPreview, setShowScreenPreview] = React.useState(true);
  const [position, setPosition] = React.useState({ x: 24, y: 24 });
  const [isDragging, setIsDragging] = React.useState(false);

  // Presentation timer: counts seconds while presenting slides or code
  const [presentationSeconds, setPresentationSeconds] = React.useState(0);
  const isPresenting = isScreenOn || activeMode === 'CANVAS' || activeMode === 'CODE';

  React.useEffect(() => {
    if (!isPresenting) {
      setPresentationSeconds(0);
      return;
    }
    const interval = setInterval(() => {
      setPresentationSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isPresenting]);

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const overlayRef = React.useRef<HTMLDivElement>(null);
  const screenVideoRef = React.useRef<HTMLVideoElement>(null);
  const dragStartRef = React.useRef({ mouseX: 0, mouseY: 0, posX: 24, posY: 24 });

  // Stream attachment for screen broadcast video
  React.useEffect(() => {
    const screenVideo = screenVideoRef.current;
    if (screenVideo && screenStream && showScreenPreview) {
      screenVideo.srcObject = screenStream;
      screenVideo.play().catch(() => {});
    } else if (screenVideo) {
      screenVideo.srcObject = null;
    }
  }, [screenStream, showScreenPreview]);

  // Clamping utility ensuring overlay never goes off-screen
  const clampPosition = React.useCallback(
    (posX: number, posY: number) => {
      if (typeof window === 'undefined') return { x: posX, y: posY };
      const width = overlayRef.current?.offsetWidth || (sizeMode === 'compact' ? 288 : sizeMode === 'expanded' ? 512 : 384);
      const height = overlayRef.current?.offsetHeight || 320;
      const margin = 12;
      const maxX = Math.max(margin, window.innerWidth - width - margin);
      const maxY = Math.max(margin, window.innerHeight - height - margin);

      return {
        x: Math.max(margin, Math.min(maxX, posX)),
        y: Math.max(margin, Math.min(maxY, posY)),
      };
    },
    [sizeMode]
  );

  // Mouse drag handler
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      posX: position.x,
      posY: position.y,
    };
  };

  // Touch drag handler for mobile/tablet/touchscreen support
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    setIsDragging(true);
    dragStartRef.current = {
      mouseX: touch.clientX,
      mouseY: touch.clientY,
      posX: position.x,
      posY: position.y,
    };
  };

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = dragStartRef.current.mouseX - e.clientX;
      const dy = dragStartRef.current.mouseY - e.clientY;
      setPosition(clampPosition(dragStartRef.current.posX + dx, dragStartRef.current.posY + dy));
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging || e.touches.length !== 1) return;
      const touch = e.touches[0];
      const dx = dragStartRef.current.mouseX - touch.clientX;
      const dy = dragStartRef.current.mouseY - touch.clientY;
      setPosition(clampPosition(dragStartRef.current.posX + dx, dragStartRef.current.posY + dy));
    };

    const handleEnd = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleEnd);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging, clampPosition]);

  // Corner Snap Presets
  const snapToCorner = (corner: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left') => {
    if (typeof window === 'undefined') return;
    const w = overlayRef.current?.offsetWidth || 384;
    const h = overlayRef.current?.offsetHeight || 320;
    const margin = 20;

    switch (corner) {
      case 'bottom-right':
        setPosition({ x: margin, y: margin });
        break;
      case 'bottom-left':
        setPosition({ x: window.innerWidth - w - margin, y: margin });
        break;
      case 'top-right':
        setPosition({ x: margin, y: window.innerHeight - h - margin });
        break;
      case 'top-left':
        setPosition({ x: window.innerWidth - w - margin, y: window.innerHeight - h - margin });
        break;
    }
  };

  if (!isOpen) return null;

  // Active spotlight participant (if in spotlight layout)
  const spotlightParticipant =
    participants.find((p) => p.userId === pinnedUserId) ||
    participants.find((p) => p.userId !== currentUserId && !p.isMuted) ||
    participants[0];

  // Grid sizing class
  const getContainerWidth = () => {
    if (sizeMode === 'compact') return 'w-72 sm:w-80';
    if (sizeMode === 'expanded') return 'w-[92vw] sm:w-[500px] max-w-xl';
    return 'w-[90vw] sm:w-96 max-w-sm';
  };

  const getGridColumnsClass = (count: number) => {
    if (count <= 1) return 'grid-cols-1';
    if (count === 2) return 'grid-cols-2';
    if (sizeMode === 'expanded' && count >= 3) return 'grid-cols-3';
    return 'grid-cols-2';
  };

  return (
    <div
      ref={overlayRef}
      style={{
        bottom: `${position.y}px`,
        right: `${position.x}px`,
      }}
      className={`fixed z-50 select-none shadow-2xl transition-all duration-150 animate-slide-up ${
        isDragging ? 'opacity-95 cursor-grabbing' : ''
      }`}
    >
      <div
        className={`${getContainerWidth()} rounded-3xl bg-[var(--bg-surface-0)]/95 border border-[var(--border-subtle)] backdrop-blur-3xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.8)] flex flex-col`}
      >
        {/* Header / Draggable Bar */}
        <div
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          className="h-11 px-3.5 bg-gradient-to-r from-violet-600/30 via-indigo-600/20 to-transparent border-b border-[var(--border-subtle)] flex items-center justify-between cursor-grab active:cursor-grabbing"
        >
          <div className="flex items-center gap-2 min-w-0">
            <GripHorizontal className="w-3.5 h-3.5 text-white/50 flex-shrink-0" />
            <span className="relative flex h-2 w-2 flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-[11px] font-bold text-[var(--text-primary)] font-display tracking-tight truncate max-w-[130px] sm:max-w-[160px]">
              {roomName || 'Presenter Stage'}
            </span>
            <span className="px-1.5 py-0.5 rounded-md bg-white/[0.08] text-[9px] font-bold text-white/70 flex-shrink-0">
              {participants.length}
            </span>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Layout switch: Grid vs Spotlight */}
            {!isMinimized && (
              <button
                onClick={() => setLayoutMode(layoutMode === 'grid' ? 'spotlight' : 'grid')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  layoutMode === 'spotlight'
                    ? 'bg-violet-600 text-white shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/[0.08]'
                }`}
                title={layoutMode === 'grid' ? 'Switch to Spotlight View' : 'Switch to Grid View'}
              >
                {layoutMode === 'grid' ? (
                  <LayoutGrid className="w-3.5 h-3.5" />
                ) : (
                  <Users className="w-3.5 h-3.5" />
                )}
              </button>
            )}

            {/* Size toggle: Compact -> Standard -> Expanded */}
            {!isMinimized && (
              <button
                onClick={() =>
                  setSizeMode(
                    sizeMode === 'standard' ? 'expanded' : sizeMode === 'expanded' ? 'compact' : 'standard'
                  )
                }
                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/[0.08] transition-colors cursor-pointer text-[10px] font-bold"
                title={`Size: ${sizeMode}. Click to switch.`}
              >
                {sizeMode === 'compact' ? 'S' : sizeMode === 'standard' ? 'M' : 'L'}
              </button>
            )}

            {/* Minimize / Expand PiP */}
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/[0.08] transition-colors cursor-pointer"
              title={isMinimized ? 'Expand PiP' : 'Minimize PiP'}
            >
              {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
            </button>

            {/* Close PiP */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-rose-400 hover:bg-white/[0.08] transition-colors cursor-pointer"
              title="Close PiP"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Minimized Pill View */}
        {isMinimized ? (
          <div className="p-2.5 flex items-center justify-between bg-[var(--bg-surface-0)] gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Avatar
                size="sm"
                src={spotlightParticipant?.user.avatarUrl}
                fallbackText={spotlightParticipant?.user.displayName || spotlightParticipant?.user.username}
                status={spotlightParticipant?.user.status}
                isSpeaking={!isMuted && audioLevel > 5}
              />
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] font-bold text-white truncate max-w-[120px]">
                  {spotlightParticipant?.user.displayName || spotlightParticipant?.user.username}
                </span>
                <span className="text-[9px] text-[var(--text-muted)] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  {participants.length} live on stage
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {onToggleMute && (
                <button
                  onClick={onToggleMute}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    isMuted ? 'bg-rose-600/30 text-rose-400' : 'bg-white/[0.08] text-white'
                  }`}
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
                </button>
              )}
              <button
                onClick={() => setIsMinimized(false)}
                className="p-1.5 rounded-lg bg-violet-600 text-white hover:bg-violet-500 transition-colors cursor-pointer"
                title="Expand PiP Presenter"
              >
                <Maximize2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        ) : (
          /* Expanded Body */
          <div className="p-3 space-y-2.5 max-h-[460px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
            {/* Active Presentation Banner (Slides, Code or Screen) */}
            {isPresenting && (
              <div className="p-2.5 rounded-2xl bg-gradient-to-r from-violet-950/60 via-indigo-950/40 to-slate-900/60 border border-violet-500/30 flex items-center justify-between gap-2 shadow-inner">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="p-1.5 rounded-xl bg-violet-600 text-white shadow flex-shrink-0">
                    {activeMode === 'CODE' ? (
                      <Code className="w-3.5 h-3.5" />
                    ) : activeMode === 'CANVAS' ? (
                      <Presentation className="w-3.5 h-3.5" />
                    ) : (
                      <Monitor className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-extrabold tracking-wide uppercase text-violet-300 truncate">
                        {activeMode === 'CODE'
                          ? 'Presenting Code'
                          : activeMode === 'CANVAS'
                          ? 'Presenting Slides'
                          : 'Sharing Screen'}
                      </span>
                      <span className="px-1 py-0.2 rounded bg-rose-600 text-[8px] font-black text-white uppercase tracking-wider animate-pulse">
                        LIVE
                      </span>
                    </div>
                    <span className="text-[9px] font-mono font-bold text-white/60">
                      Elapsed: {formatTimer(presentationSeconds)}
                    </span>
                  </div>
                </div>

                {/* Quick Stage Mode Switchers */}
                {onSwitchMode && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => onSwitchMode(activeMode === 'CODE' ? 'CANVAS' : 'CODE')}
                      className="px-2 py-1 rounded-lg bg-white/[0.08] hover:bg-white/[0.14] text-[9px] font-bold text-white transition-colors cursor-pointer"
                      title={activeMode === 'CODE' ? 'Switch to Slides / Canvas' : 'Switch to Code Stage'}
                    >
                      {activeMode === 'CODE' ? 'Slides' : 'Code'}
                    </button>
                    <button
                      onClick={() => onSwitchMode('VIDEO')}
                      className="px-2 py-1 rounded-lg bg-violet-600/60 hover:bg-violet-600 text-[9px] font-bold text-white transition-colors cursor-pointer"
                      title="Return to Video Stage"
                    >
                      Stage
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Screen Share Dominant Broadcast Preview (Collapsible) */}
            {isScreenOn && (
              <div className="relative rounded-2xl bg-black border border-cyan-500/40 overflow-hidden shadow-lg">
                <div className="p-1.5 px-2.5 bg-cyan-950/60 border-b border-cyan-500/20 flex items-center justify-between text-[9px] font-bold text-cyan-300">
                  <div className="flex items-center gap-1.5">
                    <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
                    <span>Audience Screen View</span>
                  </div>
                  <button
                    onClick={() => setShowScreenPreview(!showScreenPreview)}
                    className="p-0.5 rounded text-cyan-300/80 hover:text-cyan-200 cursor-pointer"
                    title={showScreenPreview ? 'Hide Screen Preview' : 'Show Screen Preview'}
                  >
                    {showScreenPreview ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                </div>

                {showScreenPreview && (
                  <div className="relative aspect-video flex items-center justify-center bg-black">
                    {screenStream ? (
                      <video
                        ref={screenVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-cyan-400">
                        <Monitor className="w-6 h-6 animate-pulse" />
                        <span className="text-[9px] font-bold uppercase tracking-wider">Broadcasting Screen</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* All Participant Live Video Feeds */}
            {layoutMode === 'spotlight' && spotlightParticipant ? (
              /* Spotlight View: 1 Main Big Video + Horizontal Strip of all participants */
              <div className="space-y-2">
                {/* Main Spotlight Video */}
                <PiPVideoTile
                  participant={spotlightParticipant}
                  stream={
                    spotlightParticipant.userId === currentUserId
                      ? localStream
                      : remoteStreams[spotlightParticipant.userId]
                  }
                  isMe={spotlightParticipant.userId === currentUserId}
                  isCameraOn={
                    spotlightParticipant.userId === currentUserId
                      ? isCameraOn
                      : spotlightParticipant.isCameraOn
                  }
                  isMuted={
                    spotlightParticipant.userId === currentUserId
                      ? isMuted
                      : spotlightParticipant.isMuted
                  }
                  audioLevel={spotlightParticipant.userId === currentUserId ? audioLevel : undefined}
                  isPinned={pinnedUserId === spotlightParticipant.userId}
                  onTogglePin={() =>
                    setPinnedUserId(pinnedUserId === spotlightParticipant.userId ? null : spotlightParticipant.userId)
                  }
                  isSpotlight
                />

                {/* Filmstrip of All Other Participants */}
                {participants.length > 1 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 scrollbar-thin scrollbar-thumb-white/10">
                    {participants.map((p) => {
                      const isMe = p.userId === currentUserId;
                      const stream = isMe ? localStream : remoteStreams[p.userId];
                      const camOn = isMe ? isCameraOn : p.isCameraOn;
                      const micMuted = isMe ? isMuted : p.isMuted;
                      const isSelected = p.userId === spotlightParticipant.userId;

                      return (
                        <div
                          key={p.id}
                          onClick={() => setPinnedUserId(p.userId)}
                          className={`w-24 sm:w-28 flex-shrink-0 rounded-xl overflow-hidden cursor-pointer transition-all ${
                            isSelected
                              ? 'ring-2 ring-violet-500 scale-[1.02]'
                              : 'opacity-70 hover:opacity-100 hover:scale-[1.02]'
                          }`}
                        >
                          <PiPVideoTile
                            participant={p}
                            stream={stream}
                            isMe={isMe}
                            isCameraOn={camOn}
                            isMuted={micMuted}
                            audioLevel={isMe ? audioLevel : undefined}
                            isPinned={p.userId === pinnedUserId}
                            onTogglePin={() =>
                              setPinnedUserId(pinnedUserId === p.userId ? null : p.userId)
                            }
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              /* Grid View: All participant live video feeds rendered in an auto-arranging responsive grid */
              <div className={`grid gap-2 ${getGridColumnsClass(participants.length)}`}>
                {participants.map((p) => {
                  const isMe = p.userId === currentUserId;
                  const stream = isMe ? localStream : remoteStreams[p.userId];
                  const camOn = isMe ? isCameraOn : p.isCameraOn;
                  const micMuted = isMe ? isMuted : p.isMuted;

                  return (
                    <PiPVideoTile
                      key={p.id}
                      participant={p}
                      stream={stream}
                      isMe={isMe}
                      isCameraOn={camOn}
                      isMuted={micMuted}
                      audioLevel={isMe ? audioLevel : undefined}
                      isPinned={p.userId === pinnedUserId}
                      onTogglePin={() =>
                        setPinnedUserId(pinnedUserId === p.userId ? null : p.userId)
                      }
                      onClick={() => {
                        setPinnedUserId(p.userId);
                        setLayoutMode('spotlight');
                      }}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Bottom Call Controls & Quick Actions */}
        <div className="p-2.5 bg-[var(--bg-surface-1)] border-t border-[var(--border-subtle)] flex items-center justify-between gap-1">
          <div className="flex items-center gap-1.5">
            {/* Mic Toggle */}
            {onToggleMute && (
              <button
                onClick={onToggleMute}
                className={`p-2 rounded-xl transition-all cursor-pointer ${
                  isMuted
                    ? 'bg-rose-600/20 text-rose-400 hover:bg-rose-600 hover:text-white'
                    : 'bg-white/[0.08] text-white hover:bg-white/[0.14]'
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
                    : 'bg-white/[0.08] text-white hover:bg-white/[0.14]'
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
                    : 'bg-white/[0.08] text-white hover:bg-white/[0.14]'
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
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-xs font-semibold text-[var(--text-primary)] transition-all cursor-pointer"
              title="Return to Full Meeting Stage"
            >
              <ExternalLink className="w-3 h-3 text-[#5E5CE6]" />
              <span className="text-[10px] hidden sm:inline">Expand Stage</span>
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
