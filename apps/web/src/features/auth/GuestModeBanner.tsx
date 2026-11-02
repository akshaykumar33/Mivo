'use client';

import * as React from 'react';
import { useAuthStore } from '@/stores/authStore';
import { ShieldAlert, Sparkles, UserCheck, MessageSquare, ArrowRight, X } from 'lucide-react';

export const GuestModeBanner: React.FC = () => {
  const { isGuest, guestLimits, setUpgradeModalOpen, setAnonConnectModalOpen } = useAuthStore();
  const [isDismissed, setIsDismissed] = React.useState(false);

  if (!isGuest || isDismissed) return null;

  return (
    <div className="bg-amber-500/10 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 px-3 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between gap-3 text-xs z-30 relative transition-all border-b border-amber-500/20">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-6 h-6 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0 border border-amber-500/30 text-amber-700 dark:text-amber-300">
          <UserCheck className="w-3.5 h-3.5" />
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 min-w-0">
          <span className="font-semibold text-[10px] bg-amber-500/20 text-amber-800 dark:text-amber-200 px-2 py-0.5 rounded-full border border-amber-500/30">
            Guest Account
          </span>
          <span className="font-medium text-amber-950 dark:text-amber-200/90 truncate">
            Limited mode: 2MB uploads & 3s chat rate limit. Session is temporary.
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => setAnonConnectModalOpen(true)}
          className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-900 dark:text-amber-200 font-medium text-[11px] transition-all cursor-pointer border border-amber-500/30"
        >
          <span>Anonymous Connect</span>
        </button>

        <button
          onClick={() => setUpgradeModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-[11px] shadow-xs transition-all cursor-pointer active:scale-[0.98]"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Claim Full Account</span>
        </button>

        <button
          onClick={() => setIsDismissed(true)}
          className="p-1 rounded-lg text-amber-800 dark:text-amber-300 hover:bg-amber-500/20 transition-colors cursor-pointer"
          title="Dismiss banner"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
