'use client';

import * as React from 'react';
import { CommunitySidebar } from '@/features/communities/CommunitySidebar';
import { ChannelSidebar } from '@/features/channels/ChannelSidebar';
import { useAuthStore } from '@/stores/authStore';
import { useCommunityStore } from '@/stores/communityStore';
import { useThemeStore, MivoThemeId } from '@/stores/themeStore';
import { ThemeSwitcherModal } from '@/features/theme/ThemeSwitcherModal';
import { IncomingCallModal } from '@/features/conversations/IncomingCallModal';
import { ActiveCallOverlay } from '@/features/conversations/ActiveCallOverlay';
import { NotificationCenterModal } from '@/features/notifications/NotificationCenterModal';
import { NotificationToast } from '@/features/notifications/NotificationToast';
import { TicketsModal } from '@/features/tickets/TicketsModal';
import { useConversationStore } from '@/stores/conversationStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { useTicketStore } from '@/stores/ticketStore';
import { useRouter, usePathname } from 'next/navigation';
import { useNavigationStore } from '@/stores/navigationStore';
import { GuestModeBanner, UpgradeGuestModal } from '@/features/auth';
import { AnonymousConnectModal } from '@/features/anonymous';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const { activeCommunity } = useCommunityStore();
  const { setTheme } = useThemeStore();
  const { isMobileSidebarOpen, closeMobileSidebar } = useNavigationStore();
  const { setupRealtimeListeners } = useConversationStore();
  const { setupRealtimeListeners: setupNotificationListeners, fetchUnreadCount } = useNotificationStore();
  const { setupRealtimeListeners: setupTicketListeners } = useTicketStore();

  // Load saved visual theme on startup, defaulting to the new Crimson & Cream palette
  React.useEffect(() => {
    const saved = localStorage.getItem('mivo_theme') as MivoThemeId;
    if (saved && saved !== 'midnight' && ['crimson-cream', 'titanium', 'cyber', 'light-frost', 'solar-warm'].includes(saved)) {
      setTheme(saved);
    } else {
      setTheme('crimson-cream');
    }
  }, [setTheme]);

  React.useEffect(() => {
    if (user?.id) {
      setupRealtimeListeners(user.id);
      fetchUnreadCount();
      const unsubNotifs = setupNotificationListeners();
      const unsubTickets = setupTicketListeners();
      return () => {
        unsubNotifs();
        unsubTickets();
      };
    }
  }, [user?.id, setupRealtimeListeners, setupNotificationListeners, setupTicketListeners, fetchUnreadCount]);

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
    <div className="h-screen w-screen bg-[var(--bg-canvas)] flex flex-col overflow-hidden select-none relative">
      {/* Sticky Guest Mode Restrictions Banner */}
      <GuestModeBanner />

      <div className="flex-1 flex overflow-hidden relative">
        {/* Desktop Leftmost Community Icon Rail */}
        <div className="hidden md:flex h-full flex-shrink-0">
          <CommunitySidebar />
        </div>

        {/* Mobile Slide-Over Overlay Drawer */}
        {isMobileSidebarOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex pointer-events-auto animate-fade-in">
            {/* Glass Backdrop */}
            <div
              onClick={closeMobileSidebar}
              className="fixed inset-0 bg-black/70 backdrop-blur-md transition-opacity"
            />

            {/* Drawer container: Community Rail + Channels List */}
            <div className="relative z-50 flex h-full max-w-[92vw] shadow-2xl animate-slide-right overflow-hidden border-r border-[var(--border-subtle)]">
              <CommunitySidebar onNavigate={closeMobileSidebar} />
              {activeCommunity && !pathname.startsWith('/conversations') && (
                <ChannelSidebar
                  communityId={activeCommunity.id}
                  className="flex w-[230px] sm:w-[270px] h-full bg-[var(--bg-sidebar)] border-r border-[var(--border-subtle)] backdrop-blur-2xl flex-col justify-between select-none flex-shrink-0"
                />
              )}
            </div>
          </div>
        )}

        {/* Main Dynamic Workspace Area */}
        <main className="flex-1 flex overflow-hidden relative bg-[var(--bg-canvas)]">
          {children}
        </main>
      </div>

      {/* Global Realtime Audio Calling & Modals */}
      <IncomingCallModal />
      <ActiveCallOverlay />

      {/* Global Notifications & Support Modals */}
      <NotificationCenterModal />
      <NotificationToast />
      <TicketsModal />

      {/* Global Visual Theme Engine Modal */}
      <ThemeSwitcherModal />

      {/* Global Guest & Anonymous Modals */}
      <UpgradeGuestModal />
      <AnonymousConnectModal />
    </div>
  );
}
