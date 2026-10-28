'use client';

import * as React from 'react';
import { Modal, Button, Input, Avatar } from '@mivo/ui';
import { UserSummaryDTO } from '@mivo/shared';
import { api } from '@/lib/api-client';
import { useConversationStore } from '@/stores/conversationStore';
import { useAuthStore } from '@/stores/authStore';
import { Search, Users, MessageSquare, Check, Sparkles, Plus, Image as ImageIcon, Lock, Eye, Shield, User } from 'lucide-react';
import { UserProfileModal } from '@/features/users/UserProfileModal';

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
  const [selectedProfileUserId, setSelectedProfileUserId] = React.useState<string | null>(null);

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
      setSelectedProfileUserId(null);
      return;
    }

    const fetchUsers = async () => {
      setIsLoadingUsers(true);
      try {
        const queryParam = searchQuery.trim() ? `?q=${encodeURIComponent(searchQuery.trim())}` : '';
        const res = await api.get<UserSummaryDTO[]>(`/api/v1/users${queryParam}`);
        const isAutonomousOrGuest = (u: UserSummaryDTO) => {
          if (u.isGuest || u.userTier === 'GUEST') return true;
          const uname = (u.username || '').toLowerCase();
          const dname = (u.displayName || '').toLowerCase();
          return (
            uname.startsWith('guest_') ||
            uname.startsWith('gamer_') ||
            uname.startsWith('test_') ||
            uname.startsWith('creator_') ||
            uname.startsWith('bot_') ||
            uname.startsWith('user_1') ||
            dname.includes('test user') ||
            dname.includes('non-org chess') ||
            dname.includes('testguestbot')
          );
        };

        if (res.success && res.data) {
          // Extra safeguard: exclude any guest, autonomous, bot, or test accounts
          setUsers(res.data.filter((u) => !isAutonomousOrGuest(u)));
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
      setErrorMsg('Guest accounts cannot message others. You can view developer profiles, or upgrade to chat.');
      setSelectedProfileUserId(recipientId);
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
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={isGuest ? 'Browse Non-Org Creator Profiles' : activeTab === 'direct' ? 'Start a Direct Message' : 'Create Custom Group'}
        description={
          isGuest
            ? 'Explore independent developer profiles and published projects. Messaging is restricted for guest accounts.'
            : 'Connect directly with friends or assemble custom group chats.'
        }
        maxWidth="md"
      >
        {isGuest && (
          <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>
                <strong>Guest Mode:</strong> You can view creator profiles and projects (read-only). Messaging requires upgrading.
              </span>
            </div>
            <button
              onClick={() => {
                onClose();
                setUpgradeModalOpen(true);
              }}
              className="font-bold underline text-amber-200 hover:text-white cursor-pointer ml-2 whitespace-nowrap"
            >
              Upgrade
            </button>
          </div>
        )}

        <div className="space-y-4">
          {/* Navigation Tabs - Hidden for guests since they only browse profiles */}
          {!isGuest && (
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
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
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
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Custom Group</span>
          </button>
        </div>
      )}

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
                className="w-full bg-[var(--bg-surface-0)] border border-[var(--border-subtle)] rounded-xl pl-9 pr-4 py-2 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626]/20 transition-all shadow-xs"
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
                  <div
                    key={u.id}
                    onClick={() => {
                      if (isGuest) {
                        setSelectedProfileUserId(u.id);
                      } else {
                        handleStartDM(u.id);
                      }
                    }}
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
                        <div className="text-xs font-semibold text-[var(--text-primary)] group-hover:text-[#DC2626] transition-colors flex items-center gap-1.5">
                          <span>{u.displayName || u.username}</span>
                          {u.organizationRole ? (
                            <span className="px-1.5 py-0.2 rounded bg-red-500/10 text-red-600 text-[9px] font-bold">
                              {u.organizationRole}
                            </span>
                          ) : u.userTier === 'ORG' ? (
                            <span className="px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-600 text-[9px] font-bold">
                              Team
                            </span>
                          ) : null}
                        </div>
                        <div className="text-[11px] text-[var(--text-muted)]">
                          @{u.username}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isGuest ? (
                        <span className="text-xs font-bold text-cyan-600 flex items-center gap-1 bg-cyan-50 px-2 py-1 rounded-lg border border-cyan-200 shadow-xs">
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Profile</span>
                        </span>
                      ) : (
                        <div className="text-xs font-semibold text-[#DC2626] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" />
                          <span>Message</span>
                        </div>
                      )}
                    </div>
                  </div>
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
                placeholder="e.g. Design Sync, Core Team, Product Review"
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
                  className="w-full bg-[var(--bg-surface-0)] border border-[var(--border-subtle)] rounded-xl pl-9 pr-4 py-2 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626]/20 transition-all shadow-xs"
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
                  className="w-full bg-[var(--bg-surface-0)] border border-[var(--border-subtle)] rounded-xl pl-8 pr-3 py-1.5 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626]/20 transition-all shadow-xs"
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
                          ? 'bg-red-500/10 border border-red-500/30 text-[var(--text-primary)]'
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
                          <div className="text-xs font-semibold text-[var(--text-primary)]">
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
    </Modal>

    <UserProfileModal
      userId={selectedProfileUserId}
      isOpen={Boolean(selectedProfileUserId)}
      onClose={() => setSelectedProfileUserId(null)}
    />
  </>
  );
};
