'use client';

import * as React from 'react';
import { useNotificationStore } from '@/stores/notificationStore';
import { MessageSquare, PhoneCall, Video, Ticket, Bell, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

export const NotificationToast: React.FC = () => {
  const router = useRouter();
  const { recentToast, clearToast, markAsRead, setIsCenterOpen } = useNotificationStore();

  React.useEffect(() => {
    if (!recentToast) return;
    const timer = setTimeout(() => {
      clearToast();
    }, 5000);
    return () => clearTimeout(timer);
  }, [recentToast, clearToast]);

  if (!recentToast) return null;

  const getIcon = () => {
    switch (recentToast.type) {
      case 'MESSAGE':
        return <MessageSquare className="w-4 h-4 text-[#0A84FF]" />;
      case 'CALL':
        return <PhoneCall className="w-4 h-4 text-[#30D158]" />;
      case 'MEETING':
        return <Video className="w-4 h-4 text-[#BF5AF2]" />;
      case 'TICKET':
        return <Ticket className="w-4 h-4 text-[#FF9F0A]" />;
      default:
        return <Bell className="w-4 h-4 text-[#64D2FF]" />;
    }
  };

  const handleClick = () => {
    markAsRead(recentToast.id);
    clearToast();

    if (recentToast.type === 'MESSAGE' && recentToast.entityId) {
      router.push(`/conversations?id=${recentToast.entityId}`);
    } else {
      setIsCenterOpen(true);
    }
  };

  return (
    <div className="fixed top-5 right-5 z-[100] max-w-sm w-full animate-slide-down">
      <div
        onClick={handleClick}
        className="flex items-start gap-3 p-3.5 bg-[var(--bg-surface-0)]/90 backdrop-blur-2xl border border-[var(--border-subtle)] hover:border-white/20 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.5)] cursor-pointer transition-all duration-200 group"
      >
        <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
          {getIcon()}
        </div>

        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-center justify-between gap-1 mb-0.5">
            <h4 className="text-xs font-semibold text-[var(--text-primary)] truncate font-display">
              {recentToast.title}
            </h4>
            <span className="text-[10px] text-[var(--text-secondary)]">Just now</span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
            {recentToast.body}
          </p>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            clearToast();
          }}
          className="text-[var(--text-secondary)] hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          title="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
