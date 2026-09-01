'use client';

import * as React from 'react';
import { Avatar } from '@mivo/ui';
import { Mic, MicOff, Video, VideoOff } from 'lucide-react';
import { UserSummaryDTO } from '@mivo/shared';

export interface LiveVideoTileProps {
  user: UserSummaryDTO;
  isMe: boolean;
  isMuted: boolean;
  isCameraOn: boolean;
  mediaStream?: MediaStream | null;
  audioLevel?: number;
}

export const LiveVideoTile: React.FC<LiveVideoTileProps> = ({
  user,
  isMe,
  isMuted,
  isCameraOn,
  mediaStream,
  audioLevel = 0,
}) => {
  const videoRef = React.useRef<HTMLVideoElement>(null);

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
      className={`relative rounded-3xl bg-[#08090E] border flex items-center justify-center overflow-hidden shadow-2xl aspect-video transition-all duration-200 ${
        isSpeaking
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

      {/* Floating Bottom Nameplate & Media Statuses */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between px-3.5 py-2 rounded-2xl bg-[#090B10]/85 backdrop-blur-xl border border-white/[0.08] text-xs text-white z-10 shadow-lg">
        <span className="truncate font-bold text-xs">
          {user.displayName || user.username}
          {isMe && ' (You)'}
        </span>
        <div className="flex items-center gap-2">
          {isMuted ? (
            <MicOff className="w-3.5 h-3.5 text-rose-400" />
          ) : (
            <div className="flex items-center gap-1">
              <Mic className="w-3.5 h-3.5 text-emerald-400" />
              {isMe && audioLevel > 5 && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              )}
            </div>
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
