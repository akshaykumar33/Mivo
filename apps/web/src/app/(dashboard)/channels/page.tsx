'use client';

import * as React from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useCommunityStore } from '@/stores/communityStore';
import { useUserPresence } from '@/stores/presenceStore';
import { useThemeStore } from '@/stores/themeStore';
import { Avatar, Button } from '@mivo/ui';
import { CommunityDTO } from '@mivo/shared';
import {
  Users,
  Compass,
  Plus,
  MessageSquare,
  Sparkles,
  Hash,
  Volume2,
  Video,
  ArrowRight,
  Menu,
  Smile,
  ShieldCheck,
  Palette,
  Layers,
  ArrowUpRight,
} from 'lucide-react';
import { useNavigationStore } from '@/stores/navigationStore';
import { SlackUserMenuPopover } from '@/features/auth/SlackUserMenuPopover';
import { SlackStatusModal } from '@/features/auth/SlackStatusModal';
import { EditProfileModal } from '@/features/auth/EditProfileModal';
import Link from 'next/link';

export default function ChannelsHomePage() {
  const { user } = useAuthStore();
  const presence = useUserPresence(user?.id, user);
  const { communities } = useCommunityStore();
  const { toggleMobileSidebar } = useNavigationStore();
  const { setIsThemeModalOpen } = useThemeStore();

  const [isUserMenuOpen, setIsUserMenuOpen] = React.useState(false);
  const [isSlackStatusOpen, setIsSlackStatusOpen] = React.useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = React.useState(false);

  return (
    <div className="flex-1 flex flex-col md:flex-row bg-[var(--bg-canvas)] overflow-hidden select-none">
      {/* Mobile Top Header */}
      <div className="md:hidden h-14 px-4 bg-[var(--bg-surface-0)] border-b border-[var(--border-subtle)] flex items-center justify-between flex-shrink-0">
        <button
          onClick={toggleMobileSidebar}
          className="p-2 rounded-xl bg-[var(--bg-surface-1)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)] transition-colors cursor-pointer"
        >
          <Menu className="w-4 h-4" />
        </button>
        <span className="font-display font-bold text-xs text-[var(--text-primary)]">Mivo Home</span>
        <div className="w-8" />
      </div>

      {/* Direct Messages Sub-Sidebar (Desktop) */}
      <aside className="hidden md:flex w-64 h-full bg-[var(--bg-sidebar)] border-r border-[var(--border-subtle)] p-4 flex-col justify-between flex-shrink-0">
        <div className="space-y-5">
          <div className="h-8 px-2 flex items-center justify-between text-xs font-medium text-[var(--text-muted)]">
            <span className="flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-[var(--brand-primary,#dc2626)]" />
              <span>Direct Messages</span>
            </span>
          </div>

          <div className="space-y-1">
            <Link
              href="/conversations"
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-[var(--bg-surface-1)] hover:bg-[var(--bg-surface-2)] text-[var(--text-primary)] font-semibold text-xs border border-[var(--border-subtle)] shadow-xs transition-all cursor-pointer"
            >
              <MessageSquare className="w-4 h-4 text-[var(--brand-primary,#dc2626)]" />
              <span>Direct & Group Chats</span>
            </Link>
          </div>

          <div className="pt-2">
            <div className="px-2 text-xs font-medium text-[var(--text-muted)] mb-3">
              Workspaces ({communities.length})
            </div>
            <div className="space-y-1">
              {communities.map((c: CommunityDTO) => (
                <Link
                  key={c.id}
                  href={`/communities/${c.id}`}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-surface-1)] hover:text-[var(--text-primary)] transition-all"
                >
                  <span className="w-2 h-2 rounded-full bg-[var(--brand-primary,#dc2626)]" />
                  <span className="truncate">{c.name}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* User Footer */}
        {user && (
          <div className="p-2 -mx-2 border-t border-[var(--border-subtle)] bg-[var(--bg-sidebar)] flex items-center justify-between shrink-0 rounded-xl">
            <button
              type="button"
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-2.5 min-w-0 text-left hover:bg-[var(--bg-surface-1)] p-1.5 rounded-lg transition-all cursor-pointer group flex-1"
              title="Your Profile & Status"
            >
              <div className="relative shrink-0">
                <Avatar
                  size="sm"
                  status={presence.status}
                  fallbackText={user.displayName || user.username}
                  src={user.avatarUrl}
                  className="group-hover:scale-102 transition-transform"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-[var(--text-primary)] truncate group-hover:text-red-600 transition-colors">
                  {user.displayName || user.username}
                </div>
                <div className="text-[10px] text-[var(--text-muted)] truncate flex items-center gap-1">
                  {presence.customStatus ? (
                    <span className="text-red-600 font-medium truncate">{presence.customStatus}</span>
                  ) : (
                    <span className="capitalize">{presence.status.toLowerCase()}</span>
                  )}
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setIsSlackStatusOpen(true)}
              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-600 hover:bg-red-500/10 transition-all cursor-pointer"
              title="Set Availability & Status"
            >
              <Smile className="w-4 h-4 text-red-600" />
            </button>
          </div>
        )}
      </aside>

      {/* Slack User Menu Popover */}
      <SlackUserMenuPopover
        isOpen={isUserMenuOpen}
        onClose={() => setIsUserMenuOpen(false)}
        onOpenFullModal={() => setIsSlackStatusOpen(true)}
        onOpenEditProfile={() => setIsEditProfileOpen(true)}
        onOpenThemeModal={() => setIsThemeModalOpen(true)}
        placement="bottom-bar"
      />

      {/* Slack Availability & Status Modal */}
      <SlackStatusModal
        isOpen={isSlackStatusOpen}
        onClose={() => setIsSlackStatusOpen(false)}
      />

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
      />

      {/* Main Home Hub View */}
      <section className="flex-1 bg-[var(--bg-canvas)] flex flex-col p-6 sm:p-10 overflow-y-auto relative text-left">
        <div className="max-w-4xl w-full mx-auto space-y-8">
          {/* Header Banner */}
          <div className="p-6 sm:p-8 rounded-2xl bg-[var(--bg-surface-0)] border border-[var(--border-subtle)] shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-red-500/10 border border-red-500/20 text-red-600 text-[11px] font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Unified Workspace Ready</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] font-display tracking-tight">
                Welcome back, {user?.displayName || user?.username}
              </h2>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed max-w-lg">
                Enter your team&apos;s workspace below to collaborate on voice huddles, review code, or continue threaded discussions.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Link href="/conversations">
                <Button size="sm" className="gap-2 font-semibold shadow-xs">
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Open Direct Chats</span>
                </Button>
              </Link>
            </div>
          </div>

          {/* Workspaces & Communities List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[var(--text-primary)] font-display uppercase tracking-wider">
                Active Workspaces
              </h3>
              <span className="text-xs text-[var(--text-muted)] font-mono">
                {communities.length} {communities.length === 1 ? 'workspace' : 'workspaces'} available
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {communities.map((c: CommunityDTO) => (
                <Link
                  key={c.id}
                  href={`/communities/${c.id}`}
                  className="p-5 rounded-2xl bg-[var(--bg-surface-0)] border border-[var(--border-subtle)] hover:border-red-500/30 hover:bg-[var(--bg-surface-1)] transition-all group shadow-xs flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="font-bold text-sm text-[var(--text-primary)] group-hover:text-red-600 transition-colors flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-600" />
                        <span>{c.name}</span>
                      </span>
                      <ArrowUpRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100" />
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
                      {c.description || 'Active communication and stage collaboration workspace.'}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                    <span className="flex items-center gap-1 font-medium">
                      <Users className="w-3 h-3 text-red-600" />
                      <span>{c.memberCount || 1} team members</span>
                    </span>
                    <span className="font-semibold text-red-600 group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                      <span>Enter</span>
                      <span>&rarr;</span>
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
