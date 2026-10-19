'use client';

import { useAuthStore } from '@/stores/authStore';
import { useCommunityStore } from '@/stores/communityStore';
import { Avatar, Button } from '@mivo/ui';
import { CommunityDTO } from '@mivo/shared';
import { Users, Compass, Plus, MessageSquare, Sparkles, Hash, Volume2, Video, ArrowRight, Menu } from 'lucide-react';
import { useNavigationStore } from '@/stores/navigationStore';
import Link from 'next/link';

export default function ChannelsHomePage() {
  const { user } = useAuthStore();
  const { communities } = useCommunityStore();
  const { toggleMobileSidebar } = useNavigationStore();

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
          <div className="h-8 px-2 flex items-center justify-between text-[11px] font-extrabold uppercase tracking-wider text-[#71717A]">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-red-600" />
              <span>Direct Messages</span>
            </span>
          </div>

          <div className="space-y-1">
            <Link
              href="/conversations"
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-red-600/10 to-rose-600/10 hover:from-red-600/20 hover:to-rose-600/20 text-red-700 font-bold text-xs border border-red-500/25 shadow-sm transition-all cursor-pointer"
            >
              <MessageSquare className="w-4 h-4 text-red-600" />
              <span>Direct & Group Chats</span>
            </Link>
          </div>

          <div className="pt-2">
            <div className="px-2 text-[11px] font-extrabold uppercase tracking-wider text-[#71717A] mb-3">
              Joined Workspaces ({communities.length})
            </div>
            <div className="space-y-1">
              {communities.map((c: CommunityDTO) => (
                <Link
                  key={c.id}
                  href={`/communities/${c.id}`}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-[#4B5563] hover:bg-black/[0.04] hover:text-[#111827] transition-all"
                >
                  <span className="w-2 h-2 rounded-full bg-red-600" />
                  <span className="truncate">{c.name}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Home Hub View */}
      <section className="flex-1 bg-[var(--bg-canvas)] flex flex-col items-center justify-center p-8 sm:p-12 text-center relative overflow-hidden">
        {/* Subtle Ambient Radial Highlight */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-[#DC2626] to-[#991B1B] flex items-center justify-center text-white font-extrabold text-3xl shadow-2xl shadow-red-600/30 mb-6 border border-white/20 z-10">
          M
        </div>

        <h2 className="text-3xl sm:text-4xl font-extrabold text-[#111827] font-display tracking-tight mb-3 z-10">
          Welcome back, {user?.displayName || user?.username}!
        </h2>

        <p className="text-xs sm:text-sm text-[#4B5563] max-w-lg mb-10 leading-relaxed z-10">
          Your unified workspace is ready. Choose an active community below to jump directly into real-time voice, video, or chat rooms:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl w-full mb-8 text-left z-10">
          {communities.map((c: CommunityDTO) => (
            <Link
              key={c.id}
              href={`/communities/${c.id}`}
              className="p-5 rounded-3xl bg-[var(--bg-surface-1)] border border-[var(--border-subtle)] hover:border-red-500/40 hover:bg-[var(--bg-surface-2)] transition-all duration-200 group shadow-xl"
            >
              <div className="font-bold text-sm text-[#111827] group-hover:text-red-600 mb-1.5 flex items-center justify-between">
                <span>{c.name}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 border border-red-500/25">
                  {c.memberCount} members
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)] line-clamp-2 leading-relaxed">
                {c.description || 'Active communication and stage collaboration hub'}
              </p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
