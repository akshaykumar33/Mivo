'use client';

import * as React from 'react';
import { useCommunityStore } from '@/stores/communityStore';
import { Plus, Compass, MessageSquare, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CreateCommunityModal } from './CreateCommunityModal';
import { InteractiveDocsModal } from '@/features/docs/InteractiveDocsModal';

const COMMUNITY_PALETTES = [
  'from-[#5E5CE6] via-[#0A84FF] to-[#64D2FF]',
  'from-[#BF5AF2] via-[#5E5CE6] to-[#0A84FF]',
  'from-[#30D158] via-[#63E6E2] to-[#0A84FF]',
  'from-[#FF9F0A] via-[#FF375F] to-[#BF5AF2]',
  'from-[#64D2FF] via-[#5E5CE6] to-[#BF5AF2]',
];

export interface CommunitySidebarProps {
  onNavigate?: () => void;
}

export const CommunitySidebar: React.FC<CommunitySidebarProps> = ({ onNavigate }) => {
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
            className={`absolute left-0 w-[4px] rounded-r-full bg-gradient-to-b from-[#5E5CE6] to-[#0A84FF] transition-all duration-300 ${
              isDMsActive ? 'h-8 opacity-100' : 'h-0 opacity-0 group-hover:h-4 group-hover:opacity-80'
            }`}
          />
          <Link
            href="/channels"
            onClick={() => onNavigate?.()}
            className={`flex items-center justify-center w-11 h-11 rounded-[16px] transition-all duration-200 cursor-pointer ${
              isDMsActive
                ? 'bg-gradient-to-br from-[#5E5CE6] to-[#0A84FF] !text-white shadow-[0_6px_20px_rgba(94,92,230,0.45)] border border-white/30 scale-105'
                : 'bg-[var(--bg-surface-1)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)] hover:rounded-[14px] border border-[var(--border-subtle)] hover:scale-105'
            }`}
          >
            <MessageSquare className="w-4 h-4 stroke-[2.2]" />
          </Link>

          {/* Apple Custom Hover Tooltip */}
          <div className="absolute left-[72px] px-3 py-1 rounded-[10px] bg-[var(--bg-surface-0)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-150 whitespace-nowrap shadow-xl backdrop-blur-xl z-50">
            Overview & DMs
          </div>
        </div>

        {/* Apple macOS Glass Divider */}
        <div className="w-7 h-[1px] bg-[var(--border-subtle)] rounded-full my-0.5" />

        {/* Communities App Icons Scroll List */}
        <div className="flex-1 w-full overflow-y-auto overflow-x-hidden flex flex-col items-center space-y-2 py-1 scrollbar-none">
          {communities.map((community, index) => {
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
                  className={`absolute left-0 w-[4px] rounded-r-full bg-gradient-to-b from-[#BF5AF2] to-[#5E5CE6] transition-all duration-300 ${
                    isActive ? 'h-8 opacity-100' : 'h-0 opacity-0 group-hover:h-4 group-hover:opacity-80'
                  }`}
                />
                <Link
                  href={`/communities/${community.id}`}
                  onClick={() => onNavigate?.()}
                  className={`flex items-center justify-center w-11 h-11 rounded-[16px] transition-all duration-200 font-bold text-xs tracking-tight cursor-pointer ${
                    isActive
                      ? `bg-gradient-to-br ${palette} !text-white shadow-[0_6px_20px_rgba(191,90,242,0.4)] border border-white/30 scale-105`
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
              onClick={() => setIsModalOpen(true)}
              className="flex items-center justify-center w-11 h-11 rounded-[16px] hover:rounded-[14px] bg-[var(--bg-surface-1)] text-[#30D158] hover:bg-[#30D158] hover:!text-black border border-[#30D158]/30 hover:border-[#30D158] transition-all duration-200 cursor-pointer shadow-sm hover:scale-105"
            >
              <Plus className="w-4 h-4 stroke-[2.5] transition-transform group-hover:rotate-90 duration-200" />
            </button>

            <div className="absolute left-[72px] px-3 py-1 rounded-[10px] bg-[var(--bg-surface-0)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-150 whitespace-nowrap shadow-xl backdrop-blur-xl z-50">
              Create Community
            </div>
          </div>
        </div>

        {/* Bottom Tool Icons (Docs Hub & Discover) */}
        <div className="w-full flex flex-col items-center space-y-2 pt-2 border-t border-[var(--border-subtle)]">
          <div className="relative group flex items-center justify-center w-full">
            <button
              onClick={() => setIsDocsOpen(true)}
              className="flex items-center justify-center w-10 h-10 rounded-[14px] bg-[var(--bg-surface-1)] text-[#BF5AF2] hover:bg-[#BF5AF2] hover:!text-white border border-[#BF5AF2]/20 hover:border-[#BF5AF2]/50 transition-all duration-200 cursor-pointer shadow-sm hover:scale-105"
            >
              <BookOpen className="w-4 h-4 stroke-[2.2]" />
            </button>

            <div className="absolute left-[72px] px-3 py-1 rounded-[10px] bg-[var(--bg-surface-0)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-150 whitespace-nowrap shadow-xl backdrop-blur-xl z-50">
              Documentation Hub
            </div>
          </div>

          <div className="relative group flex items-center justify-center w-full">
            <Link
              href="/discover"
              className="flex items-center justify-center w-10 h-10 rounded-[14px] bg-[var(--bg-surface-1)] text-[#64D2FF] hover:bg-[#64D2FF] hover:!text-black border border-[#64D2FF]/20 hover:border-[#64D2FF]/50 transition-all duration-200 cursor-pointer shadow-sm hover:scale-105"
            >
              <Compass className="w-4 h-4 stroke-[2.2]" />
            </Link>

            <div className="absolute left-[72px] px-3 py-1 rounded-[10px] bg-[var(--bg-surface-0)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-150 whitespace-nowrap shadow-xl backdrop-blur-xl z-50">
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
