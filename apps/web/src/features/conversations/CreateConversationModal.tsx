'use client';

import * as React from 'react';
import { Modal, Button, Input, Avatar } from '@mivo/ui';
import { UserSummaryDTO } from '@mivo/shared';
import { api } from '@/lib/api-client';
import { useConversationStore } from '@/stores/conversationStore';
import { Search, Users, MessageSquare, Check, Sparkles, Plus, Image as ImageIcon } from 'lucide-react';

interface CreateConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateConversationModal: React.FC<CreateConversationModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = React.useState<'direct' | 'group'>('direct');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [users, setUsers] = React.useState<UserSummaryDTO[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = React.useState(false);

  // Group creation state
  const [groupName, setGroupName] = React.useState('');
  const [groupIconUrl, setGroupIconUrl] = React.useState('');
  const [selectedUserIds, setSelectedUserIds] = React.useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const { startDirectConversation, createGroupConversation } = useConversationStore();

  React.useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setGroupName('');
      setGroupIconUrl('');
      setSelectedUserIds([]);
      setErrorMsg(null);
      return;
    }

    const fetchUsers = async () => {
      setIsLoadingUsers(true);
      try {
        const queryParam = searchQuery.trim() ? `?q=${encodeURIComponent(searchQuery.trim())}` : '';
        const res = await api.get<UserSummaryDTO[]>(`/api/v1/users${queryParam}`);
        if (res.success && res.data) {
          setUsers(res.data);
        }
      } catch (err) {
        console.error('Failed to search users:', err);
      } finally {
        setIsLoadingUsers(false);
      }
    };

    const timer = setTimeout(fetchUsers, 200);
    return () => clearTimeout(timer);
  }, [isOpen, searchQuery]);

  const handleStartDM = async (recipientId: string) => {
    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      await startDirectConversation(recipientId);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to start conversation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) {
      setErrorMsg('Please provide a group name');
      return;
    }
    if (selectedUserIds.length === 0) {
      setErrorMsg('Please select at least one friend or member');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      await createGroupConversation(groupName.trim(), selectedUserIds, groupIconUrl.trim() || undefined);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create group');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleSelectUser = (id: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((uid) => uid !== id) : [...prev, id]
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={activeTab === 'direct' ? 'Start a Direct Message' : 'Create Custom Group'}
      description="Connect directly with friends or assemble custom group chats."
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Navigation Tabs */}
        <div className="flex rounded-xl bg-[var(--bg-surface-1)] p-1 border border-[var(--border-subtle)]">
          <button
            type="button"
            onClick={() => {
              setActiveTab('direct');
              setErrorMsg(null);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'direct'
                ? 'bg-violet-600 text-white shadow-md'
                : 'text-[var(--text-secondary)] hover:text-white'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Direct Message</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('group');
              setErrorMsg(null);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'group'
                ? 'bg-violet-600 text-white shadow-md'
                : 'text-[var(--text-secondary)] hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Custom Group</span>
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 font-medium">
            {errorMsg}
          </div>
        )}

        {/* Tab 1: Direct Message */}
        {activeTab === 'direct' && (
          <div className="space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Search by name or username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[var(--bg-surface-1)] border border-[var(--border-subtle)] rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:border-violet-500 transition-colors"
              />
            </div>

            <div className="max-h-60 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
              {isLoadingUsers ? (
                <div className="py-8 text-center text-xs text-[var(--text-muted)]">
                  Searching users...
                </div>
              ) : users.length === 0 ? (
                <div className="py-8 text-center text-xs text-[var(--text-muted)]">
                  No users found. Try another search query.
                </div>
              ) : (
                users.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleStartDM(u.id)}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-white/[0.04] transition-colors group text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar
                          fallbackText={u.displayName || u.username}
                          src={u.avatarUrl || undefined}
                          size="sm"
                        />
                        <span
                          className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[var(--bg-surface-0)] ${
                            u.status === 'ONLINE'
                              ? 'bg-emerald-500'
                              : u.status === 'DND'
                              ? 'bg-rose-500'
                              : u.status === 'IDLE'
                              ? 'bg-amber-500'
                              : 'bg-slate-500'
                          }`}
                        />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-white group-hover:text-violet-300 transition-colors">
                          {u.displayName || u.username}
                        </div>
                        <div className="text-[11px] text-[var(--text-muted)]">
                          @{u.username}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs font-medium text-violet-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                      <span>Message</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Custom Group */}
        {activeTab === 'group' && (
          <form onSubmit={handleCreateGroup} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[var(--text-secondary)]">Group Name</label>
              <Input
                placeholder="e.g. Design Sync, Midnight Gamers, Ops Team"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-[var(--text-secondary)]">
                Group Icon URL (optional)
              </label>
              <div className="relative">
                <ImageIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="url"
                  placeholder="https://example.com/icon.png"
                  value={groupIconUrl}
                  onChange={(e) => setGroupIconUrl(e.target.value)}
                  className="w-full bg-[var(--bg-surface-1)] border border-[var(--border-subtle)] rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:border-violet-500 transition-colors"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-secondary)]">
                <span>Select Members</span>
                <span className="text-[11px] text-violet-400 font-bold">
                  {selectedUserIds.length} selected
                </span>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="text"
                  placeholder="Filter users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[var(--bg-surface-1)] border border-[var(--border-subtle)] rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:border-violet-500 transition-colors"
                />
              </div>

              <div className="max-h-44 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                {users.map((u) => {
                  const isSelected = selectedUserIds.includes(u.id);
                  return (
                    <div
                      key={u.id}
                      onClick={() => toggleSelectUser(u.id)}
                      className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-violet-600/20 border border-violet-500/40 text-white'
                          : 'hover:bg-white/[0.04] text-[var(--text-secondary)]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Avatar
                          fallbackText={u.displayName || u.username}
                          src={u.avatarUrl || undefined}
                          size="xs"
                        />
                        <div>
                          <div className="text-xs font-semibold text-white">
                            {u.displayName || u.username}
                          </div>
                          <div className="text-[10px] text-[var(--text-muted)]">@{u.username}</div>
                        </div>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-colors ${
                          isSelected
                            ? 'bg-violet-600 border-violet-500 text-white'
                            : 'border-[var(--border-subtle)] bg-[var(--bg-surface-1)]'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
              <Button type="button" variant="ghost" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting || !groupName.trim() || selectedUserIds.length === 0}
                className="gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Creating...' : 'Create Group'}</span>
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};
