'use client';

import * as React from 'react';
import { useAuthStore } from '@/stores/authStore';
import { ShieldAlert, Sparkles, UserCheck, MessageSquare, ArrowRight, X } from 'lucide-react';

export const GuestModeBanner: React.FC = () => {
  const { isGuest, guestLimits, setUpgradeModalOpen, setAnonConnectModalOpen } = useAuthStore();
  const [isDismissed, setIsDismissed] = React.useState(false);

  if (!isGuest || isDismissed) return null;

  return (
    <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white px-3 sm:px-4 py-2 sm:py-2.5 shadow-md flex items-center justify-between gap-3 text-xs z-30 relative transition-all border-b border-amber-600/30">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-6 h-6 rounded-lg bg-black/20 flex items-center justify-center shrink-0 border border-white/20">
          <UserCheck className="w-3.5 h-3.5" />
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 min-w-0">
          <span className="font-extrabold tracking-wide uppercase text-[10px] bg-black/25 px-2 py-0.5 rounded-full border border-white/20">
            Guest Account
          </span>
          <span className="font-medium text-white/95 truncate">
            Limited mode: 2MB uploads & 3s chat rate limit. Session is temporary.
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => setAnonConnectModalOpen(true)}
          className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-black/25 hover:bg-black/40 text-white font-semibold text-[11px] transition-all cursor-pointer border border-white/25 hover:border-white/40"
        >
          <span>Anonymous Connect</span>
        </button>

        <button
          onClick={() => setUpgradeModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white text-amber-900 hover:bg-amber-50 font-bold text-[11px] shadow-sm hover:shadow transition-all cursor-pointer hover:scale-105 active:scale-95"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
          <span>Claim Full Account</span>
        </button>

        <button
          onClick={() => setIsDismissed(true)}
          className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-black/20 transition-colors cursor-pointer"
          title="Dismiss banner"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
