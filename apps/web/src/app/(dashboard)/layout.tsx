'use client';

import * as React from 'react';
import { CommunitySidebar } from '@/features/communities/CommunitySidebar';
import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'next/navigation';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();

  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="h-screen w-screen bg-[#030408] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-[#5E5CE6] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-white/50 font-medium font-display">Initializing Mivo OS...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="h-screen w-screen bg-[#030408] p-1.5 sm:p-2.5 flex items-center justify-center overflow-hidden relative select-none">
      {/* Cosmic Deep Space Ambient Nebula Glows */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#5E5CE6]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-[#0A84FF]/12 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/3 -translate-y-1/2 w-80 h-80 bg-[#BF5AF2]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Apple Vision Pro / macOS Sequoia Floating Glass Chassis */}
      <div className="relative w-full h-full rounded-[24px] sm:rounded-[30px] bg-[#07080E]/90 border border-white/[0.12] backdrop-blur-3xl shadow-[0_20px_80px_rgba(0,0,0,0.85),_0_0_60px_rgba(94,92,230,0.18)] ring-1 ring-white/[0.08] flex overflow-hidden">
        {/* Top Specular Line Highlight along Chassis Perimeter */}
        <div className="absolute inset-x-12 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none z-50" />

        {/* Leftmost Community Icon Rail with macOS traffic controls */}
        <CommunitySidebar />

        {/* Main Dynamic Workspace Area */}
        <main className="flex-1 flex overflow-hidden relative bg-[#07090F]/90">
          {children}
        </main>
      </div>
    </div>
  );
}
