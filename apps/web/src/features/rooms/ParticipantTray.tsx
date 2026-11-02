'use client';

import * as React from 'react';
import { RoomMemberDTO } from '@mivo/shared';
import { Avatar } from '@mivo/ui';
import { Mic, MicOff, Video, Users, Sliders, X, Sparkles, Search, UserPlus, Trash2 } from 'lucide-react';
import { useRoomStore } from '@/stores/roomStore';
import { usePresenceStore } from '@/stores/presenceStore';

export interface ParticipantTrayProps {
  participants: RoomMemberDTO[];
  currentUserId?: string;
  isHost?: boolean;
  onHostAction?: (action: 'MUTE' | 'KICK' | 'TRANSFER_HOST', targetUserId: string) => void;
  isOpen: boolean;
  onClose?: () => void;
  onToggleInvite?: () => void;
}

export const ParticipantTray: React.FC<ParticipantTrayProps> = ({
  participants,
  currentUserId,
  isHost = false,
  onHostAction,
  isOpen,
  onClose,
  onToggleInvite,
}) => {
  const [activeMenuUserId, setActiveMenuUserId] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState('');
  const userStatuses = usePresenceStore((s) => s.userStatuses);
  const { simulateBulkParticipants, clearSimulatedParticipants } = useRoomStore();

  const filteredParticipants = React.useMemo(() => {
    if (!searchQuery.trim()) return participants;
    const q = searchQuery.toLowerCase();
    return participants.filter(
      (p) =>
        (p.user.displayName || p.user.username).toLowerCase().includes(q) ||
        (p.user.customStatus || '').toLowerCase().includes(q)
    );
  }, [participants, searchQuery]);

  if (!isOpen) return null;

  return (
    <>
      {/* Mobile Backdrop */}
      <div
        onClick={onClose}
        className="sm:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
      />

      <aside className="fixed sm:relative inset-y-0 right-0 w-full sm:w-72 h-full bg-[var(--bg-surface-0)] border-l border-[var(--border-subtle)] backdrop-blur-2xl p-4 flex flex-col select-none z-50 sm:z-20 shadow-2xl sm:shadow-none animate-slide-left transition-all">
        <div className="text-xs font-medium text-[var(--text-muted)] mb-3 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[var(--text-primary)]">
            <Users className="w-3.5 h-3.5 text-[var(--brand-primary,#6366f1)]" />
            <span>Stage Members</span>
          </span>
          <div className="flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded-full bg-[var(--brand-primary,#6366f1)]/15 text-[var(--brand-primary,#6366f1)] border border-[var(--brand-primary,#6366f1)]/25 text-[10px] font-semibold">
              {participants.length}
            </span>
            {onClose && (
              <button
                onClick={onClose}
                className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/[0.08] transition-colors cursor-pointer"
                title="Close Roster"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Add User to Room Action Button */}
        {onToggleInvite && (
          <button
            type="button"
            onClick={onToggleInvite}
            className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#5E5CE6] hover:bg-[#4E4CD4] text-white text-xs font-semibold shadow-sm transition-all cursor-pointer mb-3"
            title="Add Organization Members to this Room"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>+ Add User to Group</span>
          </button>
        )}

        {/* Search Input & Simulation Buttons */}
        <div className="space-y-2 mb-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search stage members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[var(--bg-surface-1)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#5E5CE6]"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => simulateBulkParticipants(100)}
              className="flex-1 flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-[#5E5CE6]/30 to-[#0A84FF]/20 hover:from-[#5E5CE6]/50 hover:to-[#0A84FF]/40 border border-[#5E5CE6]/40 text-[10px] font-bold text-white transition-all cursor-pointer shadow-sm"
              title="Simulate 100 Joined Users"
            >
              <UserPlus className="w-3 h-3 text-[#64D2FF]" />
              <span>Simulate 100 Users</span>
            </button>
            {participants.length > 5 && (
              <button
                onClick={() => clearSimulatedParticipants()}
                className="p-1.5 rounded-xl bg-[var(--bg-surface-1)] hover:bg-rose-950/50 hover:text-rose-400 text-[var(--text-muted)] border border-[var(--border-subtle)] transition-colors cursor-pointer"
                title="Reset Simulation"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-1.5 scrollbar-thin">
          {filteredParticipants.map((p) => {
          const isMe = p.userId === currentUserId;
          const isMenuOpen = activeMenuUserId === p.userId;

          return (
            <div key={p.id} className="relative group">
              <div className="flex items-center justify-between p-2.5 rounded-[14px] hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors">
                {(() => {
                  const livePresence = userStatuses[p.user.id];
                  const liveStatus = livePresence?.status || p.user.status;
                  const liveCustomStatus = livePresence?.customStatus !== undefined ? livePresence.customStatus : p.user.customStatus;

                  return (
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar
                        size="sm"
                        src={p.user.avatarUrl}
                        fallbackText={p.user.displayName || p.user.username}
                        status={liveStatus}
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[var(--text-primary)] truncate flex items-center gap-1">
                          <span>{p.user.displayName || p.user.username}</span>
                          {isMe && <span className="text-[10px] text-[#5E5CE6] font-semibold">(You)</span>}
                        </div>
                        {liveCustomStatus && (
                          <div className="text-[10px] text-[var(--text-muted)] truncate flex items-center gap-1">
                            <span className="truncate">{liveCustomStatus}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

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
                      className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/[0.08] transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                      title="Host Moderation"
                    >
                      <Sliders className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Host Action Dropdown */}
              {isMenuOpen && (
                <div className="absolute right-2 top-10 p-2 rounded-[16px] bg-[var(--bg-surface-0)] backdrop-blur-2xl border border-[var(--border-subtle)] shadow-2xl z-40 w-44 space-y-1">
                  <div className="px-2 py-1 text-[11px] font-medium text-[var(--text-muted)] border-b border-[var(--border-subtle)]">
                    Host Controls
                  </div>
                  <button
                    onClick={() => {
                      onHostAction?.('MUTE', p.userId);
                      setActiveMenuUserId(null);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/[0.06] hover:text-[var(--text-primary)] text-left transition-colors cursor-pointer"
                  >
                    <MicOff className="w-3.5 h-3.5 text-amber-500" />
                    <span>Mute Participant</span>
                  </button>
                  <button
                    onClick={() => {
                      onHostAction?.('TRANSFER_HOST', p.userId);
                      setActiveMenuUserId(null);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/[0.06] hover:text-[var(--text-primary)] text-left transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[var(--brand-primary,#6366f1)]" />
                    <span>Change Host</span>
                  </button>
                  <button
                    onClick={() => {
                      onHostAction?.('KICK', p.userId);
                      setActiveMenuUserId(null);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-rose-500 hover:bg-rose-500/10 text-left transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5 text-rose-500" />
                    <span>Remove from Room</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
    </>
  );
};
