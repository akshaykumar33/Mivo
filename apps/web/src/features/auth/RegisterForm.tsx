'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input } from '@mivo/ui';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/stores/authStore';
import { AuthSessionResponse } from '@mivo/shared';
import Link from 'next/link';
import { GuestLoginCard } from './GuestLoginCard';

export const RegisterForm: React.FC = () => {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [email, setEmail] = React.useState('');
  const [username, setUsername] = React.useState('');
  const [displayName, setDisplayName] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const res = await api.post<AuthSessionResponse>('/api/v1/auth/register', {
      email,
      username,
      displayName,
      password,
    });

    setIsLoading(false);

    if (res.success && res.data) {
      setAuth(res.data.user, res.data.accessToken);
      const params = new URLSearchParams(window.location.search);
      const redirect = params.get('redirect') || '/channels';
      router.push(redirect);
    } else {
      setError(res.error?.message || 'Registration failed. Please try again.');
    }
  };

  return (
    <div className="w-full max-w-md p-6 sm:p-8 rounded-2xl bg-[var(--bg-surface-0)] border border-[var(--border-subtle)] shadow-xl relative overflow-hidden text-[var(--text-primary)]">
      <div className="text-center mb-7">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#DC2626] text-white font-extrabold text-xl shadow-[0_2px_8px_rgba(220,38,38,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] mb-3 border border-red-500/40 font-display">
          M
        </div>
        <h1 className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight font-display">
          Create an Account
        </h1>
        <p className="text-xs text-[var(--text-secondary)] mt-1 font-medium">
          Create your profile to join rooms and workspaces
        </p>
      </div>

      {error && (
        <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs font-semibold">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3.5">
        <Input
          label="Email Address"
          type="email"
          placeholder="name@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <Input
          label="Username"
          type="text"
          placeholder="johndoe"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />

        <Input
          label="Display Name"
          type="text"
          placeholder="John Doe"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          required
        />

        <Input
          label="Password"
          type="password"
          placeholder="Min. 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <Button type="submit" size="md" className="w-full mt-2 font-semibold" isLoading={isLoading}>
          Create Account
        </Button>
      </form>

      {/* Or Join Instantly as Guest */}
      <div className="mt-5 pt-4 border-t border-[var(--border-subtle)]">
        <GuestLoginCard />
      </div>

      <div className="mt-6 text-center text-xs text-[var(--text-secondary)]">
        Already have an account?{' '}
        <Link href="/login" className="text-red-600 hover:text-red-700 font-semibold hover:underline transition-colors">
          Log in
        </Link>
      </div>
    </div>
  );
};
