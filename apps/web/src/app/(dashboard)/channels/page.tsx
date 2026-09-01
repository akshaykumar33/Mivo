'use client';

import { useAuthStore } from '@/stores/authStore';
import { useCommunityStore } from '@/stores/communityStore';
import { Avatar, Button } from '@mivo/ui';
import { CommunityDTO } from '@mivo/shared';
import { Users, Compass, Plus, MessageSquare, Sparkles, Hash, Volume2, Video, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function ChannelsHomePage() {
  const { user } = useAuthStore();
  const { communities } = useCommunityStore();

  return (
    <div className="flex-1 flex bg-[#07080C] overflow-hidden select-none">
      {/* Direct Messages Sub-Sidebar */}
      <aside className="w-64 h-full bg-[#0B0D14] border-r border-white/[0.06] p-4 flex flex-col justify-between">
        <div className="space-y-5">
          <div className="h-8 px-2 flex items-center justify-between text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-violet-400" />
              <span>Direct Messages</span>
            </span>
          </div>

          <div className="space-y-1">
            <button className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-violet-600/20 to-indigo-600/20 text-violet-200 font-bold text-xs border border-violet-500/30 shadow-sm">
              <Users className="w-4 h-4 text-violet-400" />
              <span>Friends & Activity</span>
            </button>
          </div>

          <div className="pt-2">
            <div className="px-2 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-3">
              Joined Workspaces ({communities.length})
            </div>
            <div className="space-y-1">
              {communities.map((c: CommunityDTO) => (
                <Link
                  key={c.id}
                  href={`/communities/${c.id}`}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-white/[0.04] hover:text-white transition-all"
                >
                  <span className="w-2 h-2 rounded-full bg-violet-500" />
                  <span className="truncate">{c.name}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Home Hub View */}
      <section className="flex-1 bg-[#0E1017] flex flex-col items-center justify-center p-8 sm:p-12 text-center relative overflow-hidden">
        {/* Subtle Ambient Radial Highlight */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-cyan-500 flex items-center justify-center text-white font-extrabold text-3xl shadow-2xl shadow-violet-600/30 mb-6 border border-white/20 z-10">
          M
        </div>

        <h2 className="text-3xl sm:text-4xl font-extrabold text-white font-display tracking-tight mb-3 z-10">
          Welcome back, {user?.displayName || user?.username}!
        </h2>

        <p className="text-xs sm:text-sm text-slate-400 max-w-lg mb-10 leading-relaxed z-10">
          Your unified workspace is ready. Choose an active community below to jump directly into real-time voice, video, or chat rooms:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl w-full mb-8 text-left z-10">
          {communities.map((c: CommunityDTO) => (
            <Link
              key={c.id}
              href={`/communities/${c.id}`}
              className="p-5 rounded-3xl bg-white/[0.02] border border-white/[0.06] hover:border-violet-500/40 hover:bg-white/[0.04] transition-all duration-200 group shadow-xl"
            >
              <div className="font-bold text-sm text-white group-hover:text-violet-300 mb-1.5 flex items-center justify-between">
                <span>{c.name}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-600/20 text-violet-300 border border-violet-500/30">
                  {c.memberCount} members
                </span>
              </div>
              <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                {c.description || 'Active communication and stage collaboration hub'}
              </p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
