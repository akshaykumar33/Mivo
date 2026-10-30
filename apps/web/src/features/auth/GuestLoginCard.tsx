'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/stores/authStore';
import { AuthSessionResponse } from '@mivo/shared';
import { UserCheck, Sparkles, ArrowRight, ShieldAlert, Users, MessageSquare } from 'lucide-react';

interface GuestLoginCardProps {
  onSuccess?: () => void;
}

export const GuestLoginCard: React.FC<GuestLoginCardProps> = ({ onSuccess }) => {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [displayName, setDisplayName] = React.useState('');
  const [isCustomizing, setIsCustomizing] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleGuestLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await api.post<AuthSessionResponse>('/api/v1/auth/guest', {
        displayName: displayName.trim() || undefined,
      });

      setIsLoading(false);

      if (res.success && res.data) {
        setAuth(res.data.user, res.data.accessToken);
        if (onSuccess) {
          onSuccess();
        } else {
          const params = new URLSearchParams(window.location.search);
          const redirect = params.get('redirect') || '/channels';
          router.push(redirect);
        }
      } else {
        setError(res.error?.message || 'Failed to enter as guest. Please try again.');
      }
    } catch (err: any) {
      setIsLoading(false);
      setError(err?.message || 'Guest connection error.');
    }
  };

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent border border-amber-500/25 relative overflow-hidden text-[var(--text-primary)] shadow-sm">
      <div className="flex items-start justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center font-bold text-sm shrink-0 border border-amber-500/30">
            <UserCheck className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-1.5 font-display">
              <span>Instant Guest Access</span>
              <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                Limited
              </span>
            </h3>
            <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
              Jump straight into rooms & connect with anonymous peers without an email.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-3 p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2">
          <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {isCustomizing ? (
        <form onSubmit={handleGuestLogin} className="space-y-2.5 mt-3">
          <div>
            <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
              Guest Nickname (Optional)
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Guest Explorer"
              maxLength={32}
              className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--bg-surface-0)] border border-[var(--border-subtle)] focus:outline-none focus:ring-2 focus:ring-amber-500/40 text-[var(--text-primary)] placeholder-[var(--text-muted)]"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Join as Guest</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => setIsCustomizing(false)}
              className="py-2 px-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleGuestLogin()}
            disabled={isLoading}
            className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow-md hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Continue as Guest</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => setIsCustomizing(true)}
            className="py-2.5 px-3 rounded-xl bg-white hover:bg-amber-50 border border-amber-300/80 text-amber-800 text-xs font-semibold transition-colors cursor-pointer"
            title="Set custom nickname"
          >
            Customize
          </button>
        </div>
      )}

      {/* Guest Mode Restrictions Summary */}
      <div className="mt-3 pt-2.5 border-t border-amber-500/15 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-amber-800/80 font-medium">
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
          2MB File Upload Limit
        </span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
          3s Message Cooldown
        </span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
          Connect with Anonymous Users
        </span>
      </div>
    </div>
  );
};
