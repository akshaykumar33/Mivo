'use client';

import * as React from 'react';
import { useCommunityStore } from '@/stores/communityStore';
import { Plus, Compass, MessageSquare, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CreateCommunityModal } from './CreateCommunityModal';

export const CommunitySidebar: React.FC = () => {
  const pathname = usePathname();
  const { communities, fetchCommunities } = useCommunityStore();
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  React.useEffect(() => {
    fetchCommunities();
  }, [fetchCommunities]);

  const isDMsActive = pathname.startsWith('/channels');

  return (
    <>
      <aside className="w-20 h-full bg-[#06070B] border-r border-white/[0.06] flex flex-col items-center py-5 space-y-4 z-30 select-none">
        {/* Direct Messages / Home icon */}
        <div className="relative group flex items-center justify-center w-full">
          <div
            className={`absolute left-0 w-1 rounded-r-full bg-gradient-to-b from-violet-400 to-indigo-500 transition-all duration-300 ${
              isDMsActive ? 'h-10 opacity-100' : 'h-0 opacity-0 group-hover:h-5 group-hover:opacity-100'
            }`}
          />
          <Link
            href="/channels"
            className={`flex items-center justify-center w-13 h-13 transition-all duration-300 ${
              isDMsActive
                ? 'bg-gradient-to-tr from-violet-600 via-indigo-600 to-cyan-500 text-white rounded-2xl shadow-xl shadow-violet-600/30 border border-white/20 scale-105'
                : 'bg-white/[0.03] text-slate-400 hover:bg-white/[0.08] hover:text-white rounded-3xl hover:rounded-2xl border border-white/[0.05] hover:border-violet-500/40'
            }`}
            title="Direct Messages & Main Hub"
          >
            <MessageSquare className="w-5 h-5" />
          </Link>
        </div>

        {/* Subtle Horizontal Divider */}
        <div className="w-10 h-[1px] bg-white/[0.08] rounded-full my-1" />

        {/* Communities Scroll List */}
        <div className="flex-1 w-full overflow-y-auto overflow-x-hidden flex flex-col items-center space-y-3.5 py-1 scrollbar-none">
          {communities.map((community) => {
            const isActive = pathname.includes(`/communities/${community.id}`);
            const initials = community.name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2);

            return (
              <div key={community.id} className="relative group flex items-center justify-center w-full">
                <div
                  className={`absolute left-0 w-1 rounded-r-full bg-gradient-to-b from-violet-400 to-cyan-400 transition-all duration-300 ${
                    isActive ? 'h-10 opacity-100' : 'h-0 opacity-0 group-hover:h-5 group-hover:opacity-100'
                  }`}
                />
                <Link
                  href={`/communities/${community.id}`}
                  className={`flex items-center justify-center w-13 h-13 transition-all duration-300 font-extrabold text-sm tracking-tight ${
                    isActive
                      ? 'bg-gradient-to-tr from-violet-600 to-indigo-600 text-white rounded-2xl shadow-xl shadow-violet-600/30 border border-white/20 scale-105'
                      : 'bg-white/[0.03] text-slate-300 rounded-3xl hover:rounded-2xl hover:bg-violet-600 hover:text-white border border-white/[0.05] hover:border-violet-500/40'
                  }`}
                  title={community.name}
                >
                  {community.iconUrl ? (
                    <img
                      src={community.iconUrl}
                      alt={community.name}
                      className="w-full h-full rounded-2xl object-cover"
                    />
                  ) : (
                    initials
                  )}
                </Link>
              </div>
            );
          })}

          {/* Add Community Button */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center w-13 h-13 rounded-3xl hover:rounded-2xl bg-white/[0.02] text-emerald-400 hover:bg-emerald-600 hover:text-white border border-emerald-500/20 hover:border-emerald-500/40 transition-all duration-300 group shadow-sm hover:scale-105"
            title="Create a Community"
          >
            <Plus className="w-5 h-5 transition-transform group-hover:rotate-90 duration-300" />
          </button>
        </div>

        {/* Discovery Button */}
        <Link
          href="/discover"
          className="flex items-center justify-center w-13 h-13 rounded-3xl hover:rounded-2xl bg-white/[0.02] text-cyan-400 hover:bg-cyan-600 hover:text-white border border-cyan-500/20 hover:border-cyan-500/40 transition-all duration-300 shadow-sm hover:scale-105"
          title="Explore Public Communities"
        >
          <Compass className="w-5 h-5" />
        </Link>
      </aside>

      <CreateCommunityModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
};
