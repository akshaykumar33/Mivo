'use client';

import * as React from 'react';
import { CommunitySidebar } from '@/features/communities/CommunitySidebar';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore, MivoThemeId } from '@/stores/themeStore';
import { ThemeSwitcherModal } from '@/features/theme/ThemeSwitcherModal';
import { useRouter } from 'next/navigation';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();
  const { setTheme } = useThemeStore();

  // Load saved visual theme on startup
  React.useEffect(() => {
    const saved = localStorage.getItem('mivo_theme') as MivoThemeId;
    if (saved && ['midnight', 'titanium', 'cyber', 'light-frost', 'solar-warm'].includes(saved)) {
      setTheme(saved);
    }
  }, [setTheme]);

  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="h-screen w-screen bg-[var(--bg-canvas)] flex items-center justify-center">
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
    <div className="h-screen w-screen bg-[var(--bg-canvas)] flex overflow-hidden select-none">
      {/* Leftmost Community Icon Rail */}
      <CommunitySidebar />

      {/* Main Dynamic Workspace Area */}
      <main className="flex-1 flex overflow-hidden relative bg-[var(--bg-canvas)]">
        {children}
      </main>

      {/* Global Visual Theme Engine Modal */}
      <ThemeSwitcherModal />
    </div>
  );
}
