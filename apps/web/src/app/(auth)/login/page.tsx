import { LoginForm } from '@/features/auth/LoginForm';

export default function LoginPage() {
  return (
    <main className="min-h-screen w-full bg-[var(--bg-canvas)] flex items-center justify-center p-4 sm:p-6 overflow-hidden relative select-none">
      {/* Radiant Velvet Crimson & Warm Amber Ambient Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute -top-24 -right-24 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <LoginForm />
    </main>
  );
}

