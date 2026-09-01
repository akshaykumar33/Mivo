'use client';

import * as React from 'react';
import { RoomMemberDTO, RoomCommunicationMode, RoomDTO } from '@mivo/shared';
import { Avatar } from '@mivo/ui';
import { Mic, MicOff, Video, VideoOff, Monitor, Radio, Activity } from 'lucide-react';
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
        <div className="flex-1 flex items-center justify-center bg-[#1A2232]">
          <div className="w-8 h-8 border-3 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      );
    }

    return <ChatStream room={room} />;
  }

  // VOICE MODE: Dynamic Spatial Voice Circle with Soundwave Visualizer
  if (mode === 'VOICE') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#1A2232] select-none relative overflow-hidden">
        {/* Ambient Glow */}
        <div className="absolute inset-0 bg-radial from-violet-600/10 via-transparent to-transparent pointer-events-none" />

        <div className="mb-8 text-center z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/80 text-emerald-400 text-xs font-semibold mb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Voice Huddle Active</span>
          </div>
          <h3 className="text-base font-bold text-white font-display">
            {participants.length} {participants.length === 1 ? 'Participant' : 'Participants'} in Huddle
          </h3>
        </div>

        <div className="w-full max-w-3xl grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-8 place-items-center z-10">
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

                  {/* Mic Mute Indicator Bubble */}
                  <div
                    className={`absolute -bottom-1 -right-1 p-1.5 rounded-full text-white shadow-lg transition-colors ${
                      participantMuted ? 'bg-rose-600 ring-2 ring-[#1A2232]' : 'bg-emerald-600 ring-2 ring-[#1A2232]'
                    }`}
                  >
                    {participantMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                  </div>
                </div>

                <div className="mt-3 text-center">
                  <div className="text-xs font-semibold text-slate-100 truncate max-w-[120px]">
                    {p.user.displayName || p.user.username}
                    {isMe && ' (You)'}
                  </div>

                  {/* Soundwave animation for speaking participants */}
                  {!participantMuted ? (
                    <div className="flex items-center justify-center gap-0.5 mt-1.5 h-3">
                      <span className="w-0.5 h-2 bg-emerald-400 rounded-full animate-bounce" />
                      <span className="w-0.5 h-3 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                      <span className="w-0.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                      <span className="w-0.5 h-2.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.1s]" />
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-500 font-medium">Muted</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // VIDEO MODE: Adaptive Responsive Grid
  if (mode === 'VIDEO') {
    return (
      <div className="flex-1 p-5 bg-[#1A2232] select-none overflow-y-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 h-full min-h-[360px]">
          {participants.map((p) => {
            const isMe = p.userId === currentUserId;
            const camOn = isMe ? isCameraOn : p.isCameraOn;
            const participantMuted = isMe ? isMuted : p.isMuted;

            return (
              <div
                key={p.id}
                className="relative rounded-2xl bg-slate-950 border border-slate-800/80 flex items-center justify-center overflow-hidden shadow-2xl aspect-video group hover:border-violet-500/40 transition-colors"
              >
                {camOn ? (
                  <div className="w-full h-full bg-gradient-to-tr from-slate-900 via-indigo-950/60 to-slate-900 flex flex-col items-center justify-center text-slate-300">
                    <Video className="w-8 h-8 text-cyan-400 mb-2 animate-pulse" />
                    <span className="text-xs font-semibold text-slate-200">HD Stream Active</span>
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
                <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-800/60 text-xs text-white">
                  <span className="truncate font-semibold text-xs">
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
    <div className="flex-1 p-4 bg-[#1A2232] flex flex-col select-none">
      {/* Primary Dominant Stage */}
      <div className="flex-1 rounded-2xl bg-slate-950 border border-slate-800/80 relative flex items-center justify-center shadow-2xl overflow-hidden">
        {/* Stage Content */}
        <div className="text-center p-6">
          <div className="inline-flex p-5 rounded-3xl bg-violet-600/20 text-violet-400 mb-4 border border-violet-500/30 shadow-xl shadow-violet-600/10">
            {mode === 'SCREEN_SHARE' ? (
              <Monitor className="w-10 h-10 text-cyan-400" />
            ) : (
              <Radio className="w-10 h-10 animate-pulse text-rose-400" />
            )}
          </div>
          <h4 className="text-base font-bold text-white font-display">
            {mode === 'SCREEN_SHARE' ? 'Interactive Screen Broadcast Active' : 'Live Broadcaster Stage'}
          </h4>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">
            Ultra-low latency 60fps presentation stream relayed through Mivo real-time stage.
          </p>
        </div>

        {/* Live Badge */}
        <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-600 text-white text-xs font-bold shadow-lg shadow-rose-600/40">
          <span className="w-2 h-2 rounded-full bg-white animate-ping" />
          <span>{mode === 'SCREEN_SHARE' ? 'PRESENTING' : 'LIVE ON STAGE'}</span>
        </div>
      </div>

      {/* Attendee Filmstrip */}
      <div className="h-16 mt-3 flex items-center gap-3 overflow-x-auto py-1">
        {participants.map((p) => (
          <div
            key={p.id}
            className="flex-shrink-0 px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center gap-2 text-xs"
          >
            <Avatar size="xs" src={p.user.avatarUrl} fallbackText={p.user.displayName || p.user.username} />
            <span className="text-slate-200 truncate max-w-[90px] font-medium">
              {p.user.displayName || p.user.username}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
