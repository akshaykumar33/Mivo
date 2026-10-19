import { RegisterForm } from '@/features/auth/RegisterForm';

export default function RegisterPage() {
  return (
    <main className="min-h-screen w-full bg-[var(--bg-canvas)] flex items-center justify-center p-4 sm:p-6 overflow-hidden relative select-none">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <RegisterForm />
    </main>
  );
}
