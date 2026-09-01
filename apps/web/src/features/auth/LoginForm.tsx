'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input } from '@mivo/ui';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/stores/authStore';
import { AuthSessionResponse } from '@mivo/shared';
import { Sparkles, ArrowRight, ShieldCheck, Palette, Cpu, Radio } from 'lucide-react';
import Link from 'next/link';

export const LoginForm: React.FC = () => {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

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

  const handleQuickLogin = async (demoEmail: string) => {
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
    }
  };

  return (
    <div className="w-full max-w-md p-8 sm:p-10 rounded-3xl bg-[#0C0E17]/90 border border-white/[0.08] shadow-2xl backdrop-blur-2xl relative overflow-hidden">
      {/* Subtle Ambient Radial Highlight */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-cyan-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="text-center mb-8 relative z-10">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-cyan-500 text-white font-extrabold text-2xl shadow-xl shadow-violet-600/25 mb-4 border border-white/20">
          M
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-display">
          Welcome to Mivo
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1.5 font-medium">
          Unified Real-Time Communication Platform
        </p>
      </div>

      {error && (
        <div className="mb-6 p-3.5 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs font-semibold flex items-center gap-2">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
        <Input
          label="Email Address"
          type="email"
          placeholder="name@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <Input
          label="Password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <Button
          type="submit"
          className="w-full mt-3 h-11 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold shadow-lg shadow-violet-600/25 rounded-xl transition-all"
          isLoading={isLoading}
        >
          Sign In
        </Button>
      </form>

      {/* 1-Click Demo Accounts */}
      <div className="mt-8 pt-6 border-t border-white/[0.06] relative z-10">
        <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">
          <span className="flex items-center gap-1.5 text-violet-400">
            <Sparkles className="w-3.5 h-3.5" />
            <span>1-Click Demo Access</span>
          </span>
          <span className="text-[10px] text-slate-500 lowercase">Password123!</span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => handleQuickLogin('dev@mivo.app')}
            className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-rose-500/10 border border-white/[0.06] hover:border-rose-500/40 text-left transition-all duration-200 group"
          >
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-rose-400 group-hover:scale-110 transition-transform" />
              <div className="min-w-0">
                <div className="text-xs font-semibold text-white truncate">Dev Admin</div>
                <div className="text-[10px] text-rose-400/80 font-medium truncate">Owner / Architect</div>
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleQuickLogin('alex@mivo.app')}
            className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-violet-500/10 border border-white/[0.06] hover:border-violet-500/40 text-left transition-all duration-200 group"
          >
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-violet-400 group-hover:scale-110 transition-transform" />
              <div className="min-w-0">
                <div className="text-xs font-semibold text-white truncate">Alex Rivera</div>
                <div className="text-[10px] text-violet-400/80 font-medium truncate">Staff Designer</div>
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleQuickLogin('sarah@mivo.app')}
            className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-cyan-500/10 border border-white/[0.06] hover:border-cyan-500/40 text-left transition-all duration-200 group"
          >
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
              <div className="min-w-0">
                <div className="text-xs font-semibold text-white truncate">Sarah Connor</div>
                <div className="text-[10px] text-cyan-400/80 font-medium truncate">Principal Backend</div>
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleQuickLogin('elena@mivo.app')}
            className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-emerald-500/10 border border-white/[0.06] hover:border-emerald-500/40 text-left transition-all duration-200 group"
          >
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
              <div className="min-w-0">
                <div className="text-xs font-semibold text-white truncate">Elena Rostova</div>
                <div className="text-[10px] text-emerald-400/80 font-medium truncate">Media Specialist</div>
              </div>
            </div>
          </button>
        </div>
      </div>

      <div className="mt-7 text-center text-xs text-slate-400 relative z-10">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="text-violet-400 hover:text-violet-300 font-semibold hover:underline">
          Create one now
        </Link>
      </div>
    </div>
  );
};
