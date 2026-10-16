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
      className={`w-full px-4 py-2.5 border-b flex items-center justify-between gap-3 text-xs backdrop-blur-2xl transition-all duration-300 z-10 select-none shadow-md ${
        isGoogle
          ? 'bg-gradient-to-r from-[#00AC47]/20 via-[#0B1A12]/90 to-[#0F1220]/95 border-[#00AC47]/30 text-white'
          : 'bg-gradient-to-r from-[#505AC9]/20 via-[#12142E]/90 to-[#0F1220]/95 border-[#505AC9]/35 text-white'
      }`}
    >
      {/* Left: Provider & Info */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div
          className={`w-7 h-7 rounded-xl flex items-center justify-center p-1.5 flex-shrink-0 shadow-sm ${
            isGoogle ? 'bg-[#00AC47]/25 border border-[#00AC47]/40' : 'bg-[#505AC9]/30 border border-[#505AC9]/50'
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
            <span className="w-2 h-2 rounded-full bg-[#30D158] animate-pulse" />
            <span className="font-extrabold uppercase tracking-wider text-[10px] text-white/90">
              {isGoogle ? 'Google Meet Active' : 'MS Teams Active'}
            </span>
          </div>

          <span className="text-white/30 hidden sm:inline">•</span>

          <span className="font-bold text-white truncate max-w-[200px] sm:max-w-xs md:max-w-md">
            {meeting.title}
          </span>

          <span className="font-mono text-[11px] text-white/50 bg-white/[0.08] px-2 py-0.5 rounded-md hidden md:inline">
            {meeting.meetingCode}
          </span>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Copy Invite Link */}
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] border border-white/[0.12] text-white/80 hover:text-white transition-all cursor-pointer font-medium"
          title="Copy external meeting invite link"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-[#30D158]" /> : <Copy className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
        </button>

        {/* Join CTA */}
        <a
          href={meeting.meetingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex items-center gap-1.5 px-3 py-1 rounded-xl font-bold text-white shadow-md transition-all cursor-pointer hover:scale-105 active:scale-95 ${
            isGoogle
              ? 'bg-[#00AC47] hover:bg-[#00C250] shadow-[0_2px_12px_rgba(0,172,71,0.4)]'
              : 'bg-[#505AC9] hover:bg-[#626CDA] shadow-[0_2px_12px_rgba(80,90,201,0.4)]'
          }`}
        >
          <span>Join Call</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>

        {/* Disconnect Bridge */}
        <button
          onClick={handleDisconnect}
          disabled={isRemoving}
          className="p-1 rounded-lg text-white/40 hover:text-[#FF453A] hover:bg-white/[0.08] transition-colors cursor-pointer ml-1"
          title="Disconnect external meeting bridge from stage"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
