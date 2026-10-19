'use client';

import * as React from 'react';
import { useNotificationStore } from '@/stores/notificationStore';
import { Bell } from 'lucide-react';

interface NotificationBellProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  className = '',
  size = 'md',
}) => {
  const { unreadCount, setIsCenterOpen } = useNotificationStore();

  const sizeClasses = {
    sm: 'w-8 h-8 rounded-xl',
    md: 'w-10 h-10 rounded-[14px]',
    lg: 'w-11 h-11 rounded-[16px]',
  };

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-4.5 h-4.5',
  };

  return (
    <div className="relative group flex items-center justify-center">
      <button
        onClick={() => setIsCenterOpen(true)}
        className={`relative flex items-center justify-center bg-[var(--bg-surface-1)] text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-surface-2)] border border-[var(--border-subtle)] hover:border-white/20 transition-all duration-200 cursor-pointer shadow-sm hover:scale-105 ${sizeClasses[size]} ${className}`}
        aria-label="Open notifications center"
      >
        <Bell className={`${iconSizes[size]} stroke-[2.2] transition-transform group-hover:rotate-12 duration-200`} />

        {/* Unread Glow & Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-[#FF453A] text-white text-[9px] font-bold shadow-[0_0_10px_rgba(255,69,58,0.7)] animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Tooltip */}
      <div className="absolute left-[72px] px-3 py-1 rounded-[10px] bg-[var(--bg-surface-0)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-150 whitespace-nowrap shadow-xl backdrop-blur-xl z-50">
        Notifications {unreadCount > 0 ? `(${unreadCount} unread)` : ''}
      </div>
    </div>
  );
};
