'use client';

import * as React from 'react';
import { RoomMemberDTO, RoomCommunicationMode } from '@mivo/shared';
import { Avatar } from '@mivo/ui';
import { Mic, MicOff, Video, VideoOff, Monitor, Radio, MessageSquare } from 'lucide-react';

export interface MediaStageProps {
  mode: RoomCommunicationMode;
  participants: RoomMemberDTO[];
  currentUserId?: string;
  isMuted: boolean;
  isCameraOn: boolean;
  isScreenOn: boolean;
}

export const MediaStage: React.FC<MediaStageProps> = ({
  mode,
  participants,
  currentUserId,
  isMuted,
  isCameraOn,
  isScreenOn,
}) => {
  if (mode === 'TEXT') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center select-none bg-[#1C2232]">
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-violet-600/20 to-indigo-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400 mb-4 shadow-xl">
          <MessageSquare className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-white mb-1">Text Chat Mode Active</h3>
        <p className="text-xs text-slate-400 max-w-sm">
          Welcome to the room chat! Switch to Voice, Video, Screen Share, or Live Stage at any time from the top bar.
        </p>
      </div>
    );
  }

  if (mode === 'VOICE') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#1C2232] select-none">
        <div className="w-full max-w-2xl grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 place-items-center">
          {participants.map((p) => {
            const isMe = p.userId === currentUserId;
            const participantMuted = isMe ? isMuted : p.isMuted;

            return (
              <div key={p.id} className="flex flex-col items-center group">
                <div className="relative">
                  <Avatar
                    size="xl"
                    src={p.user.avatarUrl}
                    fallbackText={p.user.displayName || p.user.username}
                    status={p.user.status}
                    isSpeaking={!participantMuted}
                  />
                  <div
                    className={`absolute -bottom-1 -right-1 p-1 rounded-full text-white shadow-md ${
                      participantMuted ? 'bg-rose-600' : 'bg-emerald-600'
                    }`}
                  >
                    {participantMuted ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
                  </div>
                </div>
                <span className="text-xs font-semibold text-slate-200 mt-2 truncate max-w-[100px]">
                  {p.user.displayName || p.user.username}
                  {isMe && ' (You)'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (mode === 'VIDEO') {
    return (
      <div className="flex-1 p-4 bg-[#1C2232] select-none overflow-y-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 h-full min-h-[320px]">
          {participants.map((p) => {
            const isMe = p.userId === currentUserId;
            const camOn = isMe ? isCameraOn : p.isCameraOn;
            const participantMuted = isMe ? isMuted : p.isMuted;

            return (
              <div
                key={p.id}
                className="relative rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center overflow-hidden shadow-lg aspect-video"
              >
                {camOn ? (
                  <div className="w-full h-full bg-gradient-to-tr from-slate-900 to-indigo-950 flex items-center justify-center text-slate-400">
                    <span className="text-xs font-medium">[Live Video Feed Simulator]</span>
                  </div>
                ) : (
                  <Avatar
                    size="lg"
                    src={p.user.avatarUrl}
                    fallbackText={p.user.displayName || p.user.username}
                    status={p.user.status}
                  />
                )}

                {/* Bottom Overlay Info */}
                <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-xs text-white">
                  <span className="truncate font-semibold text-[11px]">
                    {p.user.displayName || p.user.username}
                    {isMe && ' (You)'}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {participantMuted ? (
                      <MicOff className="w-3 h-3 text-rose-400" />
                    ) : (
                      <Mic className="w-3 h-3 text-emerald-400" />
                    )}
                    {camOn ? (
                      <Video className="w-3 h-3 text-cyan-400" />
                    ) : (
                      <VideoOff className="w-3 h-3 text-slate-500" />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // SCREEN_SHARE or STREAM
  return (
    <div className="flex-1 p-4 bg-[#1C2232] flex flex-col select-none">
      {/* Primary Stage */}
      <div className="flex-1 rounded-2xl bg-slate-950 border border-slate-800 relative flex items-center justify-center shadow-2xl overflow-hidden">
        <div className="text-center">
          <div className="inline-flex p-4 rounded-2xl bg-violet-600/20 text-violet-400 mb-3 border border-violet-500/30">
            {mode === 'SCREEN_SHARE' ? <Monitor className="w-8 h-8" /> : <Radio className="w-8 h-8 animate-pulse text-cyan-400" />}
          </div>
          <h4 className="text-sm font-bold text-white">
            {mode === 'SCREEN_SHARE' ? 'Screen Broadcast Active' : 'Live Broadcaster Stage'}
          </h4>
          <p className="text-xs text-slate-400 mt-1">High-definition low-latency stream pipeline</p>
        </div>

        {/* Live Indicator Badge */}
        <div className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-600 text-white text-xs font-bold shadow-lg shadow-rose-600/40">
          <span className="w-2 h-2 rounded-full bg-white animate-ping" />
          <span>LIVE</span>
        </div>
      </div>

      {/* Attendee Filmstrip */}
      <div className="h-20 mt-3 flex items-center gap-3 overflow-x-auto py-1">
        {participants.map((p) => (
          <div
            key={p.id}
            className="flex-shrink-0 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-2 text-xs"
          >
            <Avatar size="sm" src={p.user.avatarUrl} fallbackText={p.user.displayName || p.user.username} />
            <span className="text-slate-200 truncate max-w-[80px]">{p.user.displayName || p.user.username}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
