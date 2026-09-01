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
      <div className="h-screen w-screen bg-[#0B0E14] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-violet-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-slate-400 font-medium font-display">Initializing Mivo...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen w-screen bg-[#0B0E14] overflow-hidden relative">
      {/* Leftmost Community Icon Rail */}
      <CommunitySidebar />

      {/* Main Dynamic Area */}
      <main className="flex-1 flex overflow-hidden">{children}</main>
    </div>
  );
}
