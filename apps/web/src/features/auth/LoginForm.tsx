'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input } from '@mivo/ui';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/stores/authStore';
import { AuthSessionResponse } from '@mivo/shared';
import { Sparkles, ArrowRight, ShieldCheck, Palette, Cpu, Radio, Lock, Mail, CheckCircle2, AlertCircle, Crown } from 'lucide-react';
import Link from 'next/link';

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
      router.push('/channels');
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
      router.push('/channels');
    } else {
      setError(res.error?.message || 'Login failed.');
      setActiveProfile(null);
    }
  };

  return (
    <div className="w-full max-w-xl p-5 sm:p-8 md:p-10 rounded-3xl sm:rounded-[32px] bg-[#0A0D15]/90 border border-white/[0.14] shadow-[0_24px_80px_rgba(0,0,0,0.8)] backdrop-blur-3xl relative overflow-hidden text-white">
      {/* Apple Aurora Radial Orbs */}
      <div className="absolute -top-32 -left-32 w-72 h-72 bg-gradient-to-tr from-[#5E5CE6]/30 to-[#0A84FF]/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-72 h-72 bg-gradient-to-bl from-[#BF5AF2]/25 to-[#FF375F]/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent" />

      {/* Brand Header */}
      <div className="text-center mb-8 relative z-10">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-[22px] bg-gradient-to-tr from-[#5E5CE6] via-[#0A84FF] to-[#64D2FF] text-white font-extrabold text-2xl shadow-[0_8px_32px_rgba(94,92,230,0.4)] mb-4 border border-white/30 hover:scale-105 transition-transform duration-300">
          M
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight font-display">
          Welcome to Mivo
        </h1>
        <p className="text-xs sm:text-sm text-white/50 mt-1.5 font-medium">
          Unified Real-Time Video, Voice & AI Collaboration OS
        </p>
      </div>

      {error && (
        <div className="mb-6 p-3.5 rounded-2xl bg-rose-950/70 border border-rose-800/80 text-rose-300 text-xs font-semibold flex items-center gap-2.5 animate-shake">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Credentials Form */}
      <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
        <div>
          <label className="block text-xs font-semibold text-white/70 mb-1.5 ml-1">Email Address</label>
          <div className="relative">
            <Mail className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white/[0.04] border border-white/[0.1] text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#5E5CE6] focus:bg-white/[0.08] focus:ring-2 focus:ring-[#5E5CE6]/30 transition-all font-medium"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-white/70 mb-1.5 ml-1">Password</label>
          <div className="relative">
            <Lock className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white/[0.04] border border-white/[0.1] text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#5E5CE6] focus:bg-white/[0.08] focus:ring-2 focus:ring-[#5E5CE6]/30 transition-all font-medium"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full mt-2 h-12 rounded-2xl bg-gradient-to-r from-[#5E5CE6] to-[#0A84FF] hover:from-[#4E4CD6] hover:to-[#0074E0] text-white font-bold text-sm shadow-[0_8px_24px_rgba(94,92,230,0.35)] border border-white/20 transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]"
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

      {/* 1-Click Demo Profiles */}
      <div className="mt-8 pt-6 border-t border-white/[0.08] relative z-10">
        <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-white/40 mb-3.5">
          <span className="flex items-center gap-1.5 text-[#64D2FF]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Instant 1-Click Profiles</span>
          </span>
          <span className="text-[10px] text-white/40 font-mono">Password123!</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
          <button
            type="button"
            onClick={() => handleQuickLogin('dev@mivo.app', 'Dev Admin')}
            className="p-3 rounded-2xl bg-white/[0.03] hover:bg-rose-500/15 border border-white/[0.08] hover:border-rose-500/50 text-left transition-all duration-200 group cursor-pointer relative overflow-hidden"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-600 to-orange-500 flex items-center justify-center text-white shadow-md flex-shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-white truncate group-hover:text-rose-200">Dev Admin</div>
                <div className="text-[10px] text-rose-400 font-semibold truncate flex items-center gap-1">
                  <Crown className="w-3 h-3 text-amber-400 inline shrink-0" />
                  <span>Community Owner</span>
                </div>
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleQuickLogin('alex@mivo.app', 'Alex Rivera')}
            className="p-3 rounded-2xl bg-white/[0.03] hover:bg-violet-500/15 border border-white/[0.08] hover:border-violet-500/50 text-left transition-all duration-200 group cursor-pointer relative overflow-hidden"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#BF5AF2] to-[#5E5CE6] flex items-center justify-center text-white shadow-md flex-shrink-0">
                <Palette className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-white truncate group-hover:text-violet-200">Alex Rivera</div>
                <div className="text-[10px] text-violet-400 font-semibold truncate flex items-center gap-1">
                  <Palette className="w-3 h-3 text-violet-400 inline shrink-0" />
                  <span>Staff Designer</span>
                </div>
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleQuickLogin('carlos@mivo.app', 'Carlos Mendoza')}
            className="p-3 rounded-2xl bg-white/[0.03] hover:bg-amber-500/15 border border-white/[0.08] hover:border-amber-500/50 text-left transition-all duration-200 group cursor-pointer relative overflow-hidden"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-xs font-mono font-bold text-amber-400 flex-shrink-0">
                ES
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-white truncate group-hover:text-amber-200">Carlos Mendoza</div>
                <div className="text-[10px] text-amber-400 font-semibold truncate">Frontend Lead</div>
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleQuickLogin('priya@mivo.app', 'Priya Sharma')}
            className="p-3 rounded-2xl bg-white/[0.03] hover:bg-indigo-500/15 border border-white/[0.08] hover:border-indigo-500/50 text-left transition-all duration-200 group cursor-pointer relative overflow-hidden"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-xs font-mono font-bold text-indigo-400 flex-shrink-0">
                IN
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-white truncate group-hover:text-indigo-200">Priya Sharma</div>
                <div className="text-[10px] text-indigo-400 font-semibold truncate">Cloud Architect</div>
              </div>
            </div>
          </button>
        </div>
      </div>

      <div className="mt-7 text-center text-xs text-white/50 relative z-10">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="text-[#64D2FF] hover:text-white font-semibold hover:underline transition-colors">
          Create one now
        </Link>
      </div>
    </div>
  );
};
