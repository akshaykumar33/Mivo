'use client';

import * as React from 'react';
import { useAuthStore } from '@/stores/authStore';
import { usePresenceStore } from '@/stores/presenceStore';
import { UserStatus } from '@mivo/shared';
import { Avatar } from '@mivo/ui';
import {
  X,
  Smile,
  Clock,
  Check,
  Loader2,
  Trash2,
  Sparkles,
  Circle,
  Slash,
  Moon,
  Briefcase,
  Coffee,
  Car,
  Home,
  Palmtree,
  Calendar,
  MessageSquare,
  Laptop,
  Target,
  HeartPulse,
} from 'lucide-react';

export interface SlackStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface StatusPreset {
  icon: React.ComponentType<{ className?: string }>;
  text: string;
  durationMinutes: number | null; // null = don't clear, -1 = today
  label: string;
  color: string;
}

const STATUS_PRESETS: StatusPreset[] = [
  { icon: MessageSquare, text: 'In a meeting', durationMinutes: 60, label: '1 hour', color: 'text-indigo-600' },
  { icon: Car, text: 'Commuting', durationMinutes: 30, label: '30 mins', color: 'text-amber-600' },
  { icon: HeartPulse, text: 'Out sick', durationMinutes: -1, label: 'Today', color: 'text-rose-600' },
  { icon: Palmtree, text: 'Vacationing', durationMinutes: null, label: "Don't clear", color: 'text-emerald-600' },
  { icon: Laptop, text: 'Working remotely', durationMinutes: -1, label: 'Today', color: 'text-blue-600' },
  { icon: Target, text: 'Deep work & focus', durationMinutes: 120, label: '2 hours', color: 'text-purple-600' },
  { icon: Coffee, text: 'Out to lunch', durationMinutes: 60, label: '1 hour', color: 'text-orange-600' },
];

export const SlackStatusModal: React.FC<SlackStatusModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuthStore();
  const { updateAvailabilityAndStatus } = usePresenceStore();

  const [selectedStatus, setSelectedStatus] = React.useState<UserStatus>(user?.status || 'ONLINE');
  const [statusText, setStatusText] = React.useState<string>('');
  const [clearDuration, setClearDuration] = React.useState<string>('dont_clear');
  const [isSaving, setIsSaving] = React.useState(false);
  const [savedSuccess, setSavedSuccess] = React.useState(false);

  React.useEffect(() => {
    if (user && isOpen) {
      setSelectedStatus(user.status || 'ONLINE');
      if (user.customStatus) {
        // Strip any legacy leading emoji if present
        const cleanStatus = user.customStatus.replace(/^(\p{Emoji_Presentation}|\p{Extended_Pictographic})\s*/u, '');
        setStatusText(cleanStatus);
      } else {
        setStatusText('');
      }

      if (user.customStatusExpiresAt) {
        const expTime = new Date(user.customStatusExpiresAt).getTime();
        const diffMins = Math.round((expTime - Date.now()) / (60 * 1000));
        if (diffMins <= 35) setClearDuration('30m');
        else if (diffMins <= 70) setClearDuration('1h');
        else if (diffMins <= 130) setClearDuration('2h');
        else if (diffMins <= 260) setClearDuration('4h');
        else setClearDuration('today');
      } else {
        setClearDuration('dont_clear');
      }
    }
  }, [user, isOpen]);

  if (!isOpen) return null;

  const calculateExpiresAt = (durationOption: string): string | null => {
    const now = new Date();
    if (durationOption === '30m') {
      return new Date(now.getTime() + 30 * 60 * 1000).toISOString();
    }
    if (durationOption === '1h') {
      return new Date(now.getTime() + 60 * 60 * 1000).toISOString();
    }
    if (durationOption === '2h') {
      return new Date(now.getTime() + 120 * 60 * 1000).toISOString();
    }
    if (durationOption === '4h') {
      return new Date(now.getTime() + 240 * 60 * 1000).toISOString();
    }
    if (durationOption === 'today') {
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      return endOfDay.toISOString();
    }
    if (durationOption === 'this_week') {
      const daysUntilSunday = (7 - now.getDay()) % 7 || 7;
      const endOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntilSunday, 23, 59, 59, 999);
      return endOfWeek.toISOString();
    }
    return null;
  };

  const handleApplyPreset = (preset: StatusPreset) => {
    setStatusText(preset.text);
    if (preset.durationMinutes === null) {
      setClearDuration('dont_clear');
    } else if (preset.durationMinutes === -1) {
      setClearDuration('today');
    } else if (preset.durationMinutes === 30) {
      setClearDuration('30m');
    } else if (preset.durationMinutes === 60) {
      setClearDuration('1h');
    } else if (preset.durationMinutes === 120) {
      setClearDuration('2h');
    }
  };

  const handleClearStatus = async () => {
    setIsSaving(true);
    setStatusText('');
    setClearDuration('dont_clear');
    try {
      await updateAvailabilityAndStatus(selectedStatus, null, null);
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 600);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setSavedSuccess(false);

    try {
      const trimmed = statusText.trim();
      const combinedStatus = trimmed || null;
      const expiresAt = trimmed ? calculateExpiresAt(clearDuration) : null;

      await updateAvailabilityAndStatus(selectedStatus, combinedStatus, expiresAt);
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 600);
    } catch (err) {
      console.error('Failed to save status:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const isAway = selectedStatus === 'IDLE';

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-3 sm:p-4 animate-fade-in">
      <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto bg-[var(--bg-surface-0)] border border-[var(--border-subtle)] rounded-3xl p-4 sm:p-6 shadow-2xl relative ring-1 ring-white/10 custom-scrollbar">
        {/* Glow Accent */}
        <div className="absolute top-0 right-0 w-56 h-56 bg-gradient-to-br from-[#DC2626]/20 via-[#B91C1C]/15 to-[#F59E0B]/15 blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[var(--border-subtle)] mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-[#DC2626]">
              <Sparkles className="w-5 h-5 text-[#DC2626]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--text-primary)] font-display">
                Set Availability & Status
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                Control your presence, focus modes, and custom status
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[#111827] hover:bg-black/[0.05] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Toggle: Set as away / Set as active */}
        <div className="mb-5 p-3 rounded-2xl bg-[var(--bg-surface-1)] border border-[var(--border-subtle)] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span
              className={`w-3 h-3 rounded-full ${
                selectedStatus === 'ONLINE'
                  ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]'
                  : selectedStatus === 'IDLE'
                  ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]'
                  : selectedStatus === 'DND'
                  ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'
                  : 'bg-zinc-400'
              }`}
            />
            <div>
              <div className="text-xs font-bold text-[var(--text-primary)]">
                {selectedStatus === 'ONLINE'
                  ? 'You are currently Active'
                  : selectedStatus === 'IDLE'
                  ? 'You are currently Away'
                  : selectedStatus === 'DND'
                  ? 'Do Not Disturb (Notifications Muted)'
                  : 'You appear Offline'}
              </div>
              <div className="text-[11px] text-[var(--text-muted)]">
                {selectedStatus === 'ONLINE'
                  ? 'Colleagues can see you are available'
                  : selectedStatus === 'IDLE'
                  ? 'Appears as away to colleagues'
                  : selectedStatus === 'DND'
                  ? 'Direct calls and sounds are paused'
                  : 'Hidden from active presence lists'}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSelectedStatus(isAway ? 'ONLINE' : 'IDLE')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              isAway
                ? 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30 hover:bg-emerald-500/25'
                : 'bg-black/[0.04] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:text-[#111827] hover:bg-black/[0.08]'
            }`}
          >
            {isAway ? 'Set as active' : 'Set as away'}
          </button>
        </div>

        {/* Availability State Selector (Slack 4-state buttons) */}
        <div className="mb-5">
          <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">
            Availability State
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: 'ONLINE', label: 'Active', color: 'text-emerald-700', dot: 'bg-emerald-500' },
              { id: 'IDLE', label: 'Away', color: 'text-amber-700', dot: 'bg-amber-500' },
              { id: 'DND', label: 'Do Not Disturb', color: 'text-red-700', dot: 'bg-red-500' },
              { id: 'OFFLINE', label: 'Invisible', color: 'text-zinc-500', dot: 'bg-zinc-400' },
            ].map((st) => {
              const isSelected = selectedStatus === st.id;
              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setSelectedStatus(st.id as UserStatus)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-red-500/10 border-red-500/40 text-[#111827] shadow-xs ring-1 ring-red-500/20'
                      : 'bg-[var(--bg-surface-1)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[#111827] hover:bg-[var(--bg-surface-2)]'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${st.dot} flex-shrink-0`} />
                  <span className="truncate">{st.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Status Input */}
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">
              Custom Status Message
            </label>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/25 flex items-center justify-center text-red-600 flex-shrink-0">
                <Sparkles className="w-4 h-4 text-[#DC2626]" />
              </div>

              {/* Status Text Input */}
              <input
                type="text"
                value={statusText}
                onChange={(e) => setStatusText(e.target.value)}
                placeholder="What's your status? (e.g. In an architecture sync)"
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-[var(--bg-surface-1)] border border-[var(--border-subtle)] text-xs text-[#111827] placeholder:[var(--text-muted)] focus:outline-none focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626]/20 transition-all shadow-xs"
                maxLength={100}
              />
            </div>
          </div>

          {/* Quick Status Presets */}
          <div>
            <span className="block text-[11px] font-semibold text-[var(--text-muted)] mb-1.5">
              Or pick a standard status preset:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-40 overflow-y-auto pr-1 scrollbar-thin">
              {STATUS_PRESETS.map((p) => {
                const IconComponent = p.icon;
                return (
                  <button
                    key={p.text}
                    type="button"
                    onClick={() => handleApplyPreset(p)}
                    className="flex items-center justify-between p-2 rounded-xl bg-[var(--bg-surface-1)] hover:bg-[var(--bg-surface-2)] border border-[var(--border-subtle)] text-left transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <div className={`w-6 h-6 rounded-lg bg-black/[0.04] flex items-center justify-center shrink-0 ${p.color}`}>
                        <IconComponent className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs text-[#111827] group-hover:text-[#DC2626] truncate font-medium">
                        {p.text}
                      </span>
                    </div>
                    <span className="text-[10px] text-[var(--text-muted)] font-mono flex-shrink-0 ml-1">
                      {p.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Clear After Duration Select */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#DC2626]" />
              <span>Clear status after</span>
            </label>
            <select
              value={clearDuration}
              onChange={(e) => setClearDuration(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-surface-1)] border border-[var(--border-subtle)] text-xs text-[#111827] focus:outline-none focus:border-[#DC2626] cursor-pointer"
            >
              <option value="dont_clear">Don't clear automatically</option>
              <option value="30m">30 minutes</option>
              <option value="1h">1 hour</option>
              <option value="2h">2 hours</option>
              <option value="4h">4 hours</option>
              <option value="today">Today (End of day 23:59)</option>
              <option value="this_week">This week</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-between border-t border-[var(--border-subtle)]">
            {user?.customStatus ? (
              <button
                type="button"
                onClick={handleClearStatus}
                disabled={isSaving}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-500/10 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Status</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:bg-black/[0.05] hover:text-[#111827] transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#DC2626] to-[#991B1B] text-white text-xs font-bold shadow-md hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : savedSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Saved!</span>
                  </>
                ) : (
                  <span>Save Status</span>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
