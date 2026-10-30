'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input } from '@mivo/ui';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/stores/authStore';
import { AuthSessionResponse } from '@mivo/shared';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Palette,
  Cpu,
  Radio,
  Lock,
  Mail,
  CheckCircle2,
  AlertCircle,
  Crown,
} from 'lucide-react';
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
    <div className="w-full max-w-lg p-6 sm:p-8 rounded-2xl bg-[var(--bg-surface-0)] border border-[var(--border-subtle)] shadow-xl relative overflow-hidden text-[var(--text-primary)]">
      {/* Brand Header */}
      <div className="text-center mb-7 relative z-10">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#DC2626] text-white font-extrabold text-xl shadow-[0_2px_8px_rgba(220,38,38,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] mb-3 border border-red-500/40 font-display">
          M
        </div>
        <h1 className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight font-display">
          Welcome back to Mivo
        </h1>
        <p className="text-xs text-[var(--text-secondary)] mt-1 font-medium">
          Enter your credentials or choose a pre-configured team profile
        </p>
      </div>

      {error && (
        <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs font-semibold flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Credentials Form */}
      <form onSubmit={handleSubmit} className="space-y-3.5 relative z-10">
        <div>
          <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5 ml-0.5">
            Email Address
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--bg-surface-1)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder-[var(--text-muted)] text-sm focus:outline-none focus:border-red-500 focus:bg-[var(--bg-surface-0)] focus:ring-2 focus:ring-red-500/20 transition-all font-medium"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5 ml-0.5">
            Password
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--bg-surface-1)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder-[var(--text-muted)] text-sm focus:outline-none focus:border-red-500 focus:bg-[var(--bg-surface-0)] focus:ring-2 focus:ring-red-500/20 transition-all font-medium"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full mt-2 h-11 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] active:bg-[#991B1B] text-white font-semibold text-sm shadow-[0_1px_2px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.18)] border border-red-700/60 transition-all duration-150 cursor-pointer flex items-center justify-center gap-2 active:scale-[0.985]"
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <span>Sign in to Workspace</span>
              <ArrowRight className="w-4 h-4 stroke-[2.2]" />
            </>
          )}
        </button>
      </form>

      {/* Instant Guest Access Card */}
      <div className="mt-4 relative z-10">
        <GuestLoginCard />
      </div>

      {/* 1-Click Demo Profiles */}
      <div className="mt-5 pt-4 border-t border-[var(--border-subtle)] relative z-10">
        <div className="flex items-center justify-between text-xs font-medium text-[var(--text-secondary)] mb-3">
          <span className="flex items-center gap-1.5 text-[var(--brand-primary,#dc2626)] font-semibold">
            <span>Demo Team Profiles</span>
          </span>
          <span className="text-[10px] text-[var(--text-muted)] font-mono bg-[var(--bg-surface-1)] border border-[var(--border-subtle)] px-2 py-0.5 rounded font-medium">
            Password123!
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleQuickLogin('dev@mivo.app', 'Dev Admin')}
            className="p-2.5 rounded-xl bg-[var(--bg-surface-1)] hover:bg-[var(--bg-surface-2)] border border-[var(--border-subtle)] hover:border-red-500/30 text-left transition-all duration-150 group cursor-pointer shadow-2xs"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-red-600 flex items-center justify-center text-white shadow-xs flex-shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-[var(--text-primary)] truncate group-hover:text-red-600 transition-colors">
                  Dev Admin
                </div>
                <div className="text-[10px] text-[var(--text-muted)] truncate flex items-center gap-1">
                  <span>Owner</span>
                </div>
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleQuickLogin('alex@mivo.app', 'Alex Rivera')}
            className="p-2.5 rounded-xl bg-[var(--bg-surface-1)] hover:bg-[var(--bg-surface-2)] border border-[var(--border-subtle)] hover:border-purple-500/30 text-left transition-all duration-150 group cursor-pointer shadow-2xs"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-purple-600 flex items-center justify-center text-white shadow-xs flex-shrink-0">
                <Palette className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-[var(--text-primary)] truncate group-hover:text-purple-600 transition-colors">
                  Alex Rivera
                </div>
                <div className="text-[10px] text-[var(--text-muted)] truncate flex items-center gap-1">
                  <span>Product Designer</span>
                </div>
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleQuickLogin('carlos@mivo.app', 'Carlos Mendoza')}
            className="p-2.5 rounded-xl bg-[var(--bg-surface-1)] hover:bg-[var(--bg-surface-2)] border border-[var(--border-subtle)] hover:border-amber-500/30 text-left transition-all duration-150 group cursor-pointer shadow-2xs"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-amber-600 flex items-center justify-center text-white shadow-xs flex-shrink-0">
                <Cpu className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-[var(--text-primary)] truncate group-hover:text-amber-600 transition-colors">
                  Carlos Mendoza
                </div>
                <div className="text-[10px] text-[var(--text-muted)] truncate">
                  Frontend Lead
                </div>
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleQuickLogin('priya@mivo.app', 'Priya Sharma')}
            className="p-2.5 rounded-xl bg-[var(--bg-surface-1)] hover:bg-[var(--bg-surface-2)] border border-[var(--border-subtle)] hover:border-cyan-500/30 text-left transition-all duration-150 group cursor-pointer shadow-2xs"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-cyan-600 flex items-center justify-center text-white shadow-xs flex-shrink-0">
                <Radio className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-[var(--text-primary)] truncate group-hover:text-cyan-600 transition-colors">
                  Priya Sharma
                </div>
                <div className="text-[10px] text-[var(--text-muted)] truncate">
                  Cloud Architect
                </div>
              </div>
            </div>
          </button>
        </div>
      </div>

      <div className="mt-6 text-center text-xs text-[var(--text-secondary)] relative z-10">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="text-red-600 hover:text-red-700 font-semibold hover:underline transition-colors">
          Create an account
        </Link>
      </div>
    </div>
  );
};
