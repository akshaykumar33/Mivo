'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input } from '@mivo/ui';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/stores/authStore';
import { AuthSessionResponse } from '@mivo/shared';
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
      router.push('/channels/@me');
    } else {
      setError(res.error?.message || 'Login failed. Please check your credentials.');
    }
  };

  return (
    <div className="w-full max-w-md p-8 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-2xl backdrop-blur-xl">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white font-bold text-xl shadow-lg shadow-violet-600/30 mb-3">
          M
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight font-display">Welcome Back</h1>
        <p className="text-sm text-slate-400 mt-1">Sign in to your Mivo account</p>
      </div>

      {error && (
        <div className="mb-6 p-3.5 rounded-lg bg-rose-950/60 border border-rose-800/80 text-rose-300 text-sm font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
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

        <Button type="submit" className="w-full mt-2" isLoading={isLoading}>
          Sign In
        </Button>
      </form>

      <div className="mt-6 text-center text-xs text-slate-400">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="text-violet-400 hover:text-violet-300 font-semibold hover:underline">
          Create one now
        </Link>
      </div>
    </div>
  );
};
