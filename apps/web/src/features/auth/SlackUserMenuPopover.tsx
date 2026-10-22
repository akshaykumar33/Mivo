'use client';

import * as React from 'react';
import { useAuthStore } from '@/stores/authStore';
import { usePresenceStore, useUserPresence } from '@/stores/presenceStore';
import { UserStatus } from '@mivo/shared';
import { Avatar } from '@mivo/ui';
import {
  Sparkles,
  Smile,
  X,
  Check,
  Clock,
  Trash2,
  User,
  Palette,
  LogOut,
  BellOff,
  Bell,
  MessageSquare,
  Target,
  Car,
  Palmtree,
  Coffee,
  HeartPulse,
  Laptop,
} from 'lucide-react';

export interface SlackUserMenuPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenFullModal: () => void;
  onOpenEditProfile: () => void;
  onOpenThemeModal?: () => void;
  placement?: 'bottom-left' | 'side-rail' | 'bottom-bar';
}

export const SlackUserMenuPopover: React.FC<SlackUserMenuPopoverProps> = ({
  isOpen,
  onClose,
  onOpenFullModal,
  onOpenEditProfile,
  onOpenThemeModal,
  placement = 'bottom-bar',
}) => {
  const { user, logout, setUpgradeModalOpen, setAnonConnectModalOpen } = useAuthStore();
  const { updateAvailabilityAndStatus } = usePresenceStore();
  const presence = useUserPresence(user?.id, user);
  const popoverRef = React.useRef<HTMLDivElement>(null);

  // Close on click outside or Escape
  React.useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !user) return null;

  const currentStatus = presence.status || 'ONLINE';
  const customStatus = presence.customStatus;
  const isAway = currentStatus === 'IDLE';
  const isDND = currentStatus === 'DND';

  const handleToggleAway = async () => {
    const nextStatus: UserStatus = isAway ? 'ONLINE' : 'IDLE';
    await updateAvailabilityAndStatus(nextStatus, customStatus, presence.customStatusExpiresAt);
  };

  const handleSelectStatus = async (status: UserStatus) => {
    await updateAvailabilityAndStatus(status, customStatus, presence.customStatusExpiresAt);
  };

  const handleClearStatus = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await updateAvailabilityAndStatus(currentStatus, null, null);
  };

  const handleApplyQuickPreset = async (text: string, durationMinutes: number | null) => {
    let expiresAt: string | null = null;
    const now = new Date();
    if (durationMinutes === 30) {
      expiresAt = new Date(now.getTime() + 30 * 60 * 1000).toISOString();
    } else if (durationMinutes === 60) {
      expiresAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
    } else if (durationMinutes === 120) {
      expiresAt = new Date(now.getTime() + 120 * 60 * 1000).toISOString();
    } else if (durationMinutes === -1) {
      expiresAt = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();
    }

    await updateAvailabilityAndStatus(currentStatus, text, expiresAt);
    onClose();
  };

  const handleSetDNDDuration = async (durationMinutes: number) => {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + durationMinutes * 60 * 1000).toISOString();
    await updateAvailabilityAndStatus('DND', customStatus, expiresAt);
  };

  // Compute position styling depending on placement
  const positionClasses =
    placement === 'side-rail'
      ? 'left-[76px] bottom-3'
      : placement === 'bottom-left'
      ? 'left-3 bottom-16'
      : 'left-2 bottom-16 sm:left-3';

  return (
    <div
      ref={popoverRef}
      className={`fixed z-50 w-72 sm:w-80 bg-[var(--bg-surface-0)] border border-[var(--border-subtle)] rounded-2xl p-3 shadow-2xl backdrop-blur-2xl animate-fade-in ring-1 ring-black/5 select-none ${positionClasses}`}
      style={{
        boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.25), 0 0 0 1px var(--border-subtle)',
      }}
    >
      {/* 1. User Profile Header */}
      <div className="flex items-center gap-3 p-2 rounded-xl bg-[var(--bg-surface-1)] border border-[var(--border-subtle)] mb-2">
        <div className="relative shrink-0">
          <Avatar
            size="md"
            status={currentStatus}
            fallbackText={user.displayName || user.username}
            src={user.avatarUrl}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-bold text-[#111827] truncate flex items-center gap-1.5">
            <span>{user.displayName || user.username}</span>
            {user.isGuest && (
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-700 border border-amber-500/30">
                Guest
              </span>
            )}
          </div>
          <div className="text-[10px] text-[var(--text-muted)] truncate flex items-center gap-1">
            <span>@{user.username}</span>
            <span>•</span>
            <span
              className={`font-semibold capitalize ${
                currentStatus === 'ONLINE'
                  ? 'text-emerald-700'
                  : currentStatus === 'IDLE'
                  ? 'text-amber-700'
                  : currentStatus === 'DND'
                  ? 'text-red-700'
                  : 'text-zinc-500'
              }`}
            >
              {currentStatus === 'ONLINE'
                ? 'Active'
                : currentStatus === 'IDLE'
                ? 'Away'
                : currentStatus === 'DND'
                ? 'Do Not Disturb'
                : 'Invisible'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Custom Status Banner or Set Status Trigger */}
      {customStatus ? (
        <div className="mb-2.5 p-2 rounded-xl bg-red-500/10 border border-red-500/25 flex items-center justify-between group">
          <div
            onClick={() => {
              onClose();
              onOpenFullModal();
            }}
            className="flex items-center gap-2 min-w-0 cursor-pointer flex-1"
            title="Click to change status"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#DC2626] shrink-0" />
            <div className="min-w-0">
              <span className="text-xs font-bold text-[#DC2626] truncate block">
                {customStatus}
              </span>
              {presence.customStatusExpiresAt && (
                <span className="text-[9px] text-[var(--text-muted)] flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" />
                  <span>
                    Until{' '}
                    {new Date(presence.customStatusExpiresAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </span>
              )}
            </div>
          </div>
          <button
            onClick={handleClearStatus}
            className="p-1 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-500/20 transition-colors cursor-pointer shrink-0"
            title="Clear status"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => {
            onClose();
            onOpenFullModal();
          }}
          className="w-full mb-2.5 p-2 rounded-xl bg-[var(--bg-surface-1)] hover:bg-[var(--bg-surface-2)] border border-[var(--border-subtle)] hover:border-red-500/30 text-left flex items-center gap-2.5 transition-all cursor-pointer group"
        >
          <div className="w-6 h-6 rounded-lg bg-red-500/10 flex items-center justify-center text-[#DC2626] group-hover:scale-110 transition-transform">
            <Smile className="w-3.5 h-3.5 text-[#DC2626]" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-[#111827] group-hover:text-[#DC2626] transition-colors">
              Set a status
            </div>
            <div className="text-[10px] text-[var(--text-muted)] truncate">
              What are you working on?
            </div>
          </div>
        </button>
      )}

      {/* 3. Slack Quick 1-Click Toggle: Set as away / Set as active */}
      <button
        onClick={handleToggleAway}
        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl hover:bg-black/[0.04] transition-colors cursor-pointer text-xs font-medium text-[#111827] mb-1.5"
      >
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              isAway ? 'bg-amber-500 shadow-xs' : 'bg-emerald-500 shadow-xs'
            }`}
          />
          <span>{isAway ? 'Set yourself as active' : 'Set yourself as away'}</span>
        </div>
        <span className="text-[10px] text-[var(--text-muted)] font-mono">
          {isAway ? 'ONLINE' : 'AWAY'}
        </span>
      </button>

      {/* 4. Availability 4-State Grid */}
      <div className="grid grid-cols-2 gap-1 mb-2">
        {[
          { id: 'ONLINE', label: 'Active', dot: 'bg-emerald-500' },
          { id: 'IDLE', label: 'Away', dot: 'bg-amber-500' },
          { id: 'DND', label: 'Do Not Disturb', dot: 'bg-red-500' },
          { id: 'OFFLINE', label: 'Invisible', dot: 'bg-zinc-400' },
        ].map((item) => {
          const isSelected = currentStatus === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleSelectStatus(item.id as UserStatus)}
              className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                isSelected
                  ? 'bg-red-500/10 border border-red-500/30 text-[#111827]'
                  : 'hover:bg-black/[0.04] text-[var(--text-secondary)] border border-transparent'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${item.dot} shrink-0`} />
              <span className="truncate">{item.label}</span>
              {isSelected && <Check className="w-2.5 h-2.5 text-[#DC2626] ml-auto shrink-0" />}
            </button>
          );
        })}
      </div>

      {/* 5. Slack Quick 1-Click Status Presets */}
      <div className="border-t border-[var(--border-subtle)] pt-2 mb-2">
        <div className="px-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1 flex items-center justify-between">
          <span>Quick Status</span>
          <button
            onClick={() => {
              onClose();
              onOpenFullModal();
            }}
            className="text-[10px] text-[#DC2626] hover:underline cursor-pointer lowercase font-normal"
          >
            more options...
          </button>
        </div>

        <div className="space-y-0.5">
          {[
            { icon: MessageSquare, text: 'In a meeting', mins: 60, label: '1h', color: 'text-indigo-600' },
            { icon: Target, text: 'Deep work & focus', mins: 120, label: '2h', color: 'text-purple-600' },
            { icon: Car, text: 'Commuting', mins: 30, label: '30m', color: 'text-amber-600' },
            { icon: Palmtree, text: 'Vacationing', mins: null, label: 'Off', color: 'text-emerald-600' },
          ].map((preset) => {
            const Icon = preset.icon;
            return (
              <button
                key={preset.text}
                onClick={() => handleApplyQuickPreset(preset.text, preset.mins)}
                className="w-full flex items-center justify-between px-2 py-1 rounded-lg hover:bg-black/[0.04] text-left transition-colors cursor-pointer group text-xs text-[#111827]"
              >
                <div className="flex items-center gap-2 truncate">
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${preset.color}`} />
                  <span className="truncate group-hover:text-[#DC2626] transition-colors">
                    {preset.text}
                  </span>
                </div>
                <span className="text-[10px] text-[var(--text-muted)] font-mono shrink-0 ml-1">
                  {preset.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 6. Action Links: Profile, Theme, Logout */}
      <div className="border-t border-[var(--border-subtle)] pt-1.5 space-y-0.5">
        <button
          onClick={() => {
            onClose();
            onOpenEditProfile();
          }}
          className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-black/[0.04] transition-colors cursor-pointer text-xs font-semibold text-[#111827]"
        >
          <User className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          <span>Edit Profile & Avatar</span>
        </button>

        {user.isGuest && (
          <button
            onClick={() => {
              onClose();
              setUpgradeModalOpen(true);
            }}
            className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 transition-colors cursor-pointer text-xs font-bold border border-amber-500/25"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>Upgrade to Full Account</span>
          </button>
        )}

        <button
          onClick={() => {
            onClose();
            setAnonConnectModalOpen(true);
          }}
          className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-black/[0.04] transition-colors cursor-pointer text-xs font-semibold text-[#111827]"
        >
          <Sparkles className="w-3.5 h-3.5 text-rose-600 shrink-0" />
          <span>Anonymous Speed Connect</span>
        </button>

        {onOpenThemeModal && (
          <button
            onClick={() => {
              onClose();
              onOpenThemeModal();
            }}
            className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-black/[0.04] transition-colors cursor-pointer text-xs font-semibold text-[#111827]"
          >
            <Palette className="w-3.5 h-3.5 text-[#DC2626]" />
            <span>Theme & Colors</span>
          </button>
        )}

        <button
          onClick={() => {
            onClose();
            logout();
          }}
          className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-red-500/10 text-red-600 transition-colors cursor-pointer text-xs font-semibold"
        >
          <LogOut className="w-3.5 h-3.5 text-red-600" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
};
