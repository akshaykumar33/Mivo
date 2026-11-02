'use client';

import * as React from 'react';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/stores/authStore';
import { AuthSessionResponse } from '@mivo/shared';
import { X, Sparkles, ShieldCheck, Mail, Lock, User, ArrowRight, AlertCircle, CheckCircle2, Check } from 'lucide-react';

export const UpgradeGuestModal: React.FC = () => {
  const { user, upgradeModalOpen, setUpgradeModalOpen, setAuth } = useAuthStore();

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [username, setUsername] = React.useState('');
  const [displayName, setDisplayName] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
      if (user.username && !user.username.startsWith('guest_')) {
        setUsername(user.username);
      }
    }
  }, [user]);

  if (!upgradeModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await api.post<AuthSessionResponse>('/api/v1/auth/upgrade', {
        email: email.trim().toLowerCase(),
        password,
        username: username.trim() || undefined,
        displayName: displayName.trim() || undefined,
      });

      setIsLoading(false);

      if (res.success && res.data) {
        setSuccess(true);
        setAuth(res.data.user, res.data.accessToken);
        setTimeout(() => {
          setSuccess(false);
          setUpgradeModalOpen(false);
        }, 1500);
      } else {
        setError(res.error?.message || 'Upgrade failed. Please check your inputs.');
      }
    } catch (err: any) {
      setIsLoading(false);
      setError(err?.message || 'Failed to upgrade account.');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="upgrade-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md animate-fade-in"
    >
      <div className="w-full max-w-md max-h-[92vh] overflow-y-auto bg-[var(--bg-surface-0)] border border-[var(--border-subtle)] rounded-3xl p-5 sm:p-7 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)] relative text-[var(--text-primary)]">
        {/* Close Button */}
        <button
          onClick={() => setUpgradeModalOpen(false)}
          aria-label="Close dialog"
          className="absolute top-4 right-4 p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)] transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-2xl bg-[var(--brand-primary,#dc2626)]/15 border border-[var(--brand-primary,#dc2626)]/30 flex items-center justify-center text-[var(--brand-primary,#dc2626)] shadow-sm">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 id="upgrade-modal-title" className="text-lg font-bold text-[var(--text-primary)] font-display tracking-tight">
              Claim Your Full Account
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Unlock permanent access, 100MB file uploads, and organization ownership.
            </p>
          </div>
        </div>

        {success ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[var(--text-primary)] font-display">Account Upgraded!</h3>
            <p className="text-xs text-[var(--text-secondary)]">
              Welcome to permanent membership! All your rooms, chats, and connections have been preserved.
            </p>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-[var(--bg-surface-1)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--brand-primary,#dc2626)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary,#dc2626)]/20 shadow-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Set Password *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-[var(--bg-surface-1)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--brand-primary,#dc2626)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary,#dc2626)]/20 shadow-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your Name"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--bg-surface-1)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--brand-primary,#dc2626)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary,#dc2626)]/20 shadow-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. alexr"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--bg-surface-1)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--brand-primary,#dc2626)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary,#dc2626)]/20 shadow-xs"
                  />
                </div>
              </div>

              {/* What You Unlock Feature Highlights */}
              <div className="p-3.5 rounded-2xl bg-[var(--bg-surface-1)] border border-[var(--border-subtle)] text-[11px] text-[var(--text-secondary)] space-y-2 mt-2">
                <div className="font-semibold text-[var(--text-primary)] text-xs flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[var(--brand-primary,#dc2626)]" />
                  What you unlock:
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500 stroke-[2.5] shrink-0" />
                  <span>100MB high-speed file and media uploads</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500 stroke-[2.5] shrink-0" />
                  <span>Create and govern unlimited communities & channels</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500 stroke-[2.5] shrink-0" />
                  <span>No message cooldowns and persistent chat history</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 rounded-xl bg-[var(--brand-primary,#dc2626)] hover:brightness-105 active:scale-[0.985] text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] transition-all cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Complete Account Upgrade</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
