'use client';

import * as React from 'react';
import { Modal, Button, Input, Badge, Avatar } from '@mivo/ui';
import { api } from '@/lib/api-client';
import { CommunityMemberDTO, EligibleUserDTO } from '@mivo/shared';
import {
  UserPlus,
  Users,
  Shield,
  ShieldCheck,
  Search,
  Check,
  AlertCircle,
  Trash2,
  Lock,
  Building,
  UserCheck,
  Loader2,
} from 'lucide-react';

export interface AddOrgMemberModalProps {
  communityId: string;
  communityName: string;
  isOpen: boolean;
  onClose: () => void;
  onMemberUpdated?: () => void;
}

export const AddOrgMemberModal: React.FC<AddOrgMemberModalProps> = ({
  communityId,
  communityName,
  isOpen,
  onClose,
  onMemberUpdated,
}) => {
  const [activeTab, setActiveTab] = React.useState<'ADD' | 'MEMBERS'>('ADD');
  const [identifier, setIdentifier] = React.useState('');
  const [selectedRole, setSelectedRole] = React.useState<'Member' | 'Admin'>('Member');
  const [eligibleUsers, setEligibleUsers] = React.useState<EligibleUserDTO[]>([]);
  const [members, setMembers] = React.useState<CommunityMemberDTO[]>([]);
  const [isSearchingEligible, setIsSearchingEligible] = React.useState(false);
  const [isLoadingMembers, setIsLoadingMembers] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [removingUserId, setRemovingUserId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  // Fetch eligible users available to join this org
  const fetchEligibleUsers = React.useCallback(async (query = '') => {
    if (!communityId) return;
    setIsSearchingEligible(true);
    try {
      const res = await api.get<EligibleUserDTO[]>(
        `/api/v1/communities/${communityId}/eligible-users${query ? `?q=${encodeURIComponent(query)}` : ''}`
      );
      if (res.success && res.data) {
        setEligibleUsers(res.data);
      }
    } catch (err) {
      console.error('Failed to load eligible users:', err);
    } finally {
      setIsSearchingEligible(false);
    }
  }, [communityId]);

  // Fetch existing members
  const fetchMembers = React.useCallback(async () => {
    if (!communityId) return;
    setIsLoadingMembers(true);
    try {
      const res = await api.get<CommunityMemberDTO[]>(`/api/v1/communities/${communityId}/members`);
      if (res.success && res.data) {
        setMembers(res.data);
      }
    } catch (err) {
      console.error('Failed to load members:', err);
    } finally {
      setIsLoadingMembers(false);
    }
  }, [communityId]);

  React.useEffect(() => {
    if (isOpen) {
      setError(null);
      setSuccessMessage(null);
      fetchEligibleUsers();
      fetchMembers();
    }
  }, [isOpen, fetchEligibleUsers, fetchMembers]);

  // Handle live search
  const handleIdentifierChange = (val: string) => {
    setIdentifier(val);
    setError(null);
    setSuccessMessage(null);
    fetchEligibleUsers(val);
  };

  const selectCandidate = (user: EligibleUserDTO) => {
    setIdentifier(user.email || user.username);
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setError('Please enter a username or email address.');
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      const res = await api.post<CommunityMemberDTO>(`/api/v1/communities/${communityId}/members`, {
        identifier: identifier.trim(),
        roleName: selectedRole,
      });

      if (res.success && res.data) {
        setSuccessMessage(`User "${res.data.user.displayName || res.data.user.username}" successfully added to ${communityName}!`);
        setIdentifier('');
        fetchMembers();
        fetchEligibleUsers();
        onMemberUpdated?.();
      } else {
        const errorData = res.error as any;
        const msg = errorData?.message || 'Failed to add member to organization.';
        if (typeof msg === 'string' && msg.includes('already belongs to')) {
          setError(`Single-Org Tenancy Violation: ${msg}`);
        } else {
          setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
        }
      }
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred while adding the member.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveMember = async (userId: string, memberName: string) => {
    if (!confirm(`Are you sure you want to remove "${memberName}" from ${communityName}?`)) {
      return;
    }

    setRemovingUserId(userId);
    setError(null);
    try {
      const res = await api.delete(`/api/v1/communities/${communityId}/members/${userId}`);
      if (res.success) {
        setMembers((prev) => prev.filter((m) => m.userId !== userId));
        fetchEligibleUsers();
        onMemberUpdated?.();
      } else {
        setError((res.error as any)?.message || 'Failed to remove member.');
      }
    } catch (err: any) {
      setError(err?.message || 'Network error removing member.');
    } finally {
      setRemovingUserId(null);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Organization Members — ${communityName}`}
      description="Manage organization access. Strict single-org tenancy is enforced."
      maxWidth="lg"
    >
      <div className="space-y-4">
        {/* Single-Org Tenancy Banner */}
        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs">
          <Lock className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
          <div className="space-y-0.5 leading-relaxed">
            <span className="font-semibold block text-amber-500">
              Single-Organization Tenancy Enforced
            </span>
            <span>
              Each user can belong to <strong>only one organization</strong>. Once added to {communityName}, the user cannot join or belong to any other organization.
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('ADD')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'ADD'
                ? 'bg-[#DC2626] text-white shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-1)]'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            Add New Member
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('MEMBERS')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'MEMBERS'
                ? 'bg-[#DC2626] text-white shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-1)]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Current Members ({members.length})
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-300 text-xs animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 text-xs animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
            <span className="font-medium">{successMessage}</span>
          </div>
        )}

        {/* TAB 1: ADD MEMBER */}
        {activeTab === 'ADD' && (
          <form onSubmit={handleAddMember} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
                User Email or Username
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="e.g. alex@wysbryx.com or alex"
                  value={identifier}
                  onChange={(e) => handleIdentifierChange(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-[var(--bg-surface-1)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626]/20 font-medium"
                />
              </div>
            </div>

            {/* Candidate Autocomplete Pill List */}
            {eligibleUsers.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider block">
                  Available Users (Not in any Org)
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-[110px] overflow-y-auto p-1.5 rounded-lg bg-[var(--bg-surface-1)] border border-[var(--border-subtle)]">
                  {eligibleUsers.map((u) => (
                    <button
                      type="button"
                      key={u.id}
                      onClick={() => selectCandidate(u)}
                      className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-[var(--bg-surface-0)] hover:bg-[#DC2626]/10 hover:border-[#DC2626]/40 border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] transition-all cursor-pointer group"
                    >
                      <UserCheck className="w-3 h-3 text-[#DC2626]" />
                      <span className="font-medium">{u.displayName || u.username}</span>
                      <span className="text-[10px] text-[var(--text-muted)] group-hover:text-[#DC2626]">
                        ({u.email})
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Role Selection */}
            <div>
              <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
                Assigned Role in {communityName}
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedRole('Member')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    selectedRole === 'Member'
                      ? 'border-[#DC2626] bg-[#DC2626]/10 text-[var(--text-primary)] ring-1 ring-[#DC2626]/30'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-surface-1)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-2)]'
                  }`}
                >
                  <div className="flex items-center gap-2 font-semibold text-xs mb-1">
                    <Users className="w-3.5 h-3.5 text-[#DC2626]" />
                    <span>Member</span>
                  </div>
                  <span className="text-[11px] text-[var(--text-muted)] block">
                    Can access channels, join rooms, chat, and participate in calls.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedRole('Admin')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    selectedRole === 'Admin'
                      ? 'border-[#DC2626] bg-[#DC2626]/10 text-[var(--text-primary)] ring-1 ring-[#DC2626]/30'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-surface-1)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-2)]'
                  }`}
                >
                  <div className="flex items-center gap-2 font-semibold text-xs mb-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#DC2626]" />
                    <span>Admin</span>
                  </div>
                  <span className="text-[11px] text-[var(--text-muted)] block">
                    Can manage spaces, invite members, and configure room security.
                  </span>
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !identifier.trim()}
                className="bg-[#DC2626] hover:bg-[#B91C1C] text-white"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    Adding Member...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                    Add to Organization
                  </>
                )}
              </Button>
            </div>
          </form>
        )}

        {/* TAB 2: CURRENT MEMBERS */}
        {activeTab === 'MEMBERS' && (
          <div className="space-y-2">
            {isLoadingMembers ? (
              <div className="py-12 flex flex-col items-center justify-center text-[var(--text-muted)]">
                <Loader2 className="w-6 h-6 animate-spin text-[#DC2626] mb-2" />
                <span className="text-xs">Loading organization members...</span>
              </div>
            ) : members.length === 0 ? (
              <div className="py-8 text-center text-xs text-[var(--text-muted)]">
                No members found in this organization.
              </div>
            ) : (
              <div className="max-h-[340px] overflow-y-auto space-y-1.5 pr-1">
                {members.map((m) => {
                  const isOwner = m.role?.name === 'Owner';
                  const isRemoving = removingUserId === m.userId;
                  return (
                    <div
                      key={m.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--bg-surface-1)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] transition-all"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar
                          fallbackText={m.user.displayName || m.user.username}
                          src={m.user.avatarUrl}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-[var(--text-primary)] truncate">
                              {m.user.displayName || m.user.username}
                            </span>
                            <span className="text-[10px] text-[var(--text-muted)] truncate">
                              @{m.user.username}
                            </span>
                          </div>
                          <span className="text-[10px] text-[var(--text-muted)] block truncate">
                            Joined {new Date(m.joinedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span
                          className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border"
                          style={{
                            borderColor: `${m.role?.color || '#DC2626'}40`,
                            backgroundColor: `${m.role?.color || '#DC2626'}15`,
                            color: m.role?.color || '#DC2626',
                          }}
                        >
                          {m.role?.name || 'Member'}
                        </span>

                        {!isOwner && (
                          <button
                            type="button"
                            disabled={isRemoving}
                            onClick={() => handleRemoveMember(m.userId, m.user.displayName || m.user.username)}
                            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                            title="Remove from Organization"
                          >
                            {isRemoving ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-red-500" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
