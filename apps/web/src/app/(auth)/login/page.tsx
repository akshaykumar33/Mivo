import { LoginForm } from '@/features/auth/LoginForm';

export default function LoginPage() {
  return (
    <main className="min-h-screen w-full bg-[#06070B] apple-mesh-bg flex items-center justify-center p-4 sm:p-6 overflow-hidden relative select-none">
      {/* Dynamic Background Mesh Spheres */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#5E5CE6]/15 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#BF5AF2]/12 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <LoginForm />
    </main>
  );
}
