'use client';

import * as React from 'react';
import { useCommunityStore } from '@/stores/communityStore';
import { Plus, Compass, MessageSquare, BookOpen, Layers } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CreateCommunityModal } from './CreateCommunityModal';
import { InteractiveDocsModal } from '@/features/docs/InteractiveDocsModal';

export const CommunitySidebar: React.FC = () => {
  const pathname = usePathname();
  const { communities, fetchCommunities } = useCommunityStore();
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isDocsOpen, setIsDocsOpen] = React.useState(false);

  React.useEffect(() => {
    fetchCommunities();
  }, [fetchCommunities]);

  const isDMsActive = pathname.startsWith('/channels');

  return (
    <>
      <aside className="w-[76px] h-full bg-[#07080D]/90 border-r border-white/[0.07] backdrop-blur-2xl flex flex-col items-center pt-3.5 pb-4 space-y-3 z-30 select-none">
        {/* macOS Style Traffic Light Control Dots */}
        <div className="flex items-center gap-1.5 pb-1">
          <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F56] shadow-[0_0_8px_rgba(255,95,86,0.6)] cursor-pointer hover:scale-110 transition-transform" title="Close" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E] shadow-[0_0_8px_rgba(255,189,46,0.6)] cursor-pointer hover:scale-110 transition-transform" title="Minimize" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#27C93F] shadow-[0_0_8px_rgba(39,201,63,0.6)] cursor-pointer hover:scale-110 transition-transform" title="Maximize" />
        </div>

        {/* macOS Style Direct Messages / Home App Icon */}
        <div className="relative group flex items-center justify-center w-full pt-1">
          {/* Active Spring Indicator Bar */}
          <div
            className={`absolute left-0 w-[4px] rounded-r-full bg-gradient-to-b from-[#5E5CE6] to-[#0A84FF] transition-all duration-300 ${
              isDMsActive ? 'h-8 opacity-100' : 'h-0 opacity-0 group-hover:h-4 group-hover:opacity-80'
            }`}
          />
          <Link
            href="/channels"
            className={`flex items-center justify-center w-12 h-12 rounded-[18px] transition-all duration-200 cursor-pointer ${
              isDMsActive
                ? 'bg-gradient-to-br from-[#5E5CE6] via-[#0A84FF] to-[#64D2FF] text-white shadow-[0_8px_20px_rgba(94,92,230,0.4)] border border-white/30 scale-105'
                : 'bg-white/[0.04] text-white/60 hover:text-white hover:bg-white/[0.09] hover:rounded-[16px] border border-white/[0.06] hover:border-white/[0.15] hover:scale-105'
            }`}
            title="Direct Messages & Overview"
          >
            <MessageSquare className="w-5 h-5 stroke-[2.2]" />
          </Link>
        </div>

        {/* Apple macOS Glass Divider */}
        <div className="w-8 h-[1px] bg-white/[0.08] rounded-full my-0.5" />

        {/* Communities App Icons Scroll List */}
        <div className="flex-1 w-full overflow-y-auto overflow-x-hidden flex flex-col items-center space-y-3 py-1 scrollbar-none">
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
                {/* Active Indicator Bar */}
                <div
                  className={`absolute left-0 w-[4px] rounded-r-full bg-gradient-to-b from-[#BF5AF2] to-[#5E5CE6] transition-all duration-300 ${
                    isActive ? 'h-8 opacity-100' : 'h-0 opacity-0 group-hover:h-4 group-hover:opacity-80'
                  }`}
                />
                <Link
                  href={`/communities/${community.id}`}
                  className={`flex items-center justify-center w-12 h-12 rounded-[18px] transition-all duration-200 font-extrabold text-sm tracking-tight cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-br from-[#BF5AF2] via-[#5E5CE6] to-[#0A84FF] text-white shadow-[0_8px_24px_rgba(191,90,242,0.4)] border border-white/30 scale-105'
                      : 'bg-white/[0.04] text-white/80 hover:text-white hover:bg-white/[0.1] hover:rounded-[16px] border border-white/[0.06] hover:border-white/[0.15] hover:scale-105'
                  }`}
                  title={community.name}
                >
                  {community.iconUrl ? (
                    <img
                      src={community.iconUrl}
                      alt={community.name}
                      className="w-full h-full rounded-[18px] object-cover"
                    />
                  ) : (
                    <span>{initials}</span>
                  )}
                </Link>

                {/* macOS Native-Style Tooltip */}
                <div className="absolute left-[78px] px-3 py-1.5 rounded-xl bg-[#141724]/95 border border-white/[0.12] text-xs font-semibold text-white opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-150 whitespace-nowrap shadow-[0_10px_30px_rgba(0,0,0,0.6)] backdrop-blur-xl z-50">
                  {community.name}
                </div>
              </div>
            );
          })}

          {/* Add Community Action */}
          <div className="relative group flex items-center justify-center w-full">
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center justify-center w-12 h-12 rounded-[18px] hover:rounded-[16px] bg-white/[0.03] text-[#30D158] hover:bg-[#30D158] hover:text-black border border-[#30D158]/30 hover:border-[#30D158] transition-all duration-200 cursor-pointer shadow-sm hover:scale-105"
              title="Create New Community"
            >
              <Plus className="w-5 h-5 stroke-[2.5] transition-transform group-hover:rotate-90 duration-200" />
            </button>

            <div className="absolute left-[78px] px-3 py-1.5 rounded-xl bg-[#141724]/95 border border-white/[0.12] text-xs font-semibold text-white opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-150 whitespace-nowrap shadow-[0_10px_30px_rgba(0,0,0,0.6)] backdrop-blur-xl z-50">
              Create Community
            </div>
          </div>
        </div>

        {/* Bottom Tool Icons (Docs Hub & Discover) */}
        <div className="w-full flex flex-col items-center space-y-2.5 pt-1 border-t border-white/[0.08]">
          <div className="relative group flex items-center justify-center w-full">
            <button
              onClick={() => setIsDocsOpen(true)}
              className="flex items-center justify-center w-11 h-11 rounded-[16px] bg-white/[0.03] text-[#BF5AF2] hover:bg-[#BF5AF2] hover:text-white border border-[#BF5AF2]/20 hover:border-[#BF5AF2]/50 transition-all duration-200 cursor-pointer shadow-sm hover:scale-105"
              title="User Guide & System Documentation"
            >
              <BookOpen className="w-4 h-4 stroke-[2.2]" />
            </button>

            <div className="absolute left-[78px] px-3 py-1.5 rounded-xl bg-[#141724]/95 border border-white/[0.12] text-xs font-semibold text-white opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-150 whitespace-nowrap shadow-[0_10px_30px_rgba(0,0,0,0.6)] backdrop-blur-xl z-50">
              Documentation Hub
            </div>
          </div>

          <div className="relative group flex items-center justify-center w-full">
            <Link
              href="/discover"
              className="flex items-center justify-center w-11 h-11 rounded-[16px] bg-white/[0.03] text-[#64D2FF] hover:bg-[#64D2FF] hover:text-black border border-[#64D2FF]/20 hover:border-[#64D2FF]/50 transition-all duration-200 cursor-pointer shadow-sm hover:scale-105"
              title="Explore Public Spaces"
            >
              <Compass className="w-4 h-4 stroke-[2.2]" />
            </Link>

            <div className="absolute left-[78px] px-3 py-1.5 rounded-xl bg-[#141724]/95 border border-white/[0.12] text-xs font-semibold text-white opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-150 whitespace-nowrap shadow-[0_10px_30px_rgba(0,0,0,0.6)] backdrop-blur-xl z-50">
              Explore Communities
            </div>
          </div>
        </div>
      </aside>

      <CreateCommunityModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      <InteractiveDocsModal isOpen={isDocsOpen} onClose={() => setIsDocsOpen(false)} />
    </>
  );
};
