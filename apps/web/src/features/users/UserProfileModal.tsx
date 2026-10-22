'use client';

import * as React from 'react';
import {
  X,
  User,
  Shield,
  Briefcase,
  Building2,
  Calendar,
  Clock,
  MessageSquare,
  Phone,
  Laptop,
  AlertTriangle,
  FolderGit2,
  Lock,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api-client';
import { UserDTO, ProjectDTO } from '@mivo/shared';
import { useRouter } from 'next/navigation';
import { useConversationStore } from '@/stores/conversationStore';

export interface UserProfileModalProps {
  userId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  userId,
  isOpen,
  onClose,
}) => {
  const router = useRouter();
  const { user: currentUser, isGuest, setUpgradeModalOpen } = useAuthStore();
  const { startDirectConversation } = useConversationStore();

  const [profile, setProfile] = React.useState<UserDTO | null>(null);
  const [projects, setProjects] = React.useState<ProjectDTO[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isStartingDM, setIsStartingDM] = React.useState(false);

  React.useEffect(() => {
    if (!isOpen || !userId) {
      setProfile(null);
      setProjects([]);
      setError(null);
      return;
    }

    const loadProfile = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await api.get<UserDTO>(`/api/v1/users/${userId}`);
        if (res.success && res.data) {
          setProfile(res.data);
          // If non-org user, also fetch their published projects
          if (res.data.userTier === 'NON_ORG') {
            try {
              const projRes = await api.get<ProjectDTO[]>('/api/v1/projects');
              if (projRes.success && projRes.data) {
                setProjects(projRes.data.filter((p) => p.authorId === userId));
              }
            } catch {}
          }
        } else {
          setError('Failed to load profile.');
        }
      } catch (err: any) {
        if (err.status === 403 || err.code === 'ORG_PROFILE_RESTRICTED') {
          setError('Private Enterprise Profile: Guest accounts cannot view internal organization accounts. Only independent creator profiles are publicly viewable.');
        } else {
          setError(err.message || 'Error fetching user profile.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [isOpen, userId]);

  if (!isOpen) return null;

  const handleStartChat = async () => {
    if (isGuest) {
      setUpgradeModalOpen(true);
      return;
    }
    if (!userId) return;
    setIsStartingDM(true);
    try {
      await startDirectConversation(userId);
      onClose();
      router.push('/conversations');
    } catch (err: any) {
      alert(err.message || 'Failed to start conversation');
    } finally {
      setIsStartingDM(false);
    }
  };

  const handleStartLiveCode = () => {
    if (isGuest) {
      setUpgradeModalOpen(true);
      return;
    }
    onClose();
    router.push('/rooms');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-lg bg-[var(--bg-surface-0)] border border-[var(--border-subtle)] rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Banner Area */}
        <div className="h-28 bg-gradient-to-r from-red-950 via-zinc-900 to-cyan-950 relative">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-full bg-black/50 hover:bg-black/80 text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 pb-6 pt-0 relative flex-1">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-[var(--text-secondary)] font-display">Loading profile...</span>
            </div>
          ) : error ? (
            <div className="py-12 flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3">
                <Lock className="w-6 h-6 stroke-[1.8]" />
              </div>
              <h4 className="text-sm font-bold text-[var(--text-primary)]">Restricted Profile Access</h4>
              <p className="text-xs text-[var(--text-muted)] max-w-xs mt-1.5 leading-relaxed">
                {error}
              </p>
              {isGuest && (
                <button
                  onClick={() => {
                    onClose();
                    setUpgradeModalOpen(true);
                  }}
                  className="mt-4 px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 text-white text-xs font-bold shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                >
                  Claim Permanent Developer Account
                </button>
              )}
            </div>
          ) : profile ? (
            <div>
              {/* Profile Avatar Header */}
              <div className="flex items-end justify-between -mt-12 mb-4">
                <div className="relative">
                  {profile.avatarUrl ? (
                    <img
                      src={profile.avatarUrl}
                      alt={profile.displayName}
                      className="w-20 h-20 rounded-2xl border-4 border-[var(--bg-surface-0)] object-cover shadow-xl"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl border-4 border-[var(--bg-surface-0)] bg-gradient-to-br from-[#DC2626] to-[#991B1B] text-white text-2xl font-bold flex items-center justify-center shadow-xl">
                      {profile.displayName.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  {/* Status dot */}
                  <span
                    className={`absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-[var(--bg-surface-0)] ${
                      profile.status === 'ONLINE'
                        ? 'bg-emerald-500'
                        : profile.status === 'IDLE'
                        ? 'bg-amber-500'
                        : profile.status === 'DND'
                        ? 'bg-red-500'
                        : 'bg-zinc-500'
                    }`}
                  />
                </div>

                {/* Tier Badge */}
                <div>
                  {profile.userTier === 'ORG' ? (
                    <span className="px-3 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-bold flex items-center gap-1.5 shadow-sm">
                      <Building2 className="w-3.5 h-3.5" />
                      <span>{profile.organizationName || 'Enterprise Org'}</span>
                    </span>
                  ) : profile.userTier === 'NON_ORG' ? (
                    <span className="px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-bold flex items-center gap-1.5 shadow-sm">
                      <Shield className="w-3.5 h-3.5" />
                      <span>Independent Creator • Dev</span>
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-1.5 shadow-sm">
                      <User className="w-3.5 h-3.5" />
                      <span>Guest User</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Names & Handle */}
              <div>
                <h3 className="text-lg font-bold text-[var(--text-primary)] font-display flex items-center gap-2">
                  <span>{profile.displayName}</span>
                </h3>
                <span className="text-xs text-[var(--text-muted)] font-mono">@{profile.username}</span>
              </div>

              {/* Status Message */}
              {profile.customStatus && (
                <div className="mt-2.5 px-3 py-1.5 rounded-xl bg-[var(--bg-surface-1)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] italic">
                  "{profile.customStatus}"
                </div>
              )}

              {/* Bio */}
              <div className="mt-3">
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  {profile.bio || 'Independent developer building on Mivo.'}
                </p>
              </div>

              {/* Meta details */}
              <div className="mt-4 pt-3 border-t border-[var(--border-subtle)] grid grid-cols-2 gap-2 text-[11px] text-[var(--text-muted)]">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Joined {new Date(profile.createdAt).toLocaleDateString()}</span>
                </div>
                {profile.organizationRole && (
                  <div className="flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-purple-400" />
                    <span className="text-purple-300">{profile.organizationRole}</span>
                  </div>
                )}
              </div>

              {/* Published Projects (if non-org) */}
              {projects.length > 0 && (
                <div className="mt-4 pt-3 border-t border-[var(--border-subtle)]">
                  <h4 className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5 mb-2">
                    <FolderGit2 className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Published Projects ({projects.length})</span>
                  </h4>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {projects.map((p) => (
                      <div
                        key={p.id}
                        className="p-2.5 rounded-xl bg-[var(--bg-surface-1)] border border-[var(--border-subtle)] flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-bold text-[var(--text-primary)] block">{p.title}</span>
                          <span className="text-[10px] text-[var(--text-muted)] line-clamp-1">{p.description}</span>
                        </div>
                        {p.demoUrl && (
                          <a
                            href={p.demoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 text-cyan-400 hover:text-cyan-300 transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Guest Messaging Restriction Notice */}
              {isGuest && (
                <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-between text-xs text-amber-300">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <span>Guests can view profiles but cannot send direct messages or place calls.</span>
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

              {/* Footer Actions */}
              <div className="mt-5 pt-3 border-t border-[var(--border-subtle)] flex items-center justify-end gap-2.5">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-surface-2)] transition-colors cursor-pointer"
                >
                  Close
                </button>

                {!isGuest ? (
                  <>
                    <button
                      onClick={handleStartLiveCode}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30 border border-emerald-500/40 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                      title="Launch live code sharing stage"
                    >
                      <Laptop className="w-3.5 h-3.5" />
                      <span>Live Code Share</span>
                    </button>
                    <button
                      onClick={handleStartChat}
                      disabled={isStartingDM}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer disabled:opacity-50"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>{isStartingDM ? 'Opening...' : 'Message'}</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      onClose();
                      setUpgradeModalOpen(true);
                    }}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-yellow-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                  >
                    <Shield className="w-3.5 h-3.5" />
                    <span>Upgrade to Contact Dev</span>
                  </button>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
