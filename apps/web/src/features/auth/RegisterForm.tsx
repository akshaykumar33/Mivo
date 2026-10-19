'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input } from '@mivo/ui';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/stores/authStore';
import { AuthSessionResponse } from '@mivo/shared';
import Link from 'next/link';

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
      router.push('/channels/@me');
    } else {
      setError(res.error?.message || 'Registration failed. Please try again.');
    }
  };

  return (
    <div className="w-full max-w-md p-6 sm:p-8 rounded-[28px] bg-[var(--bg-surface-0)] border border-[var(--border-subtle)] shadow-[0_20px_60px_rgba(220,38,38,0.08)] relative overflow-hidden text-[#111827]">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#DC2626] to-[#991B1B] text-white font-extrabold text-xl shadow-[0_8px_24px_rgba(220,38,38,0.35)] mb-3 border border-white/40">
          M
        </div>
        <h1 className="text-2xl font-extrabold text-[#111827] tracking-tight font-display">Create an Account</h1>
        <p className="text-xs sm:text-sm text-[#71717A] mt-1 font-medium">Join the next-gen communication platform</p>
      </div>

      {error && (
        <div className="mb-6 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
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

        <Button type="submit" className="w-full mt-2" isLoading={isLoading}>
          Create Account
        </Button>
      </form>

      <div className="mt-6 text-center text-xs text-[#71717A]">
        Already have an account?{' '}
        <Link href="/login" className="text-red-600 hover:text-red-700 font-bold hover:underline">
          Log in
        </Link>
      </div>
    </div>
  );
};
