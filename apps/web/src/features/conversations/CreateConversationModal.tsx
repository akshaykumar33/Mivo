'use client';

import * as React from 'react';
import { Modal, Button, Input, Avatar } from '@mivo/ui';
import { UserSummaryDTO } from '@mivo/shared';
import { api } from '@/lib/api-client';
import { useConversationStore } from '@/stores/conversationStore';
import { useAuthStore } from '@/stores/authStore';
import { Search, Users, MessageSquare, Check, Sparkles, Plus, Image as ImageIcon, Lock } from 'lucide-react';

interface CreateConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateConversationModal: React.FC<CreateConversationModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { isGuest, setUpgradeModalOpen } = useAuthStore();
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

    if (isGuest) {
      setUsers([]);
      return;
    }

    const fetchUsers = async () => {
      setIsLoadingUsers(true);
      try {
        const queryParam = searchQuery.trim() ? `?q=${encodeURIComponent(searchQuery.trim())}` : '';
        const res = await api.get<UserSummaryDTO[]>(`/api/v1/users${queryParam}`);
        if (res.success && res.data) {
          // Extra safeguard: exclude any guest accounts
          setUsers(res.data.filter((u) => !u.isGuest && !u.username.startsWith('guest_')));
        }
      } catch (err) {
        console.error('Failed to search users:', err);
      } finally {
        setIsLoadingUsers(false);
      }
    };

    const timer = setTimeout(fetchUsers, 200);
    return () => clearTimeout(timer);
  }, [isOpen, searchQuery, isGuest]);

  const handleStartDM = async (recipientId: string) => {
    if (isGuest) {
      setErrorMsg('Guest accounts cannot message others. Please upgrade your account.');
      return;
    }
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
    if (isGuest) {
      setErrorMsg('Guest accounts cannot create groups. Please upgrade your account.');
      return;
    }
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
      title={isGuest ? 'Messaging Restricted' : activeTab === 'direct' ? 'Start a Direct Message' : 'Create Custom Group'}
      description={
        isGuest
          ? 'Guest accounts cannot message other users or start direct & group conversations.'
          : 'Connect directly with friends or assemble custom group chats.'
      }
      maxWidth="md"
    >
      {isGuest ? (
        <div className="py-8 px-4 text-center flex flex-col items-center">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 mb-3 shadow-inner">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-[#111827] mb-1">Guest Account Restriction</h3>
          <p className="text-xs text-[var(--text-muted)] max-w-sm mb-4 leading-relaxed">
            Guest accounts cannot message other users or participate in audio and video calls. Please create a permanent account or sign in to start chatting!
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                onClose();
                setUpgradeModalOpen(true);
              }}
              className="bg-gradient-to-r from-[#DC2626] to-[#B91C1C] text-white"
            >
              Upgrade to Permanent Account
            </Button>
          </div>
        </div>
      ) : (
      <div className="space-y-4">
        {/* Navigation Tabs */}
        <div className="flex rounded-xl bg-[var(--bg-surface-1)] p-1 border border-[var(--border-subtle)]">
          <button
            type="button"
            onClick={() => {
              setActiveTab('direct');
              setErrorMsg(null);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'direct'
                ? 'bg-gradient-to-r from-[#DC2626] to-[#B91C1C] text-white shadow-md'
                : 'text-[var(--text-secondary)] hover:text-[#111827]'
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
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'group'
                ? 'bg-gradient-to-r from-[#DC2626] to-[#B91C1C] text-white shadow-md'
                : 'text-[var(--text-secondary)] hover:text-[#111827]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Custom Group</span>
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-600 font-medium">
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
                className="w-full bg-[var(--bg-surface-0)] border border-[var(--border-subtle)] rounded-xl pl-9 pr-4 py-2 text-xs text-[#111827] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626]/20 transition-all shadow-xs"
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
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-black/[0.04] transition-colors group text-left cursor-pointer"
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
                        <div className="text-xs font-semibold text-[#111827] group-hover:text-[#DC2626] transition-colors">
                          {u.displayName || u.username}
                        </div>
                        <div className="text-[11px] text-[var(--text-muted)]">
                          @{u.username}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs font-semibold text-[#DC2626] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
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
                  className="w-full bg-[var(--bg-surface-0)] border border-[var(--border-subtle)] rounded-xl pl-9 pr-4 py-2 text-xs text-[#111827] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626]/20 transition-all shadow-xs"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-secondary)]">
                <span>Select Members</span>
                <span className="text-[11px] text-[#DC2626] font-bold">
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
                  className="w-full bg-[var(--bg-surface-0)] border border-[var(--border-subtle)] rounded-xl pl-8 pr-3 py-1.5 text-xs text-[#111827] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626]/20 transition-all shadow-xs"
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
                          ? 'bg-red-500/10 border border-red-500/30 text-[#111827]'
                          : 'hover:bg-black/[0.04] text-[var(--text-secondary)]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Avatar
                          fallbackText={u.displayName || u.username}
                          src={u.avatarUrl || undefined}
                          size="xs"
                        />
                        <div>
                          <div className="text-xs font-semibold text-[#111827]">
                            {u.displayName || u.username}
                          </div>
                          <div className="text-[10px] text-[var(--text-muted)]">@{u.username}</div>
                        </div>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-colors ${
                          isSelected
                            ? 'bg-[#DC2626] border-[#DC2626] text-white shadow-xs'
                            : 'border-[var(--border-subtle)] bg-[var(--bg-surface-0)]'
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
      )}
    </Modal>
  );
};
