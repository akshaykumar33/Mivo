'use client';

import * as React from 'react';
import { Modal, Button, Avatar } from '@mivo/ui';
import { api } from '@/lib/api-client';
import { RoomDTO, RoomMemberDTO } from '@mivo/shared';
import {
  UserPlus,
  Users,
  Search,
  Check,
  AlertCircle,
  Trash2,
  Lock,
  Building,
  UserCheck,
  Loader2,
  ExternalLink,
} from 'lucide-react';

export interface EligibleRoomMember {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  email: string;
  roleName: string;
}

export interface InviteRoomMemberModalProps {
  room: RoomDTO;
  organizationName?: string;
  isOpen: boolean;
  onClose: () => void;
  onOpenOrgInvite?: () => void;
  onMemberUpdated?: () => void;
}

export const InviteRoomMemberModal: React.FC<InviteRoomMemberModalProps> = ({
  room,
  organizationName = 'Organization',
  isOpen,
  onClose,
  onOpenOrgInvite,
  onMemberUpdated,
}) => {
  const [activeTab, setActiveTab] = React.useState<'ADD' | 'MEMBERS'>('ADD');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [eligibleMembers, setEligibleMembers] = React.useState<EligibleRoomMember[]>([]);
  const [roomMembers, setRoomMembers] = React.useState<RoomMemberDTO[]>([]);
  const [isLoadingEligible, setIsLoadingEligible] = React.useState(false);
  const [addingUserId, setAddingUserId] = React.useState<string | null>(null);
  const [removingUserId, setRemovingUserId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  // Fetch eligible org members who can be added to this room
  const fetchEligible = React.useCallback(async () => {
    if (!room?.id) return;
    setIsLoadingEligible(true);
    try {
      const res = await api.get<EligibleRoomMember[]>(`/api/v1/rooms/${room.id}/eligible-members`);
      if (res.success && res.data) {
        setEligibleMembers(res.data);
      }
    } catch (err) {
      console.error('Failed to load eligible room members:', err);
    } finally {
      setIsLoadingEligible(false);
    }
  }, [room?.id]);

  // Fetch current room details & members
  const fetchRoom = React.useCallback(async () => {
    if (!room?.id) return;
    try {
      const res = await api.get<RoomDTO>(`/api/v1/rooms/${room.id}`);
      if (res.success && res.data) {
        setRoomMembers(res.data.activeMembers || []);
      }
    } catch (err) {
      console.error('Failed to load room details:', err);
    }
  }, [room?.id]);

  React.useEffect(() => {
    if (isOpen) {
      setError(null);
      setSuccessMessage(null);
      setSearchQuery('');
      fetchEligible();
      fetchRoom();
    }
  }, [isOpen, fetchEligible, fetchRoom]);

  const handleAddMember = async (candidate: EligibleRoomMember) => {
    setAddingUserId(candidate.id);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await api.post<RoomMemberDTO>(`/api/v1/rooms/${room.id}/members`, {
        userId: candidate.id,
      });

      if (res.success && res.data) {
        setSuccessMessage(`"${candidate.displayName || candidate.username}" added to #${room.name}!`);
        setEligibleMembers((prev) => prev.filter((u) => u.id !== candidate.id));
        setRoomMembers((prev) => [...prev, res.data as RoomMemberDTO]);
        onMemberUpdated?.();
      } else {
        const errorData = res.error as any;
        const msg = errorData?.message || 'Failed to add member to room';
        setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
      }
    } catch (err: any) {
      setError(err?.message || 'Network error adding member to room');
    } finally {
      setAddingUserId(null);
    }
  };

  const handleRemoveMember = async (userId: string, memberName: string) => {
    if (!confirm(`Are you sure you want to remove "${memberName}" from #${room.name}?`)) {
      return;
    }

    setRemovingUserId(userId);
    setError(null);

    try {
      const res = await api.delete(`/api/v1/rooms/${room.id}/members/${userId}`);
      if (res.success) {
        setRoomMembers((prev) => prev.filter((m) => m.userId !== userId));
        fetchEligible();
        onMemberUpdated?.();
      } else {
        setError((res.error as any)?.message || 'Failed to remove member from room');
      }
    } catch (err: any) {
      setError(err?.message || 'Network error removing member');
    } finally {
      setRemovingUserId(null);
    }
  };

  const filteredEligible = React.useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return eligibleMembers;
    return eligibleMembers.filter(
      (u) =>
        u.displayName?.toLowerCase().includes(q) ||
        u.username?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q)
    );
  }, [eligibleMembers, searchQuery]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Group & Room Access — #${room.name}`}
      description="Add and manage members in this group."
      maxWidth="lg"
    >
      <div className="space-y-4">
        {/* Single-Org Boundary Notice */}
        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-900 dark:text-blue-200 text-xs">
          <Building className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
          <div className="space-y-0.5 leading-relaxed">
            <span className="font-semibold block text-blue-500">
              Organization-Scoped Group Access
            </span>
            <span>
              Only verified members of <strong>{organizationName}</strong> can be added to this room/group. Users from other organizations or outside the company cannot enter.
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
                ? 'bg-[var(--brand-primary,#6366f1)] text-white shadow-xs'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-1)]'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            Add Org Members ({eligibleMembers.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('MEMBERS')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'MEMBERS'
                ? 'bg-[var(--brand-primary,#6366f1)] text-white shadow-xs'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-1)]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Room Members ({roomMembers.length})
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

        {/* TAB 1: ADD ELIGIBLE ORG MEMBERS */}
        {activeTab === 'ADD' && (
          <div className="space-y-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={`Search ${organizationName} members...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-[var(--bg-surface-1)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--brand-primary,#6366f1)] focus:ring-1 focus:ring-[var(--brand-primary,#6366f1)]/20 font-medium"
              />
            </div>

            {isLoadingEligible ? (
              <div className="py-12 flex flex-col items-center justify-center text-[var(--text-muted)]">
                <Loader2 className="w-6 h-6 animate-spin text-[var(--brand-primary,#6366f1)] mb-2" />
                <span className="text-xs">Finding available members...</span>
              </div>
            ) : filteredEligible.length === 0 ? (
              <div className="py-8 px-4 rounded-xl bg-[var(--bg-surface-1)] border border-[var(--border-subtle)] text-center space-y-2">
                <UserCheck className="w-8 h-8 text-emerald-500 mx-auto" />
                <p className="text-xs font-semibold text-[var(--text-primary)]">
                  {searchQuery ? 'No matching organization members found.' : 'All organization members are already in this room!'}
                </p>
                <p className="text-[11px] text-[var(--text-muted)] max-w-sm mx-auto">
                  Need to add someone new? Invite them to {organizationName} first.
                </p>
                {onOpenOrgInvite && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onClose();
                      onOpenOrgInvite();
                    }}
                    className="mt-2 text-xs"
                  >
                    <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                    Add User to Organization
                  </Button>
                )}
              </div>
            ) : (
              <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
                {filteredEligible.map((candidate) => {
                  const isAdding = addingUserId === candidate.id;
                  return (
                    <div
                      key={candidate.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--bg-surface-1)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] transition-all"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar
                          fallbackText={candidate.displayName || candidate.username}
                          src={candidate.avatarUrl || undefined}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-[var(--text-primary)] truncate">
                              {candidate.displayName || candidate.username}
                            </span>
                            <span className="text-[10px] text-[var(--text-muted)] truncate">
                              @{candidate.username}
                            </span>
                          </div>
                          <span className="text-[10px] text-[var(--text-muted)] block truncate">
                            {candidate.email}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border border-zinc-500/20">
                          {candidate.roleName}
                        </span>

                        <Button
                          type="button"
                          size="sm"
                          disabled={isAdding}
                          onClick={() => handleAddMember(candidate)}
                          className="bg-[var(--brand-primary,#6366f1)] hover:opacity-90 active:scale-[0.98] text-white text-xs h-7 px-2.5"
                        >
                          {isAdding ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <>
                              <UserPlus className="w-3 h-3 mr-1" />
                              Add
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: CURRENT ROOM MEMBERS */}
        {activeTab === 'MEMBERS' && (
          <div className="space-y-2">
            {roomMembers.length === 0 ? (
              <div className="py-8 text-center text-xs text-[var(--text-muted)]">
                No active members in this room.
              </div>
            ) : (
              <div className="max-h-[300px] overflow-y-auto space-y-1.5 pr-1">
                {roomMembers.map((m) => {
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
                        <button
                          type="button"
                          disabled={isRemoving}
                          onClick={() => handleRemoveMember(m.userId, m.user.displayName || m.user.username)}
                          className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                          title="Remove from Room"
                        >
                          {isRemoving ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-red-500" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
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
