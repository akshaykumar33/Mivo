'use client';

import * as React from 'react';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/stores/authStore';
import { AuthSessionResponse } from '@mivo/shared';
import { X, Sparkles, ShieldCheck, Mail, Lock, User, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md max-h-[92vh] overflow-y-auto bg-[var(--bg-surface-0)] border border-[var(--border-subtle)] rounded-3xl p-5 sm:p-7 shadow-2xl relative text-[var(--text-primary)]">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-500" />
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={() => setUpgradeModalOpen(false)}
          className="absolute top-4 right-4 p-2 rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center text-white shadow-md">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-[var(--text-primary)] font-display">
              Claim Your Full Account
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Unlock permanent access, 100MB file uploads, and organization ownership.
            </p>
          </div>
        </div>

        {success ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-gray-900">Account Upgraded!</h3>
            <p className="text-xs text-gray-600">
              Welcome to permanent membership! All your rooms, chats, and connections have been preserved.
            </p>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#374151] mb-1">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-gray-50 border border-gray-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/30 text-gray-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#374151] mb-1">
                  Set Password *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-gray-50 border border-gray-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/30 text-gray-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-[#374151] mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your Name"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 border border-gray-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/30 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#374151] mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. alexr"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 border border-gray-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/30 text-gray-900"
                  />
                </div>
              </div>

              {/* What You Unlock Feature Highlights */}
              <div className="p-3 rounded-2xl bg-gradient-to-r from-rose-50 to-amber-50 border border-rose-200/60 text-[11px] text-[var(--text-secondary)] space-y-1 mt-2">
                <div className="font-bold text-[var(--text-primary)] text-xs mb-1 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-rose-600" />
                  What you unlock:
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span>100MB high-speed file and media uploads</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span>Create and govern unlimited communities & channels</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span>No message cooldowns and persistent chat history</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
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
