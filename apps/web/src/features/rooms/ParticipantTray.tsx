'use client';

import * as React from 'react';
import { RoomMemberDTO } from '@mivo/shared';
import { Avatar } from '@mivo/ui';
import { Mic, MicOff, Video, Users, Sliders, X, Sparkles } from 'lucide-react';

export interface ParticipantTrayProps {
  participants: RoomMemberDTO[];
  currentUserId?: string;
  isHost?: boolean;
  onHostAction?: (action: 'MUTE' | 'KICK' | 'TRANSFER_HOST', targetUserId: string) => void;
  isOpen: boolean;
  onClose?: () => void;
}

export const ParticipantTray: React.FC<ParticipantTrayProps> = ({
  participants,
  currentUserId,
  isHost = false,
  onHostAction,
  isOpen,
  onClose,
}) => {
  const [activeMenuUserId, setActiveMenuUserId] = React.useState<string | null>(null);

  if (!isOpen) return null;

  return (
    <aside className="w-64 h-full bg-[var(--bg-surface-0)] border-l border-[var(--border-subtle)] backdrop-blur-2xl p-4 flex flex-col select-none z-20 transition-all">
      <div className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--text-muted)] mb-3 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[var(--text-primary)]">
          <Users className="w-3.5 h-3.5 text-[#5E5CE6]" />
          <span>Stage Members</span>
        </span>
        <div className="flex items-center gap-1.5">
          <span className="px-2 py-0.5 rounded-full bg-[#5E5CE6]/20 text-[#5E5CE6] border border-[#5E5CE6]/30 text-[10px] font-bold">
            {participants.length}
          </span>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
              title="Close Roster"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-1.5 scrollbar-thin">
        {participants.map((p) => {
          const isMe = p.userId === currentUserId;
          const isMenuOpen = activeMenuUserId === p.userId;

          return (
            <div key={p.id} className="relative group">
              <div className="flex items-center justify-between p-2.5 rounded-[14px] hover:bg-white/[0.04] transition-colors">
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
                      {isMe && <span className="text-[10px] text-[#5E5CE6] font-semibold">(You)</span>}
                    </div>
                    {p.user.customStatus && (
                      <div className="text-[10px] text-white/40 truncate">{p.user.customStatus}</div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {p.isMuted ? (
                    <MicOff className="w-3.5 h-3.5 text-[#FF453A]" />
                  ) : (
                    <Mic className="w-3.5 h-3.5 text-[#30D158]" />
                  )}
                  {p.isCameraOn ? <Video className="w-3.5 h-3.5 text-[#64D2FF]" /> : null}

                  {/* Host Moderation Trigger */}
                  {isHost && !isMe && (
                    <button
                      onClick={() => setActiveMenuUserId(isMenuOpen ? null : p.userId)}
                      className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.08] transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                      title="Host Moderation"
                    >
                      <Sliders className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Host Action Dropdown */}
              {isMenuOpen && (
                <div className="absolute right-2 top-10 p-2 rounded-[16px] bg-[#0E111C]/95 backdrop-blur-2xl border border-white/[0.12] shadow-2xl z-40 w-44 space-y-1">
                  <div className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-white/40 border-b border-white/[0.06]">
                    Host Controls
                  </div>
                  <button
                    onClick={() => {
                      onHostAction?.('MUTE', p.userId);
                      setActiveMenuUserId(null);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-white/80 hover:bg-white/[0.06] hover:text-white text-left transition-colors cursor-pointer"
                  >
                    <MicOff className="w-3.5 h-3.5 text-[#FF9F0A]" />
                    <span>Mute Participant</span>
                  </button>
                  <button
                    onClick={() => {
                      onHostAction?.('TRANSFER_HOST', p.userId);
                      setActiveMenuUserId(null);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-white/80 hover:bg-white/[0.06] hover:text-white text-left transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#BF5AF2]" />
                    <span>Change Host</span>
                  </button>
                  <button
                    onClick={() => {
                      onHostAction?.('KICK', p.userId);
                      setActiveMenuUserId(null);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-[#FF453A] hover:bg-[#FF453A]/15 hover:text-white text-left transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5 text-[#FF453A]" />
                    <span>Remove from Room</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
};
