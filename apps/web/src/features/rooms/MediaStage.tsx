'use client';

import * as React from 'react';
import { RoomMemberDTO, RoomCommunicationMode, RoomDTO } from '@mivo/shared';
import { Avatar } from '@mivo/ui';
import { Mic, MicOff, Video, VideoOff, Monitor, Radio, Activity, Volume2 } from 'lucide-react';
import { ChatStream } from '../chat/ChatStream';

export interface MediaStageProps {
  mode: RoomCommunicationMode;
  participants: RoomMemberDTO[];
  room?: RoomDTO;
  currentUserId?: string;
  isMuted: boolean;
  isCameraOn: boolean;
  isScreenOn: boolean;
}

export const MediaStage: React.FC<MediaStageProps> = ({
  mode,
  participants,
  room,
  currentUserId,
  isMuted,
  isCameraOn,
  isScreenOn,
}) => {
  // TEXT MODE: Full Interactive Real-Time Chat Stream
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

  // VOICE MODE: Luxury Spatial Voice Huddle Stage
  if (mode === 'VOICE') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#0E1017] select-none relative overflow-hidden">
        {/* Subtle Ambient Glow */}
        <div className="absolute inset-0 bg-radial from-violet-600/10 via-transparent to-transparent pointer-events-none" />

        <div className="mb-10 text-center z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold mb-3 shadow-lg shadow-emerald-500/10">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Spatial Voice Huddle</span>
          </div>
          <h3 className="text-xl font-bold text-white font-display">
            {participants.length} {participants.length === 1 ? 'Speaker' : 'Speakers'} in Stage
          </h3>
        </div>

        <div className="w-full max-w-4xl grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-8 place-items-center z-10">
          {participants.map((p) => {
            const isMe = p.userId === currentUserId;
            const participantMuted = isMe ? isMuted : p.isMuted;

            return (
              <div
                key={p.id}
                className="flex flex-col items-center p-5 rounded-3xl bg-white/[0.02] border border-white/[0.05] hover:border-violet-500/30 transition-all duration-200 group w-44 shadow-lg"
              >
                <div className="relative">
                  <Avatar
                    size="xl"
                    src={p.user.avatarUrl}
                    fallbackText={p.user.displayName || p.user.username}
                    status={p.user.status}
                    isSpeaking={!participantMuted}
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

                  {/* Soundwave animation for speaking participants */}
                  {!participantMuted ? (
                    <div className="flex items-center justify-center gap-1 mt-2 h-3.5">
                      <span className="w-0.5 h-2 bg-emerald-400 rounded-full animate-bounce" />
                      <span className="w-0.5 h-3.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                      <span className="w-0.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                      <span className="w-0.5 h-2.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.1s]" />
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

  // VIDEO MODE: Adaptive Responsive Video Grid
  if (mode === 'VIDEO') {
    return (
      <div className="flex-1 p-6 bg-[#0E1017] select-none overflow-y-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 h-full min-h-[380px]">
          {participants.map((p) => {
            const isMe = p.userId === currentUserId;
            const camOn = isMe ? isCameraOn : p.isCameraOn;
            const participantMuted = isMe ? isMuted : p.isMuted;

            return (
              <div
                key={p.id}
                className="relative rounded-3xl bg-[#08090E] border border-white/[0.08] flex items-center justify-center overflow-hidden shadow-2xl aspect-video group hover:border-violet-500/50 transition-all duration-200"
              >
                {camOn ? (
                  <div className="w-full h-full bg-gradient-to-tr from-[#08090E] via-indigo-950/40 to-[#08090E] flex flex-col items-center justify-center text-slate-300">
                    <Video className="w-8 h-8 text-cyan-400 mb-2 animate-pulse" />
                    <span className="text-xs font-bold text-white">Live Stream Active</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <Avatar
                      size="xl"
                      src={p.user.avatarUrl}
                      fallbackText={p.user.displayName || p.user.username}
                      status={p.user.status}
                      isSpeaking={!participantMuted}
                    />
                  </div>
                )}

                {/* Bottom Video Name & Status Bar */}
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between px-3.5 py-2 rounded-2xl bg-[#090B10]/80 backdrop-blur-xl border border-white/[0.08] text-xs text-white">
                  <span className="truncate font-bold text-xs">
                    {p.user.displayName || p.user.username}
                    {isMe && ' (You)'}
                  </span>
                  <div className="flex items-center gap-2">
                    {participantMuted ? (
                      <MicOff className="w-3.5 h-3.5 text-rose-400" />
                    ) : (
                      <Mic className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                    {camOn ? (
                      <Video className="w-3.5 h-3.5 text-cyan-400" />
                    ) : (
                      <VideoOff className="w-3.5 h-3.5 text-slate-500" />
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

  // SCREEN_SHARE or STREAM MODE
  return (
    <div className="flex-1 p-6 bg-[#0E1017] flex flex-col select-none">
      {/* Primary Dominant Stage */}
      <div className="flex-1 rounded-3xl bg-[#08090E] border border-white/[0.08] relative flex items-center justify-center shadow-2xl overflow-hidden">
        {/* Stage Content */}
        <div className="text-center p-8">
          <div className="inline-flex p-6 rounded-3xl bg-gradient-to-tr from-violet-600/20 to-indigo-600/20 text-violet-400 mb-5 border border-violet-500/30 shadow-2xl shadow-violet-600/20">
            {mode === 'SCREEN_SHARE' ? (
              <Monitor className="w-12 h-12 text-cyan-400" />
            ) : (
              <Radio className="w-12 h-12 animate-pulse text-rose-400" />
            )}
          </div>
          <h4 className="text-xl font-extrabold text-white font-display">
            {mode === 'SCREEN_SHARE' ? 'Interactive Screen Broadcast Active' : 'Live Broadcaster Stage'}
          </h4>
          <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-md mx-auto">
            Ultra-low latency 60fps presentation stream relayed through Mivo real-time stage.
          </p>
        </div>

        {/* Live Badge */}
        <div className="absolute top-5 left-5 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-600 text-white text-xs font-extrabold shadow-lg shadow-rose-600/40">
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
