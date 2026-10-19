'use client';

import * as React from 'react';
import { useNotificationStore, NotificationFilter } from '@/stores/notificationStore';
import { useTicketStore } from '@/stores/ticketStore';
import {
  Bell,
  MessageSquare,
  PhoneCall,
  Video,
  Ticket,
  CheckCheck,
  Check,
  X,
  ExternalLink,
  PlusCircle,
  Inbox,
  Filter,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export const NotificationCenterModal: React.FC = () => {
  const router = useRouter();
  const {
    isCenterOpen,
    setIsCenterOpen,
    notifications,
    filter,
    setFilter,
    markAsRead,
    markAllAsRead,
    isLoading,
    fetchNotifications,
  } = useNotificationStore();

  const { setIsModalOpen: setIsTicketModalOpen } = useTicketStore();

  React.useEffect(() => {
    if (isCenterOpen) {
      fetchNotifications();
    }
  }, [isCenterOpen, fetchNotifications]);

  if (!isCenterOpen) return null;

  const safeList = Array.isArray(notifications) ? notifications : [];

  const filteredNotifications = safeList.filter((n) => {
    if (filter === 'ALL') return true;
    return n.type === filter;
  });

  const counts: Record<string, number> = {
    ALL: safeList.filter((n) => !n.isRead).length,
    MESSAGE: safeList.filter((n) => !n.isRead && n.type === 'MESSAGE').length,
    CALL: safeList.filter((n) => !n.isRead && n.type === 'CALL').length,
    MEETING: safeList.filter((n) => !n.isRead && n.type === 'MEETING').length,
    TICKET: safeList.filter((n) => !n.isRead && n.type === 'TICKET').length,
  };

  const getCategoryIcon = (type: string) => {
    switch (type) {
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

  const getCategoryBg = (type: string) => {
    switch (type) {
      case 'MESSAGE':
        return 'bg-[#0A84FF]/10 border-[#0A84FF]/25';
      case 'CALL':
        return 'bg-[#30D158]/10 border-[#30D158]/25';
      case 'MEETING':
        return 'bg-[#BF5AF2]/10 border-[#BF5AF2]/25';
      case 'TICKET':
        return 'bg-[#FF9F0A]/10 border-[#FF9F0A]/25';
      default:
        return 'bg-[#64D2FF]/10 border-[#64D2FF]/25';
    }
  };

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
      if (diffSec < 60) return 'Just now';
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
      return `${Math.floor(diffSec / 86400)}d ago`;
    } catch {
      return '';
    }
  };

  const handleAction = (n: typeof notifications[0]) => {
    markAsRead(n.id);
    setIsCenterOpen(false);

    if (n.type === 'MESSAGE' && n.entityId) {
      router.push(`/conversations?id=${n.entityId}`);
    } else if (n.type === 'CALL' && n.entityId) {
      router.push(`/conversations?id=${n.entityId}`);
    } else if (n.type === 'MEETING') {
      const data = n.data as any;
      if (data?.joinUrl) {
        window.open(data.joinUrl, '_blank');
      } else if (n.entityId) {
        router.push(`/conversations?id=${n.entityId}`);
      }
    } else if (n.type === 'TICKET') {
      setIsTicketModalOpen(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-fade-in select-none">
      {/* Backdrop */}
      <div
        onClick={() => setIsCenterOpen(false)}
        className="fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity"
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-xl max-h-[85vh] bg-[var(--bg-surface-0)] border border-[var(--border-subtle)] rounded-3xl shadow-[0_24px_80px_rgba(0,0,0,0.6)] backdrop-blur-2xl flex flex-col overflow-hidden z-10 animate-scale-up">
        {/* Top Header */}
        <div className="px-6 py-5 border-b border-[var(--border-subtle)] flex items-center justify-between flex-shrink-0 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#5E5CE6] to-[#0A84FF] flex items-center justify-center shadow-[0_4px_16px_rgba(94,92,230,0.4)]">
              <Bell className="w-5 h-5 text-white stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)] font-display tracking-tight flex items-center gap-2">
                Notifications Hub
                {counts.ALL > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#FF453A]/20 text-[#FF453A] border border-[#FF453A]/30">
                    {counts.ALL} unread
                  </span>
                )}
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                Real-time updates for messages, calls, meetings, & tickets
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {counts.ALL > 0 && (
              <button
                onClick={() => markAllAsRead()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-[var(--text-secondary)] hover:text-white border border-white/10 transition-colors"
                title="Mark all as read"
              >
                <CheckCheck className="w-3.5 h-3.5 text-[#30D158]" />
                <span className="hidden sm:inline">Mark all read</span>
              </button>
            )}
            <button
              onClick={() => setIsCenterOpen(false)}
              className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-[var(--text-secondary)] hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="px-6 py-2.5 border-b border-[var(--border-subtle)] flex items-center gap-1.5 overflow-x-auto scrollbar-none flex-shrink-0 bg-white/[0.01]">
          {[
            { id: 'ALL' as NotificationFilter, label: 'All', icon: Inbox },
            { id: 'MESSAGE' as NotificationFilter, label: 'Messages', icon: MessageSquare },
            { id: 'CALL' as NotificationFilter, label: 'Calls', icon: PhoneCall },
            { id: 'MEETING' as NotificationFilter, label: 'Meetings', icon: Video },
            { id: 'TICKET' as NotificationFilter, label: 'Tickets', icon: Ticket },
          ].map((tab) => {
            const Icon = tab.icon;
            const count = counts[tab.id] || 0;
            const active = filter === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer ${
                  active
                    ? 'bg-gradient-to-r from-[#5E5CE6] to-[#0A84FF] text-white shadow-md'
                    : 'bg-white/5 hover:bg-white/10 text-[var(--text-secondary)] hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5 stroke-[2.2]" />
                <span>{tab.label}</span>
                {count > 0 && (
                  <span
                    className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      active ? 'bg-white/30 text-white' : 'bg-[#FF453A]/25 text-[#FF453A]'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}

          <div className="ml-auto pl-2">
            <button
              onClick={() => {
                setIsCenterOpen(false);
                setIsTicketModalOpen(true);
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#FF9F0A]/10 hover:bg-[#FF9F0A]/20 text-[#FF9F0A] border border-[#FF9F0A]/25 text-xs font-semibold transition-colors cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Ticket</span>
            </button>
          </div>
        </div>

        {/* Notifications Scroll List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 scrollbar-thin">
          {isLoading && notifications.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-2 border-[#5E5CE6] border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-[var(--text-secondary)]">Loading notifications...</span>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-center px-4">
              <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-3">
                <Inbox className="w-7 h-7 text-[var(--text-secondary)]/50" />
              </div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">
                No notifications found
              </h3>
              <p className="text-xs text-[var(--text-secondary)] max-w-xs">
                {filter === 'ALL'
                  ? "You're all caught up! When messages, calls, meetings, or tickets happen, you'll see them right here."
                  : `No ${filter.toLowerCase()} notifications at this time.`}
              </p>
            </div>
          ) : (
            filteredNotifications.map((n) => {
              const bgClass = getCategoryBg(n.type);
              const icon = getCategoryIcon(n.type);

              return (
                <div
                  key={n.id}
                  onClick={() => handleAction(n)}
                  className={`group relative p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer flex items-start gap-3.5 ${
                    n.isRead
                      ? 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/15'
                      : 'bg-gradient-to-r from-white/[0.07] to-white/[0.03] border-white/15 shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:border-white/30'
                  }`}
                >
                  {/* Category Icon Badge */}
                  <div
                    className={`w-9 h-9 rounded-xl border flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform ${bgClass}`}
                  >
                    {icon}
                  </div>

                  {/* Body Content */}
                  <div className="flex-1 min-w-0 pr-1">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-bold text-[var(--text-primary)] truncate font-display">
                          {n.title}
                        </span>
                        {!n.isRead && (
                          <span className="w-2 h-2 rounded-full bg-[#0A84FF] shadow-[0_0_8px_#0A84FF] flex-shrink-0" />
                        )}
                      </div>
                      <span className="text-[10px] text-[var(--text-secondary)] flex-shrink-0">
                        {formatTime(n.createdAt)}
                      </span>
                    </div>

                    <p className="text-xs text-[var(--text-secondary)] line-clamp-2 leading-relaxed mb-1.5">
                      {n.body}
                    </p>

                    <div className="flex items-center gap-2 pt-1 text-[11px] font-semibold text-[var(--text-primary)]/70 group-hover:text-[var(--text-primary)]">
                      <span className="flex items-center gap-1 text-[#0A84FF]">
                        View details <ExternalLink className="w-3 h-3" />
                      </span>
                    </div>
                  </div>

                  {/* Quick Action: Mark Read */}
                  {!n.isRead && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        markAsRead(n.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-white/10 hover:bg-[#30D158] hover:text-black text-[var(--text-secondary)] transition-all flex-shrink-0"
                      title="Mark as read"
                    >
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-[var(--border-subtle)] bg-white/[0.01] flex items-center justify-between text-xs text-[var(--text-secondary)] flex-shrink-0">
          <span>Realtime event sync active</span>
          <button
            onClick={() => setIsCenterOpen(false)}
            className="px-4 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
