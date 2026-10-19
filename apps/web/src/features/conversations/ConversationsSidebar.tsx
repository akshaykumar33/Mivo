'use client';
import * as React from 'react';
import { useConversationStore } from '@/stores/conversationStore';
import { useAuthStore } from '@/stores/authStore';
import { useUserPresence, usePresenceStore } from '@/stores/presenceStore';
import { useThemeStore } from '@/stores/themeStore';
import { ConversationDTO } from '@mivo/shared';
import { Avatar } from '@mivo/ui';
import { Plus, Users, MessageSquare, Volume2, Search, Smile, Menu } from 'lucide-react';
import { CreateConversationModal } from './CreateConversationModal';
import { SlackStatusModal } from '@/features/auth/SlackStatusModal';
import { SlackUserMenuPopover } from '@/features/auth/SlackUserMenuPopover';
import { EditProfileModal } from '@/features/auth/EditProfileModal';
import { useNavigationStore } from '@/stores/navigationStore';

export const ConversationsSidebar: React.FC = () => {
  const { user } = useAuthStore();
  const presence = useUserPresence(user?.id, user);
  const userStatuses = usePresenceStore((s) => s.userStatuses);
  const { setIsThemeModalOpen } = useThemeStore();
  const {
    conversations,
    activeConversationId,
    selectConversation,
    unreadCounts,
    loadConversations,
    setupRealtimeListeners,
  } = useConversationStore();

  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = React.useState(false);
  const [isSlackStatusOpen, setIsSlackStatusOpen] = React.useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = React.useState(false);
  const [filterQuery, setFilterQuery] = React.useState('');
  const { toggleMobileSidebar } = useNavigationStore();

  React.useEffect(() => {
    if (user?.id) {
      loadConversations();
      setupRealtimeListeners(user.id);
    }
  }, [user?.id, loadConversations, setupRealtimeListeners]);

  // Memoized deduplication ensuring no duplicate conversation IDs or direct chats exist in UI
  const uniqueConversations = React.useMemo(() => {
    const seenIds = new Set<string>();
    const seenDirectUserIds = new Set<string>();
    const result: ConversationDTO[] = [];

    for (const c of conversations) {
      if (!c || !c.id || seenIds.has(c.id)) continue;
      seenIds.add(c.id);

      if (c.type === 'DIRECT') {
        const otherUserId = c.members?.find((m) => m.userId !== user?.id)?.userId;
        if (otherUserId) {
          if (seenDirectUserIds.has(otherUserId)) continue;
          seenDirectUserIds.add(otherUserId);
        }
      }

      result.push(c);
    }
    return result;
  }, [conversations, user?.id]);

  const filteredConversations = uniqueConversations.filter((c: ConversationDTO) => {
    if (!filterQuery.trim()) return true;
    const q = filterQuery.toLowerCase();
    if (c.type === 'GROUP') {
      return (c.name || '').toLowerCase().includes(q);
    }
    const other = c.members?.find((m) => m.userId !== user?.id)?.user;
    return (
      (other?.displayName || '').toLowerCase().includes(q) ||
      (other?.username || '').toLowerCase().includes(q)
    );
  });

  return (
    <aside className="w-full h-full bg-[var(--bg-sidebar)] border-r border-[var(--border-subtle)] flex flex-col justify-between select-none">
      <div className="flex-1 flex flex-col min-h-0">
        {/* Header Bar */}
        <div className="h-16 px-4 border-b border-[var(--border-subtle)] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleMobileSidebar}
              className="md:hidden p-1.5 -ml-1 rounded-xl bg-black/5 hover:bg-black/10 text-[var(--text-secondary)] hover:text-[#111827] transition-colors cursor-pointer mr-0.5 flex-shrink-0"
              title="Open workspaces menu"
            >
              <Menu className="w-4 h-4" />
            </button>
            <MessageSquare className="w-4 h-4 text-[#DC2626] flex-shrink-0" />
            <span className="text-xs font-bold uppercase tracking-wider text-[#111827] font-display">
              Conversations
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="w-7 h-7 rounded-lg bg-[#DC2626]/10 hover:bg-[#DC2626] text-[#DC2626] hover:text-white flex items-center justify-center transition-all shadow-sm border border-[#DC2626]/20 cursor-pointer"
            title="Start Direct Message or Create Custom Group"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Filter Input */}
        <div className="p-3 pb-2 shrink-0">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Find or start conversation..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="w-full bg-[var(--bg-surface-0)] border border-[var(--border-subtle)] rounded-xl pl-8 pr-3 py-1.5 text-xs text-[#111827] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626]/20 transition-all shadow-xs"
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto px-2 py-1 space-y-1 custom-scrollbar">
          {filteredConversations.length === 0 ? (
            <div className="py-12 px-4 text-center">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-3 text-[#DC2626]">
                <Users className="w-5 h-5" />
              </div>
              <p className="text-xs text-[var(--text-muted)] mb-3">No conversations yet</p>
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-[#DC2626] to-[#B91C1C] text-white hover:from-[#EF4444] hover:to-[#DC2626] text-xs font-semibold shadow-md transition-all inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Start Chat</span>
              </button>
            </div>
          ) : (
            filteredConversations.map((c: ConversationDTO) => {
              const isActive = c.id === activeConversationId;
              const unread = unreadCounts[c.id] || 0;
              const isGroup = c.type === 'GROUP';
              const other = isGroup ? null : c.members.find((m) => m.userId !== user?.id)?.user;
              const title = isGroup ? c.name || 'Group' : other?.displayName || other?.username || 'User';

              const otherLive = other ? userStatuses[other.id] : undefined;
              const otherStatus = otherLive?.status || other?.status || 'ONLINE';
              const otherCustomStatus = otherLive?.customStatus !== undefined ? otherLive.customStatus : other?.customStatus;

              const lastMessageSnippet = c.lastMessage
                ? c.lastMessage.content || (c.lastMessage.attachments?.length ? 'Shared attachment' : '')
                : 'No messages yet';

              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => selectConversation(c.id)}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all text-left cursor-pointer ${
                    isActive
                      ? 'bg-[#DC2626]/10 border border-[#DC2626]/30 text-[#111827] shadow-sm font-semibold'
                      : 'hover:bg-black/[0.04] text-[var(--text-secondary)] hover:text-[#111827] border border-transparent'
                  }`}
                >
                  <div className="relative shrink-0">
                    <Avatar
                      fallbackText={title}
                      src={c.iconUrl || other?.avatarUrl || undefined}
                      size="sm"
                    />
                    {!isGroup && other && (
                      <span
                        className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[var(--bg-sidebar)] ${
                          otherStatus === 'ONLINE'
                            ? 'bg-emerald-500'
                            : otherStatus === 'DND'
                            ? 'bg-rose-500'
                            : otherStatus === 'IDLE'
                            ? 'bg-amber-500'
                            : 'bg-slate-500'
                        }`}
                      />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="text-xs font-bold truncate text-[#111827]">{title}</span>
                        {!isGroup && otherCustomStatus && (
                          <span
                            className="text-[10px] text-[#DC2626] bg-red-500/10 px-1 rounded truncate max-w-[90px] font-semibold"
                            title={otherCustomStatus}
                          >
                            {otherCustomStatus}
                          </span>
                        )}
                      </div>
                      {unread > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full bg-[#DC2626] text-white font-bold text-[10px] min-w-[18px] text-center shadow-xs">
                          {unread}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)] truncate mt-0.5">
                      {lastMessageSnippet}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Slack-style Current User Footer */}
      <div className="h-16 px-3 border-t border-[var(--border-subtle)] bg-[var(--bg-sidebar)] flex items-center justify-between shrink-0">
        <button
          type="button"
          onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
          className="flex items-center gap-2.5 min-w-0 text-left hover:bg-black/[0.04] p-1.5 -ml-1 rounded-xl transition-all cursor-pointer group flex-1"
          title="Your Profile, Availability & Status (Slack)"
        >
          <div className="relative shrink-0">
            <Avatar
              size="sm"
              status={presence.status}
              fallbackText={user?.displayName || user?.username}
              src={user?.avatarUrl}
              className="group-hover:scale-105 transition-transform"
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-[#111827] truncate group-hover:text-[#DC2626] transition-colors">
              {user?.displayName || user?.username}
            </div>
            <div className="text-[10px] text-[var(--text-muted)] truncate flex items-center gap-1">
              {presence.customStatus ? (
                <span className="text-[#DC2626] font-semibold truncate">{presence.customStatus}</span>
              ) : (
                <span className="capitalize">{presence.status.toLowerCase()}</span>
              )}
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setIsSlackStatusOpen(true)}
          className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[#DC2626] hover:bg-[#DC2626]/10 transition-all cursor-pointer"
          title="Set Availability & Status"
        >
          <Smile className="w-4 h-4 text-[#DC2626]" />
        </button>
      </div>

      {/* Slack User Menu Popover */}
      <SlackUserMenuPopover
        isOpen={isUserMenuOpen}
        onClose={() => setIsUserMenuOpen(false)}
        onOpenFullModal={() => setIsSlackStatusOpen(true)}
        onOpenEditProfile={() => setIsEditProfileOpen(true)}
        onOpenThemeModal={() => setIsThemeModalOpen(true)}
        placement="bottom-bar"
      />

      {/* Direct/Group Creation Modal */}
      <CreateConversationModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
      />

      {/* Slack Availability & Status Modal */}
      <SlackStatusModal
        isOpen={isSlackStatusOpen}
        onClose={() => setIsSlackStatusOpen(false)}
      />
    </aside>
  );
};

