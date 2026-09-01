'use client';

import * as React from 'react';
import { RoomMemberDTO } from '@mivo/shared';
import { Avatar, Badge } from '@mivo/ui';
import { Mic, MicOff, Video, VideoOff, Crown, Shield } from 'lucide-react';

export interface ParticipantTrayProps {
  participants: RoomMemberDTO[];
  currentUserId?: string;
  isOpen: boolean;
}

export const ParticipantTray: React.FC<ParticipantTrayProps> = ({
  participants,
  currentUserId,
  isOpen,
}) => {
  if (!isOpen) return null;

  return (
    <aside className="w-64 h-full bg-[#151A26] border-l border-slate-800/80 p-4 flex flex-col select-none z-10">
      <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-between">
        <span>Participants</span>
        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">
          {participants.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-1">
        {participants.map((p) => {
          const isMe = p.userId === currentUserId;

          return (
            <div
              key={p.id}
              className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-800/50 transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Avatar
                  size="sm"
                  src={p.user.avatarUrl}
                  fallbackText={p.user.displayName || p.user.username}
                  status={p.user.status}
                />
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-200 truncate flex items-center gap-1">
                    <span>{p.user.displayName || p.user.username}</span>
                    {isMe && <span className="text-[10px] text-violet-400">(You)</span>}
                  </div>
                  {p.user.customStatus && (
                    <div className="text-[10px] text-slate-500 truncate">{p.user.customStatus}</div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1">
                {p.isMuted ? (
                  <MicOff className="w-3.5 h-3.5 text-rose-400" />
                ) : (
                  <Mic className="w-3.5 h-3.5 text-emerald-400" />
                )}
                {p.isCameraOn ? (
                  <Video className="w-3.5 h-3.5 text-cyan-400" />
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
};
