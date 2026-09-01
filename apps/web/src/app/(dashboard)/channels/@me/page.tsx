'use client';

import { useAuthStore } from '@/stores/authStore';
import { useCommunityStore } from '@/stores/communityStore';
import { Avatar, Button } from '@mivo/ui';
import { CommunityDTO } from '@mivo/shared';
import { Users, Compass, Plus, MessageSquare, Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function DirectMessagesPage() {
  const { user } = useAuthStore();
  const { communities } = useCommunityStore();

  return (
    <div className="flex-1 flex bg-[#151A26] overflow-hidden select-none">
      {/* Direct Messages Sub-Sidebar */}
      <aside className="w-60 h-full bg-[#151A26] border-r border-slate-800/80 p-3 flex flex-col justify-between">
        <div className="space-y-4">
          <div className="h-8 px-2 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
            <span>Direct Messages</span>
          </div>

          <div className="space-y-1">
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-xl bg-violet-600/20 text-violet-300 font-semibold text-xs border border-violet-500/30">
              <Users className="w-4 h-4 text-violet-400" />
              <span>Friends & Activity</span>
            </button>
          </div>

          <div className="pt-2">
            <div className="px-2 text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
              Joined Communities
            </div>
            <div className="space-y-1">
              {communities.map((c: CommunityDTO) => (
                <Link
                  key={c.id}
                  href={`/communities/${c.id}`}
                  className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-800/60 hover:text-white transition-colors"
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
      <section className="flex-1 bg-[#1C2232] flex flex-col items-center justify-center p-8 text-center">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white font-bold text-3xl shadow-2xl shadow-violet-600/30 mb-6">
          M
        </div>

        <h2 className="text-2xl font-bold text-white font-display mb-2">
          Welcome, {user?.displayName || user?.username}!
        </h2>

        <p className="text-sm text-slate-400 max-w-md mb-8">
          You are ready to communicate. Select a community from the sidebar on the left, or create a brand new one to start inviting teammates and friends.
        </p>

        <div className="flex items-center gap-3">
          <Link href="/discover">
            <Button variant="secondary" className="gap-2">
              <Compass className="w-4 h-4 text-cyan-400" />
              <span>Explore Public Communities</span>
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
