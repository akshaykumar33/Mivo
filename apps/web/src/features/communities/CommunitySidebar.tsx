'use client';

import * as React from 'react';
import { useCommunityStore } from '@/stores/communityStore';
import { Plus, Compass, MessageSquare } from 'lucide-react';
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
      <aside className="w-[72px] h-full bg-[#07080C] border-r border-white/[0.06] flex flex-col items-center py-4 space-y-3 z-30 select-none">
        {/* Direct Messages / Home icon */}
        <div className="relative group">
          <div
            className={`absolute -left-3.5 top-1/2 -translate-y-1/2 w-1.5 rounded-r-full bg-white transition-all duration-200 ${
              isDMsActive ? 'h-10' : 'h-0 group-hover:h-5'
            }`}
          />
          <Link
            href="/channels"
            className={`flex items-center justify-center w-12 h-12 transition-all duration-200 ${
              isDMsActive
                ? 'bg-gradient-to-tr from-violet-600 to-indigo-600 text-white rounded-2xl shadow-lg shadow-violet-600/30'
                : 'bg-white/[0.04] text-slate-400 hover:bg-violet-600 hover:text-white rounded-2xl hover:rounded-2xl border border-white/[0.04] hover:border-violet-500/30'
            }`}
            title="Direct Messages & Hub"
          >
            <MessageSquare className="w-5 h-5" />
          </Link>
        </div>

        {/* Subtle Divider */}
        <div className="w-8 h-[1px] bg-white/[0.08] rounded-full my-1" />

        {/* Communities Scroll List */}
        <div className="flex-1 w-full overflow-y-auto overflow-x-hidden flex flex-col items-center space-y-3 py-1">
          {communities.map((community) => {
            const isActive = pathname.includes(`/communities/${community.id}`);
            const initials = community.name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2);

            return (
              <div key={community.id} className="relative group">
                <div
                  className={`absolute -left-3.5 top-1/2 -translate-y-1/2 w-1.5 rounded-r-full bg-white transition-all duration-200 ${
                    isActive ? 'h-10' : 'h-0 group-hover:h-5'
                  }`}
                />
                <Link
                  href={`/communities/${community.id}`}
                  className={`flex items-center justify-center w-12 h-12 transition-all duration-200 font-bold text-sm tracking-wide ${
                    isActive
                      ? 'bg-gradient-to-tr from-violet-600 to-indigo-600 text-white rounded-2xl shadow-lg shadow-violet-600/30 border border-white/20'
                      : 'bg-white/[0.04] text-slate-300 rounded-2xl hover:bg-violet-600 hover:text-white border border-white/[0.05] hover:border-violet-500/40'
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
            className="flex items-center justify-center w-12 h-12 rounded-2xl bg-white/[0.03] text-emerald-400 hover:bg-emerald-600 hover:text-white border border-emerald-500/20 hover:border-emerald-500/40 transition-all duration-200 group shadow-sm"
            title="Create a Community"
          >
            <Plus className="w-5 h-5 transition-transform group-hover:rotate-90 duration-200" />
          </button>
        </div>

        {/* Discovery Button */}
        <Link
          href="/discover"
          className="flex items-center justify-center w-12 h-12 rounded-2xl bg-white/[0.03] text-cyan-400 hover:bg-cyan-600 hover:text-white border border-cyan-500/20 hover:border-cyan-500/40 transition-all duration-200"
          title="Explore Public Communities"
        >
          <Compass className="w-5 h-5" />
        </Link>
      </aside>

      <CreateCommunityModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
};
