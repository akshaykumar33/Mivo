'use client';
import * as React from 'react';
import { useCommunityStore } from '@/stores/communityStore';
import { useTicketStore } from '@/stores/ticketStore';
import { useAuthStore } from '@/stores/authStore';
import { useUserPresence } from '@/stores/presenceStore';
import { useThemeStore } from '@/stores/themeStore';
import { Avatar } from '@mivo/ui';
import { Plus, Compass, MessageSquare, BookOpen, Ticket, FolderGit2 } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CreateCommunityModal } from './CreateCommunityModal';
import { SingleOrgLimitModal } from './SingleOrgLimitModal';
import { InteractiveDocsModal } from '@/features/docs/InteractiveDocsModal';
import { NotificationBell } from '@/features/notifications/NotificationBell';
import { SlackUserMenuPopover } from '@/features/auth/SlackUserMenuPopover';
import { SlackStatusModal } from '@/features/auth/SlackStatusModal';
import { EditProfileModal } from '@/features/auth/EditProfileModal';
import { ProjectsHubModal } from '@/features/projects/ProjectsHubModal';

const COMMUNITY_PALETTES = [
  'from-[#DC2626] via-[#EF4444] to-[#F87171]',
  'from-[#991B1B] via-[#DC2626] to-[#F59E0B]',
  'from-[#881337] via-[#BE123C] to-[#FB7185]',
  'from-[#B91C1C] via-[#EA580C] to-[#FBBF24]',
  'from-[#7F1D1D] via-[#DC2626] to-[#F43F5E]',
];

export interface CommunitySidebarProps {
  onNavigate?: () => void;
}

export const CommunitySidebar: React.FC<CommunitySidebarProps> = ({ onNavigate }) => {
  const pathname = usePathname();
  const { user, isGuest, isOrg, isNonOrg, userTier, capabilities, projectsModalOpen, setProjectsModalOpen } = useAuthStore();
  const userPresence = useUserPresence(user?.id, user);
  const { setIsThemeModalOpen } = useThemeStore();
  const { communities, fetchCommunities } = useCommunityStore();
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isSingleOrgLimitOpen, setIsSingleOrgLimitOpen] = React.useState(false);
  const [isDocsOpen, setIsDocsOpen] = React.useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = React.useState(false);
  const [isSlackStatusOpen, setIsSlackStatusOpen] = React.useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = React.useState(false);

  React.useEffect(() => {
    fetchCommunities();
  }, [fetchCommunities]);

  const uniqueCommunities = React.useMemo(() => {
    const seen = new Set<string>();
    return communities.filter((c) => {
      if (!c || !c.id || seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });
  }, [communities]);

  const isDMsActive = pathname.startsWith('/conversations') || pathname.startsWith('/channels');

  return (
    <>
      <aside className="w-[72px] h-full bg-[var(--bg-surface-0)] border-r border-[var(--border-subtle)] backdrop-blur-2xl flex flex-col items-center pt-3 pb-3.5 space-y-2.5 z-30 select-none flex-shrink-0">
        {/* macOS Style Traffic Light Control Dots */}
        <div className="flex items-center gap-1.5 pb-1">
          <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F56] shadow-[0_0_8px_rgba(255,95,86,0.6)] cursor-pointer hover:scale-110 transition-transform" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E] shadow-[0_0_8px_rgba(255,189,46,0.6)] cursor-pointer hover:scale-110 transition-transform" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#27C93F] shadow-[0_0_8px_rgba(39,201,63,0.6)] cursor-pointer hover:scale-110 transition-transform" />
        </div>

        {/* Direct Messages / Overview Home App Icon */}
        <div className="relative group flex items-center justify-center w-full">
          {/* Active Spring Indicator Bar */}
          <div
            className={`absolute left-0 w-[4px] rounded-r-full bg-gradient-to-b from-[#DC2626] to-[#991B1B] transition-all duration-300 ${
              isDMsActive ? 'h-8 opacity-100' : 'h-0 opacity-0 group-hover:h-4 group-hover:opacity-80'
            }`}
          />
          <Link
            href="/conversations"
            onClick={() => onNavigate?.()}
            className={`flex items-center justify-center w-11 h-11 rounded-[16px] transition-all duration-200 cursor-pointer ${
              isDMsActive
                ? 'bg-gradient-to-br from-[#DC2626] via-[#B91C1C] to-[#991B1B] !text-white shadow-[0_6px_20px_rgba(220,38,38,0.45)] border border-red-300/40 scale-105'
                : 'bg-[var(--bg-surface-1)] text-[var(--text-secondary)] hover:text-[#DC2626] hover:bg-[var(--bg-surface-2)] hover:rounded-[14px] border border-[var(--border-subtle)] hover:scale-105'
            }`}
          >
            <MessageSquare className="w-4 h-4 stroke-[2.2]" />
          </Link>

          {/* Apple Custom Hover Tooltip */}
          <div className="absolute left-[72px] px-3 py-1 rounded-[10px] bg-[var(--bg-surface-0)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-150 whitespace-nowrap shadow-xl backdrop-blur-xl z-50">
            Overview & DMs
          </div>
        </div>

        {/* Notifications Hub Bell */}
        <NotificationBell size="lg" />

        {/* Apple macOS Glass Divider */}
        <div className="w-7 h-[1px] bg-[var(--border-subtle)] rounded-full my-0.5" />

        {/* Communities App Icons Scroll List */}
        <div className="flex-1 w-full overflow-y-auto overflow-x-hidden flex flex-col items-center space-y-2 py-1 scrollbar-none">
          {uniqueCommunities.map((community, index) => {
            const isActive = pathname.includes(`/communities/${community.id}`);
            const initials = community.name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2);

            const palette = COMMUNITY_PALETTES[index % COMMUNITY_PALETTES.length];

            return (
              <div key={community.id} className="relative group flex items-center justify-center w-full">
                {/* Active Indicator Bar */}
                <div
                  className={`absolute left-0 w-[4px] rounded-r-full bg-gradient-to-b from-[#DC2626] to-[#E11D48] transition-all duration-300 ${
                    isActive ? 'h-8 opacity-100' : 'h-0 opacity-0 group-hover:h-4 group-hover:opacity-80'
                  }`}
                />
                <Link
                  href={`/communities/${community.id}`}
                  onClick={() => onNavigate?.()}
                  className={`flex items-center justify-center w-11 h-11 rounded-[16px] transition-all duration-200 font-bold text-xs tracking-tight cursor-pointer ${
                    isActive
                      ? `bg-gradient-to-br ${palette} !text-white shadow-[0_6px_20px_rgba(220,38,38,0.4)] border border-white/30 scale-105`
                      : 'bg-[var(--bg-surface-1)] text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)] hover:rounded-[14px] border border-[var(--border-subtle)] hover:scale-105'
                  }`}
                >
                  {community.iconUrl ? (
                    <img
                      src={community.iconUrl}
                      alt={community.name}
                      className="w-full h-full rounded-[16px] object-cover"
                    />
                  ) : (
                    <span>{initials}</span>
                  )}
                </Link>

                {/* Apple Custom Hover Tooltip */}
                <div className="absolute left-[72px] px-3 py-1 rounded-[10px] bg-[var(--bg-surface-0)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-150 whitespace-nowrap shadow-xl backdrop-blur-xl z-50">
                  {community.name}
                </div>
              </div>
            );
          })}

          {/* Add Community Action */}
          <div className="relative group flex items-center justify-center w-full pt-1">
            <button
              onClick={() => {
                if (uniqueCommunities.length >= 1) {
                  setIsSingleOrgLimitOpen(true);
                } else {
                  setIsModalOpen(true);
                }
              }}
              className="flex items-center justify-center w-11 h-11 rounded-[16px] hover:rounded-[14px] bg-[var(--bg-surface-1)] text-[#DC2626] hover:bg-[#DC2626] hover:!text-white border border-[#DC2626]/30 hover:border-[#DC2626] transition-all duration-200 cursor-pointer shadow-sm hover:scale-105"
            >
              <Plus className="w-4 h-4 stroke-[2.5] transition-transform group-hover:rotate-90 duration-200" />
            </button>

            <div className="absolute left-[72px] px-3 py-1 rounded-[10px] bg-[var(--bg-surface-0)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-150 whitespace-nowrap shadow-xl backdrop-blur-xl z-50">
              Create Community
            </div>
          </div>
        </div>

        {/* Bottom Tool Icons (Profile, Docs Hub & Discover) */}
        <div className="w-full flex flex-col items-center space-y-2.5 pt-2 pb-2 border-t border-[var(--border-subtle)]">
          {/* User Profile Avatar with Presence & Slack Status Trigger */}
          {user && (
            <div className="relative group flex items-center justify-center w-full pb-1">
              <button
                type="button"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="relative p-0.5 rounded-[16px] hover:scale-110 active:scale-95 transition-all cursor-pointer ring-2 ring-transparent hover:ring-[#DC2626]/40"
                title="Your Profile & Status"
              >
                <Avatar
                  size="sm"
                  status={userPresence.status}
                  fallbackText={user.displayName || user.username}
                  src={user.avatarUrl}
                />
                {userPresence.customStatus && (
                  <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-[#DC2626] text-white rounded-full flex items-center justify-center text-[8px] font-bold shadow-sm ring-1 ring-[var(--bg-surface-0)]">
                    •
                  </span>
                )}
              </button>

              <div className="absolute left-[72px] px-3 py-1.5 rounded-[10px] bg-[var(--bg-surface-0)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-150 whitespace-nowrap shadow-xl backdrop-blur-xl z-50">
                <div className="font-bold flex items-center gap-1.5">
                  <span>{user.displayName || user.username}</span>
                  <span
                    className={`w-2 h-2 rounded-full ${
                      userPresence.status === 'ONLINE'
                        ? 'bg-emerald-500'
                        : userPresence.status === 'IDLE'
                        ? 'bg-amber-500'
                        : userPresence.status === 'DND'
                        ? 'bg-red-500'
                        : 'bg-zinc-400'
                    }`}
                  />
                </div>
                <div className="text-[10px] text-[var(--text-muted)] truncate max-w-[140px]">
                  {userPresence.customStatus ? userPresence.customStatus : userPresence.status.toLowerCase()}
                </div>
                <div className="mt-1 flex items-center gap-1">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                      isOrg
                        ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                        : isGuest
                        ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                        : 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                    }`}
                  >
                    {capabilities.badgeLabel}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Developer Projects Showcase Hub */}
          <div className="relative group flex items-center justify-center w-full">
            <button
              onClick={() => setProjectsModalOpen(true)}
              className="flex items-center justify-center w-10 h-10 rounded-[14px] bg-[var(--bg-surface-1)] text-cyan-500 hover:bg-cyan-500 hover:!text-white border border-cyan-500/25 hover:border-cyan-500/50 transition-all duration-200 cursor-pointer shadow-sm hover:scale-105"
            >
              <FolderGit2 className="w-4 h-4 stroke-[2.2]" />
            </button>

            <div className="absolute left-[72px] px-3 py-1 rounded-[10px] bg-[var(--bg-surface-0)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-150 whitespace-nowrap shadow-xl backdrop-blur-xl z-50">
              Developer Projects Showcase
            </div>
          </div>

          <div className="relative group flex items-center justify-center w-full">
            <button
              onClick={() => setIsDocsOpen(true)}
              className="flex items-center justify-center w-10 h-10 rounded-[14px] bg-[var(--bg-surface-1)] text-[#DC2626] hover:bg-[#DC2626] hover:!text-white border border-[#DC2626]/20 hover:border-[#DC2626]/50 transition-all duration-200 cursor-pointer shadow-sm hover:scale-105"
            >
              <BookOpen className="w-4 h-4 stroke-[2.2]" />
            </button>

            <div className="absolute left-[72px] px-3 py-1 rounded-[10px] bg-[var(--bg-surface-0)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-150 whitespace-nowrap shadow-xl backdrop-blur-xl z-50">
              Documentation Hub
            </div>
          </div>

          {/* Support & Issues Tickets */}
          <div className="relative group flex items-center justify-center w-full">
            <button
              onClick={() => useTicketStore.getState().setIsModalOpen(true)}
              className="flex items-center justify-center w-10 h-10 rounded-[14px] bg-[var(--bg-surface-1)] text-[#D97706] hover:bg-[#D97706] hover:!text-white border border-[#D97706]/20 hover:border-[#D97706]/50 transition-all duration-200 cursor-pointer shadow-sm hover:scale-105"
            >
              <Ticket className="w-4 h-4 stroke-[2.2]" />
            </button>

            <div className="absolute left-[72px] px-3 py-1 rounded-[10px] bg-[var(--bg-surface-0)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-150 whitespace-nowrap shadow-xl backdrop-blur-xl z-50">
              Support & Tickets Hub
            </div>
          </div>

          <div className="relative group flex items-center justify-center w-full">
            <Link
              href="/channels"
              onClick={() => onNavigate?.()}
              className="flex items-center justify-center w-10 h-10 rounded-[14px] bg-[var(--bg-surface-1)] text-[#DC2626] hover:bg-[#DC2626] hover:!text-white border border-[#DC2626]/20 hover:border-[#DC2626]/50 transition-all duration-200 cursor-pointer shadow-sm hover:scale-105"
            >
              <Compass className="w-4 h-4 stroke-[2.2]" />
            </Link>

            <div className="absolute left-[72px] px-3 py-1 rounded-[10px] bg-[var(--bg-surface-0)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-150 whitespace-nowrap shadow-xl backdrop-blur-xl z-50">
              Explore Communities
            </div>
          </div>
        </div>
      </aside>

      <SlackUserMenuPopover
        isOpen={isUserMenuOpen}
        onClose={() => setIsUserMenuOpen(false)}
        onOpenFullModal={() => setIsSlackStatusOpen(true)}
        onOpenEditProfile={() => setIsEditProfileOpen(true)}
        onOpenThemeModal={() => setIsThemeModalOpen(true)}
        placement="side-rail"
      />

      <SlackStatusModal
        isOpen={isSlackStatusOpen}
        onClose={() => setIsSlackStatusOpen(false)}
      />

      <EditProfileModal
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
      />

      <CreateCommunityModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      <SingleOrgLimitModal
        isOpen={isSingleOrgLimitOpen}
        onClose={() => setIsSingleOrgLimitOpen(false)}
        activeCommunity={uniqueCommunities[0] || null}
      />
      <InteractiveDocsModal isOpen={isDocsOpen} onClose={() => setIsDocsOpen(false)} />
      <ProjectsHubModal isOpen={projectsModalOpen} onClose={() => setProjectsModalOpen(false)} />
    </>
  );
};
