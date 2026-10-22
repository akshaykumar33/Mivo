'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input } from '@mivo/ui';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/stores/authStore';
import { AuthSessionResponse } from '@mivo/shared';
import { Sparkles, ArrowRight, ShieldCheck, Palette, Cpu, Radio, Lock, Mail, CheckCircle2, AlertCircle, Crown } from 'lucide-react';
import Link from 'next/link';
import { GuestLoginCard } from './GuestLoginCard';

export const LoginForm: React.FC = () => {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [activeProfile, setActiveProfile] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const res = await api.post<AuthSessionResponse>('/api/v1/auth/login', {
      email,
      password,
    });

    setIsLoading(false);

    if (res.success && res.data) {
      setAuth(res.data.user, res.data.accessToken);
      const params = new URLSearchParams(window.location.search);
      const redirect = params.get('redirect') || '/channels';
      router.push(redirect);
    } else {
      setError(res.error?.message || 'Login failed. Please check your credentials.');
    }
  };

  const handleQuickLogin = async (demoEmail: string, profileName: string) => {
    setActiveProfile(profileName);
    setEmail(demoEmail);
    setPassword('Password123!');
    setError(null);
    setIsLoading(true);

    const res = await api.post<AuthSessionResponse>('/api/v1/auth/login', {
      email: demoEmail,
      password: 'Password123!',
    });

    setIsLoading(false);

    if (res.success && res.data) {
      setAuth(res.data.user, res.data.accessToken);
      const params = new URLSearchParams(window.location.search);
      const redirect = params.get('redirect') || '/channels';
      router.push(redirect);
    } else {
      setError(res.error?.message || 'Login failed.');
      setActiveProfile(null);
    }
  };

  return (
    <div className="w-full max-w-xl p-6 sm:p-8 md:p-10 rounded-[28px] bg-[var(--bg-surface-0)] border border-[var(--border-subtle)] shadow-[0_20px_60px_rgba(220,38,38,0.08)] relative overflow-hidden text-[#111827]">
      {/* Radiant Velvet Ambient Glows */}
      <div className="absolute -top-32 -left-32 w-72 h-72 bg-gradient-to-tr from-red-500/10 to-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-72 h-72 bg-gradient-to-bl from-rose-500/10 to-red-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-red-500/40 to-transparent" />

      {/* Brand Header */}
      <div className="text-center mb-8 relative z-10">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-[22px] bg-gradient-to-tr from-[#DC2626] to-[#991B1B] text-white font-extrabold text-2xl shadow-[0_8px_24px_rgba(220,38,38,0.35)] mb-4 border border-white/40 hover:scale-105 transition-transform duration-300 font-display">
          M
        </div>
        <h1 className="text-3xl font-extrabold text-[#111827] tracking-tight font-display">
          Welcome to Mivo
        </h1>
        <p className="text-xs sm:text-sm text-[#71717A] mt-1.5 font-medium">
          Unified Real-Time Video, Voice & AI Collaboration OS
        </p>
      </div>

      {error && (
        <div className="mb-6 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2.5 animate-shake">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Credentials Form */}
      <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
        <div>
          <label className="block text-xs font-semibold text-[#111827] mb-1.5 ml-1">Email Address</label>
          <div className="relative">
            <Mail className="w-4 h-4 text-[#71717A] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-[var(--bg-surface-1)] border border-[var(--border-subtle)] text-[#111827] placeholder-[#71717A]/60 text-sm focus:outline-none focus:border-red-500 focus:bg-[var(--bg-surface-0)] focus:ring-2 focus:ring-red-500/20 transition-all font-medium"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#111827] mb-1.5 ml-1">Password</label>
          <div className="relative">
            <Lock className="w-4 h-4 text-[#71717A] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-[var(--bg-surface-1)] border border-[var(--border-subtle)] text-[#111827] placeholder-[#71717A]/60 text-sm focus:outline-none focus:border-red-500 focus:bg-[var(--bg-surface-0)] focus:ring-2 focus:ring-red-500/20 transition-all font-medium"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full mt-2 h-12 rounded-xl bg-gradient-to-r from-[#DC2626] to-[#B91C1C] hover:from-[#EF4444] hover:to-[#DC2626] text-white font-bold text-sm shadow-lg shadow-red-600/25 border border-white/20 transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <span>Sign In to Mivo</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </>
          )}
        </button>
      </form>

      {/* Instant Guest Access Card */}
      <div className="mt-5 relative z-10">
        <GuestLoginCard />
      </div>

      {/* 1-Click Demo Profiles */}
      <div className="mt-6 pt-5 border-t border-[var(--border-subtle)] relative z-10">
        <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[#71717A] mb-3.5">
          <span className="flex items-center gap-1.5 text-red-600 font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Instant 1-Click Profiles</span>
          </span>
          <span className="text-[10px] text-[#71717A] font-mono bg-black/[0.04] border border-black/[0.06] px-2 py-0.5 rounded-md font-semibold">Password123!</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
          <button
            type="button"
            onClick={() => handleQuickLogin('dev@mivo.app', 'Dev Admin')}
            className="p-3 rounded-2xl bg-[var(--bg-surface-1)] hover:bg-[var(--bg-surface-2)] border border-[var(--border-subtle)] hover:border-red-500/40 text-left transition-all duration-200 group cursor-pointer relative overflow-hidden shadow-xs hover:shadow-sm"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-red-600 to-rose-700 flex items-center justify-center text-white shadow-sm flex-shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-[#111827] truncate group-hover:text-red-700">Dev Admin</div>
                <div className="text-[10px] text-red-700 font-semibold truncate flex items-center gap-1">
                  <Crown className="w-3 h-3 text-amber-500 inline shrink-0" />
                  <span>Community Owner</span>
                </div>
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleQuickLogin('alex@mivo.app', 'Alex Rivera')}
            className="p-3 rounded-2xl bg-[var(--bg-surface-1)] hover:bg-[var(--bg-surface-2)] border border-[var(--border-subtle)] hover:border-purple-500/40 text-left transition-all duration-200 group cursor-pointer relative overflow-hidden shadow-xs hover:shadow-sm"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-sm flex-shrink-0">
                <Palette className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-[#111827] truncate group-hover:text-purple-700">Alex Rivera</div>
                <div className="text-[10px] text-purple-700 font-semibold truncate flex items-center gap-1">
                  <Palette className="w-3 h-3 text-purple-600 inline shrink-0" />
                  <span>Staff Designer</span>
                </div>
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleQuickLogin('carlos@mivo.app', 'Carlos Mendoza')}
            className="p-3 rounded-2xl bg-[var(--bg-surface-1)] hover:bg-[var(--bg-surface-2)] border border-[var(--border-subtle)] hover:border-amber-500/40 text-left transition-all duration-200 group cursor-pointer relative overflow-hidden shadow-xs hover:shadow-sm"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-xs font-mono font-bold text-amber-700 flex-shrink-0">
                ES
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-[#111827] truncate group-hover:text-amber-800">Carlos Mendoza</div>
                <div className="text-[10px] text-amber-700 font-semibold truncate">Frontend Lead</div>
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleQuickLogin('priya@mivo.app', 'Priya Sharma')}
            className="p-3 rounded-2xl bg-[var(--bg-surface-1)] hover:bg-[var(--bg-surface-2)] border border-[var(--border-subtle)] hover:border-cyan-500/40 text-left transition-all duration-200 group cursor-pointer relative overflow-hidden shadow-xs hover:shadow-sm"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-xs font-mono font-bold text-cyan-700 flex-shrink-0">
                IN
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-[#111827] truncate group-hover:text-cyan-800">Priya Sharma</div>
                <div className="text-[10px] text-cyan-700 font-semibold truncate">Cloud Architect</div>
              </div>
            </div>
          </button>
        </div>
      </div>

      <div className="mt-7 text-center text-xs text-[#71717A] relative z-10">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="text-red-600 hover:text-red-700 font-bold hover:underline transition-colors">
          Create one now
        </Link>
      </div>
    </div>
  );
};
