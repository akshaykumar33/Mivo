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

  const isDMsActive = pathname.startsWith('/channels/@me');

  return (
    <>
      <aside className="w-[72px] h-full bg-[#0F131C] border-r border-slate-800/80 flex flex-col items-center py-3.5 space-y-3 z-30 select-none">
        {/* Direct Messages / Home icon */}
        <div className="relative group">
          <div
            className={`absolute -left-3.5 top-1/2 -translate-y-1/2 w-1.5 rounded-r-full bg-white transition-all duration-200 ${
              isDMsActive ? 'h-10' : 'h-0 group-hover:h-5'
            }`}
          />
          <Link
            href="/channels/@me"
            className={`flex items-center justify-center w-12 h-12 rounded-2xl transition-all duration-200 ${
              isDMsActive
                ? 'bg-violet-600 text-white rounded-xl shadow-lg shadow-violet-600/30'
                : 'bg-slate-800/80 text-slate-300 hover:bg-violet-600 hover:text-white hover:rounded-xl'
            }`}
          >
            <MessageSquare className="w-5 h-5" />
          </Link>
        </div>

        {/* Divider */}
        <div className="w-8 h-[2px] bg-slate-800 rounded-full my-1" />

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
                  className={`flex items-center justify-center w-12 h-12 transition-all duration-200 font-semibold text-sm ${
                    isActive
                      ? 'bg-violet-600 text-white rounded-xl shadow-lg shadow-violet-600/30'
                      : 'bg-slate-800/90 text-slate-200 rounded-2xl hover:bg-violet-600 hover:text-white hover:rounded-xl'
                  }`}
                >
                  {community.iconUrl ? (
                    <img
                      src={community.iconUrl}
                      alt={community.name}
                      className="w-full h-full rounded-xl object-cover"
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
            className="flex items-center justify-center w-12 h-12 rounded-2xl bg-slate-800/60 text-emerald-400 hover:bg-emerald-600 hover:text-white hover:rounded-xl transition-all duration-200 group shadow-sm"
            title="Create a Community"
          >
            <Plus className="w-5 h-5 transition-transform group-hover:rotate-90 duration-200" />
          </button>
        </div>

        {/* Discovery Button */}
        <Link
          href="/discover"
          className="flex items-center justify-center w-12 h-12 rounded-2xl bg-slate-800/60 text-cyan-400 hover:bg-cyan-600 hover:text-white hover:rounded-xl transition-all duration-200"
          title="Explore Public Communities"
        >
          <Compass className="w-5 h-5" />
        </Link>
      </aside>

      <CreateCommunityModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
};
