'use client';

import * as React from 'react';
import { RoomMemberDTO } from '@mivo/shared';
import { Avatar, Badge } from '@mivo/ui';
import { Mic, MicOff, Video, VideoOff, Crown, Shield, Users } from 'lucide-react';

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
    <aside className="w-64 h-full bg-[#0B0D14] border-l border-white/[0.06] p-4 flex flex-col select-none z-10">
      <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-4 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-white">
          <Users className="w-3.5 h-3.5 text-violet-400" />
          <span>Stage Members</span>
        </span>
        <span className="px-2 py-0.5 rounded-full bg-violet-600/20 text-violet-300 border border-violet-500/30 text-[10px] font-bold">
          {participants.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-1.5">
        {participants.map((p) => {
          const isMe = p.userId === currentUserId;

          return (
            <div
              key={p.id}
              className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-white/[0.03] transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Avatar
                  size="sm"
                  src={p.user.avatarUrl}
                  fallbackText={p.user.displayName || p.user.username}
                  status={p.user.status}
                />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate flex items-center gap-1">
                    <span>{p.user.displayName || p.user.username}</span>
                    {isMe && <span className="text-[10px] text-violet-400 font-semibold">(You)</span>}
                  </div>
                  {p.user.customStatus && (
                    <div className="text-[10px] text-slate-400 truncate">{p.user.customStatus}</div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5">
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
