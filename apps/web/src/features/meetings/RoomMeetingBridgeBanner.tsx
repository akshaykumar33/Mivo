'use client';

import * as React from 'react';
import { ExternalMeetingBridgeDTO } from '@mivo/shared';
import { GoogleMeetIcon, MicrosoftTeamsIcon } from './ExternalMeetingIcons';
import { ExternalLink, Copy, Check, X, Radio } from 'lucide-react';
import { api } from '@/lib/api-client';

export interface RoomMeetingBridgeBannerProps {
  bridge: ExternalMeetingBridgeDTO | null;
  roomId?: string;
  conversationId?: string;
  isHost?: boolean;
  onBridgeRemoved?: () => void;
}

export const RoomMeetingBridgeBanner: React.FC<RoomMeetingBridgeBannerProps> = ({
  bridge,
  roomId,
  conversationId,
  isHost = false,
  onBridgeRemoved,
}) => {
  const [copied, setCopied] = React.useState(false);
  const [isRemoving, setIsRemoving] = React.useState(false);

  if (!bridge) return null;

  const { meeting } = bridge;
  const isGoogle = meeting.provider === 'GOOGLE_MEET';

  const handleCopy = () => {
    navigator.clipboard.writeText(meeting.meetingUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDisconnect = async () => {
    const targetUrl = roomId
      ? `/api/v1/meetings/room/${roomId}/bridge`
      : conversationId
      ? `/api/v1/meetings/conversation/${conversationId}/bridge`
      : null;

    if (!targetUrl || isRemoving) return;
    setIsRemoving(true);
    try {
      await api.delete(targetUrl);
      if (onBridgeRemoved) {
        onBridgeRemoved();
      }
    } catch (err) {
      console.error('Failed to disconnect bridge:', err);
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <div
      className={`w-full px-4 py-2.5 border-b flex items-center justify-between gap-3 text-xs backdrop-blur-2xl transition-all duration-300 z-10 select-none shadow-sm bg-[var(--bg-surface-0)]/95 border-[var(--border-subtle)] ${
        isGoogle ? 'border-b-emerald-500/40' : 'border-b-indigo-500/40'
      }`}
    >
      {/* Left: Provider & Info */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div
          className={`w-7 h-7 rounded-xl flex items-center justify-center p-1.5 flex-shrink-0 shadow-xs border ${
            isGoogle ? 'bg-emerald-50 border-emerald-200' : 'bg-indigo-50 border-indigo-200'
          }`}
        >
          {isGoogle ? (
            <GoogleMeetIcon className="w-4 h-4" />
          ) : (
            <MicrosoftTeamsIcon className="w-4 h-4" />
          )}
        </div>

        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className={`font-extrabold uppercase tracking-wider text-[10px] ${isGoogle ? 'text-emerald-700' : 'text-indigo-700'}`}>
              {isGoogle ? 'Google Meet Active' : 'MS Teams Active'}
            </span>
          </div>

          <span className="text-[#71717A]/40 hidden sm:inline">•</span>

          <span className="font-bold text-[#111827] truncate max-w-[200px] sm:max-w-xs md:max-w-md">
            {meeting.title}
          </span>

          <span className="font-mono text-[11px] text-[#71717A] bg-black/[0.04] border border-black/[0.06] px-2 py-0.5 rounded-md hidden md:inline font-semibold">
            {meeting.meetingCode}
          </span>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Copy Invite Link */}
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[var(--bg-surface-1)] hover:bg-[var(--bg-surface-2)] border border-[var(--border-subtle)] text-[#71717A] hover:text-[#111827] transition-all cursor-pointer font-semibold shadow-xs"
          title="Copy external meeting invite link"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
        </button>

        {/* Join CTA */}
        <a
          href={meeting.meetingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex items-center gap-1.5 px-3 py-1 rounded-xl font-bold text-white shadow-sm transition-all cursor-pointer hover:scale-105 active:scale-95 ${
            isGoogle
              ? 'bg-[#00AC47] hover:bg-[#00963E] shadow-emerald-600/25'
              : 'bg-[#4F46E5] hover:bg-[#4338CA] shadow-indigo-600/25'
          }`}
        >
          <span>Join Call</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>

        {/* Disconnect Bridge */}
        <button
          onClick={handleDisconnect}
          disabled={isRemoving}
          className="p-1 rounded-lg text-[#71717A] hover:text-rose-600 hover:bg-black/[0.05] transition-colors cursor-pointer ml-1"
          title="Disconnect external meeting bridge from stage"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
