'use client';

import * as React from 'react';
import { useConversationStore } from '@/stores/conversationStore';
import { useAuthStore } from '@/stores/authStore';
import { Avatar } from '@mivo/ui';
import { Phone, PhoneOff, Users, Volume2 } from 'lucide-react';

export const IncomingCallModal: React.FC = () => {
  const { incomingCall, acceptCall, declineCall } = useConversationStore();
  const { user, isGuest } = useAuthStore();

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!incomingCall) return;
      if (e.key === 'Escape') {
        declineCall();
      } else if (e.key === 'Enter' && user) {
        acceptCall(user.id);
      }
    };
    if (incomingCall) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [incomingCall, user, acceptCall, declineCall]);

  if (!incomingCall || isGuest) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="incoming-call-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-sm rounded-3xl bg-[var(--bg-surface-0)] border border-[var(--border-subtle)] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.08)] text-center flex flex-col items-center animate-in zoom-in-95 duration-200 overflow-hidden">
        <div className="relative mb-4 mt-2">
          {/* Subtle audio presence ring */}
          <div className="absolute -inset-1.5 rounded-full bg-[var(--brand-primary,#dc2626)]/15 animate-ping opacity-75" />
          <div className="relative z-10 p-1 rounded-full bg-[var(--bg-surface-2)] border border-[var(--border-subtle)] shadow-xl">
            <Avatar
              fallbackText={incomingCall.callerName}
              src={incomingCall.callerAvatar || undefined}
              size="lg"
            />
          </div>
        </div>

        {/* Call Info Badge */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--brand-primary,#dc2626)]/10 border border-[var(--brand-primary,#dc2626)]/25 text-[var(--brand-primary,#dc2626)] text-[11px] font-semibold mb-2">
          {incomingCall.isGroup ? (
            <>
              <Users className="w-3 h-3" />
              <span>Incoming Group Call</span>
            </>
          ) : (
            <>
              <Volume2 className="w-3 h-3" />
              <span>Incoming Audio Call</span>
            </>
          )}
        </div>

        <h3 id="incoming-call-title" className="text-lg font-bold text-[var(--text-primary)] font-display">
          {incomingCall.isGroup ? incomingCall.groupName || 'Group Call' : incomingCall.callerName}
        </h3>

        {incomingCall.isGroup && (
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Initiated by <span className="text-[var(--brand-primary,#dc2626)] font-semibold">{incomingCall.callerName}</span>
          </p>
        )}

        <p className="text-xs text-[var(--text-muted)] mt-2">Connecting real-time audio session...</p>

        {/* Action Buttons: Accept / Decline */}
        <div className="flex items-center gap-6 mt-8 w-full justify-center">
          <button
            type="button"
            onClick={declineCall}
            aria-label="Decline incoming call"
            className="flex flex-col items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-rose-600 transition-colors group cursor-pointer"
          >
            <div className="w-14 h-14 rounded-full bg-rose-500/10 border border-rose-500/25 flex items-center justify-center text-rose-600 group-hover:bg-rose-600 group-hover:text-white group-active:scale-95 transition-all shadow-sm">
              <PhoneOff className="w-6 h-6" />
            </div>
            <span className="font-semibold text-[11px]">Decline (Esc)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (user) acceptCall(user.id);
            }}
            aria-label="Accept incoming call"
            className="flex flex-col items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-emerald-600 transition-colors group cursor-pointer"
          >
            <div className="w-14 h-14 rounded-full bg-emerald-600 flex items-center justify-center text-white group-hover:bg-emerald-500 group-active:scale-95 transition-all shadow-md shadow-emerald-900/20">
              <Phone className="w-6 h-6" />
            </div>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400 text-[11px]">Accept (Enter)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
