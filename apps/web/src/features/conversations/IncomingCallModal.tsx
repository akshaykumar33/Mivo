'use client';

import * as React from 'react';
import { useConversationStore } from '@/stores/conversationStore';
import { useAuthStore } from '@/stores/authStore';
import { Avatar } from '@mivo/ui';
import { Phone, PhoneOff, Users, Volume2 } from 'lucide-react';

export const IncomingCallModal: React.FC = () => {
  const { incomingCall, acceptCall, declineCall } = useConversationStore();
  const { user } = useAuthStore();

  if (!incomingCall) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm rounded-3xl bg-[var(--bg-surface-0)] border border-red-500/30 p-6 shadow-2xl shadow-red-900/20 text-center flex flex-col items-center animate-in zoom-in-95 duration-200 overflow-hidden">
        {/* Ambient Pulsing Glow Rings */}
        <div className="absolute -top-12 -left-12 w-40 h-40 bg-red-600/15 rounded-full blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -bottom-12 -right-12 w-40 h-40 bg-amber-600/15 rounded-full blur-3xl pointer-events-none animate-pulse" />

        <div className="relative mb-4 mt-2">
          {/* Animated Ring Ripple */}
          <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" />
          <div className="relative z-10 p-1.5 rounded-full bg-gradient-to-tr from-[#DC2626] to-[#991B1B] shadow-xl">
            <Avatar
              fallbackText={incomingCall.callerName}
              src={incomingCall.callerAvatar || undefined}
              size="lg"
            />
          </div>
        </div>

        {/* Call Info */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/25 text-red-600 text-[11px] font-semibold mb-2">
          {incomingCall.isGroup ? (
            <>
              <Users className="w-3 h-3 text-red-600" />
              <span>Incoming Group Call</span>
            </>
          ) : (
            <>
              <Volume2 className="w-3 h-3 text-red-600" />
              <span>Incoming Audio Call</span>
            </>
          )}
        </div>

        <h3 className="text-lg font-bold text-[#111827] font-display">
          {incomingCall.isGroup ? incomingCall.groupName || 'Group Call' : incomingCall.callerName}
        </h3>

        {incomingCall.isGroup && (
          <p className="text-xs text-[#4B5563] mt-0.5">
            Initiated by <span className="text-red-600 font-semibold">{incomingCall.callerName}</span>
          </p>
        )}

        <p className="text-xs text-[#71717A] mt-2">Ringing audio session...</p>

        {/* Action Buttons: Accept / Decline */}
        <div className="flex items-center gap-6 mt-8 w-full justify-center">
          <button
            type="button"
            onClick={declineCall}
            className="flex flex-col items-center gap-1.5 text-xs text-[#6B7280] hover:text-[#DC2626] transition-colors group cursor-pointer"
          >
            <div className="w-14 h-14 rounded-full bg-rose-600/15 border border-rose-500/30 flex items-center justify-center text-rose-600 group-hover:bg-rose-600 group-hover:text-white transition-all shadow-lg shadow-rose-900/10">
              <PhoneOff className="w-6 h-6" />
            </div>
            <span className="font-semibold text-[11px]">Decline</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (user) acceptCall(user.id);
            }}
            className="flex flex-col items-center gap-1.5 text-xs text-[#6B7280] hover:text-emerald-700 transition-colors group cursor-pointer"
          >
            <div className="w-14 h-14 rounded-full bg-emerald-600 flex items-center justify-center text-white group-hover:scale-105 group-hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-900/20 animate-bounce">
              <Phone className="w-6 h-6" />
            </div>
            <span className="font-semibold text-emerald-700 text-[11px]">Accept</span>
          </button>
        </div>
      </div>
    </div>
  );
};
