'use client';

import * as React from 'react';
import { useConversationStore } from '@/stores/conversationStore';
import { useAuthStore } from '@/stores/authStore';
import { ConversationDTO } from '@mivo/shared';
import { Avatar } from '@mivo/ui';
import { Plus, Users, MessageSquare, Volume2, Search } from 'lucide-react';
import { CreateConversationModal } from './CreateConversationModal';

export const ConversationsSidebar: React.FC = () => {
  const { user } = useAuthStore();
  const {
    conversations,
    activeConversationId,
    selectConversation,
    unreadCounts,
    loadConversations,
    setupRealtimeListeners,
  } = useConversationStore();

  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [filterQuery, setFilterQuery] = React.useState('');

  React.useEffect(() => {
    if (user?.id) {
      loadConversations();
      setupRealtimeListeners(user.id);
    }
  }, [user?.id, loadConversations, setupRealtimeListeners]);

  const filteredConversations = conversations.filter((c) => {
    if (!filterQuery.trim()) return true;
    const q = filterQuery.toLowerCase();
    if (c.type === 'GROUP') {
      return (c.name || '').toLowerCase().includes(q);
    }
    const other = c.members.find((m) => m.userId !== user?.id)?.user;
    return (
      (other?.displayName || '').toLowerCase().includes(q) ||
      (other?.username || '').toLowerCase().includes(q)
    );
  });

  return (
    <aside className="w-64 h-full bg-[var(--bg-sidebar)] border-r border-[var(--border-subtle)] flex flex-col justify-between select-none">
      <div className="flex-1 flex flex-col min-h-0">
        {/* Header Bar */}
        <div className="h-16 px-4 border-b border-[var(--border-subtle)] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-violet-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-white font-display">
              Conversations
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="w-7 h-7 rounded-lg bg-violet-600/20 hover:bg-violet-600 text-violet-300 hover:text-white flex items-center justify-center transition-all shadow-sm"
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
              className="w-full bg-[var(--bg-surface-1)] border border-[var(--border-subtle)] rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:border-violet-500 transition-colors"
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto px-2 py-1 space-y-1 custom-scrollbar">
          {filteredConversations.length === 0 ? (
            <div className="py-12 px-4 text-center">
              <div className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center mx-auto mb-3 text-[var(--text-muted)]">
                <Users className="w-5 h-5" />
              </div>
              <p className="text-xs text-[var(--text-muted)] mb-3">No conversations yet</p>
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-violet-600/20 text-violet-300 hover:bg-violet-600 hover:text-white text-xs font-semibold transition-all inline-flex items-center gap-1.5"
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

              const lastMessageSnippet = c.lastMessage
                ? c.lastMessage.content || (c.lastMessage.attachments?.length ? 'Shared attachment' : '')
                : 'No messages yet';

              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => selectConversation(c.id)}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all text-left ${
                    isActive
                      ? 'bg-violet-600/20 border border-violet-500/40 text-white shadow-sm'
                      : 'hover:bg-white/[0.04] text-[var(--text-secondary)] hover:text-white border border-transparent'
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
                          other.status === 'ONLINE'
                            ? 'bg-emerald-500'
                            : other.status === 'DND'
                            ? 'bg-rose-500'
                            : other.status === 'IDLE'
                            ? 'bg-amber-500'
                            : 'bg-slate-500'
                        }`}
                      />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold truncate text-white">{title}</span>
                      {unread > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full bg-violet-600 text-white font-bold text-[10px] min-w-[18px] text-center">
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

      {/* Direct/Group Creation Modal */}
      <CreateConversationModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </aside>
  );
};
