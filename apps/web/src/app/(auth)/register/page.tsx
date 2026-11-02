import { RegisterForm } from '@/features/auth/RegisterForm';

export default function RegisterPage() {
  return (
    <main className="min-h-screen w-full bg-[var(--bg-canvas)] flex items-center justify-center p-4 sm:p-6 overflow-hidden relative select-none">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--border-subtle)_1px,transparent_1px),linear-gradient(to_bottom,var(--border-subtle)_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-40 pointer-events-none" />
      <RegisterForm />
    </main>
  );
}
