'use client';

import * as React from 'react';
import { ExternalMeetingDTO } from '@mivo/shared';
import { GoogleMeetIcon, MicrosoftTeamsIcon } from './ExternalMeetingIcons';
import { Copy, Check, ExternalLink, Radio, Phone, ChevronDown, ChevronUp } from 'lucide-react';
import { api } from '@/lib/api-client';

export interface ExternalMeetingCardProps {
  meeting: ExternalMeetingDTO;
  roomId?: string;
  conversationId?: string;
  onBridgeActivated?: () => void;
  isCurrentlyBridged?: boolean;
}

export const ExternalMeetingCard: React.FC<ExternalMeetingCardProps> = ({
  meeting,
  roomId,
  conversationId,
  onBridgeActivated,
  isCurrentlyBridged = false,
}) => {
  const [copied, setCopied] = React.useState(false);
  const [isBridging, setIsBridging] = React.useState(false);
  const [showDialIn, setShowDialIn] = React.useState(false);

  const isGoogle = meeting.provider === 'GOOGLE_MEET';

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(meeting.meetingUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleBridge = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const targetUrl = roomId
      ? `/api/v1/meetings/room/${roomId}/bridge`
      : conversationId
      ? `/api/v1/meetings/conversation/${conversationId}/bridge`
      : null;

    if (!targetUrl || isCurrentlyBridged || isBridging) return;

    setIsBridging(true);
    try {
      const res = await api.post(targetUrl, {
        meetingId: meeting.id,
      });
      if (res.success && onBridgeActivated) {
        onBridgeActivated();
      }
    } catch (err) {
      console.error('Failed to bridge meeting:', err);
    } finally {
      setIsBridging(false);
    }
  };

  return (
    <div
      className={`my-2 max-w-md w-full rounded-2xl border transition-all duration-300 overflow-hidden shadow-xl backdrop-blur-xl ${
        isGoogle
          ? 'bg-gradient-to-b from-[#00AC47]/10 via-[#0B1510]/80 to-[#0F1220]/95 border-[#00AC47]/30 hover:border-[#00AC47]/60 shadow-[0_8px_32px_rgba(0,172,71,0.15)]'
          : 'bg-gradient-to-b from-[#505AC9]/15 via-[#111328]/80 to-[#0F1220]/95 border-[#505AC9]/35 hover:border-[#505AC9]/70 shadow-[0_8px_32px_rgba(80,90,201,0.2)]'
      }`}
    >
      {/* Top Header Bar */}
      <div className="p-4 pb-3 flex items-start justify-between gap-3 border-b border-white/[0.08]">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center p-2 shadow-lg flex-shrink-0 ${
              isGoogle
                ? 'bg-[#00AC47]/20 border border-[#00AC47]/40 ring-2 ring-[#00AC47]/20'
                : 'bg-[#505AC9]/25 border border-[#505AC9]/50 ring-2 ring-[#505AC9]/25'
            }`}
          >
            {isGoogle ? (
              <GoogleMeetIcon className="w-6 h-6 drop-shadow-sm" />
            ) : (
              <MicrosoftTeamsIcon className="w-6 h-6 drop-shadow-sm" />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                  isGoogle
                    ? 'bg-[#00AC47]/20 text-[#34D399] border-[#00AC47]/40'
                    : 'bg-[#505AC9]/25 text-[#A5B4FC] border-[#505AC9]/50'
                }`}
              >
                {isGoogle ? 'Google Meet' : 'Microsoft Teams'}
              </span>

              {isCurrentlyBridged && (
                <span className="flex items-center gap-1 text-[10px] font-bold text-[#30D158] bg-[#30D158]/15 border border-[#30D158]/30 px-2 py-0.5 rounded-full animate-pulse">
                  <Radio className="w-3 h-3" />
                  <span>Bridged to Stage</span>
                </span>
              )}
            </div>

            <h4 className="text-sm font-bold text-white mt-1 truncate tracking-tight">
              {meeting.title}
            </h4>
          </div>
        </div>

        {/* Copy Invite Button */}
        <button
          onClick={handleCopy}
          className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-white/70 hover:text-white border border-white/[0.1] transition-all cursor-pointer flex-shrink-0 group"
          title="Copy Meeting Link"
        >
          {copied ? (
            <Check className="w-4 h-4 text-[#30D158]" />
          ) : (
            <Copy className="w-4 h-4 group-hover:scale-110 transition-transform" />
          )}
        </button>
      </div>

      {/* Body Details */}
      <div className="p-4 pt-3 space-y-3">
        {/* Meeting Code Badge & Creator */}
        <div className="flex items-center justify-between text-xs text-white/60">
          <div className="flex items-center gap-1.5">
            <span className="text-white/40">Code:</span>
            <span className="font-mono font-bold text-white/90 bg-white/[0.06] px-2 py-0.5 rounded-lg border border-white/[0.08]">
              {meeting.meetingCode}
            </span>
          </div>

          {meeting.createdBy && (
            <span className="text-[11px] text-white/50 truncate max-w-[150px]">
              Host: <span className="text-white/80 font-medium">{meeting.createdBy.displayName}</span>
            </span>
          )}
        </div>

        {/* Action Buttons Row */}
        <div className="flex items-center gap-2 pt-1">
          {/* Primary Join Button */}
          <a
            href={meeting.meetingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex-1 h-10 rounded-xl font-bold text-xs flex items-center justify-center gap-2 text-white shadow-lg transition-all duration-200 cursor-pointer hover:scale-[1.01] active:scale-[0.99] ${
              isGoogle
                ? 'bg-gradient-to-r from-[#00AC47] to-[#00832D] hover:from-[#00BC4E] hover:to-[#009634] shadow-[0_4px_16px_rgba(0,172,71,0.35)] border border-[#34D399]/40'
                : 'bg-gradient-to-r from-[#505AC9] to-[#3D45A4] hover:from-[#626CDA] hover:to-[#4A53B5] shadow-[0_4px_16px_rgba(80,90,201,0.35)] border border-[#A5B4FC]/40'
            }`}
          >
            <span>Join on {isGoogle ? 'Google Meet' : 'MS Teams'}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          {/* Optional Stage/Conversation Bridge Button */}
          {(roomId || conversationId) && !isCurrentlyBridged && (
            <button
              onClick={handleBridge}
              disabled={isBridging}
              className="px-3.5 h-10 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-white/80 hover:text-white border border-white/[0.12] text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer flex-shrink-0"
              title={roomId ? 'Bridge this external call to the Mivo stage' : 'Pin this external call to the group conversation banner'}
            >
              <Radio className="w-3.5 h-3.5 text-[#64D2FF]" />
              <span className="hidden sm:inline">{isBridging ? 'Bridging...' : roomId ? 'Bridge Stage' : 'Bridge Call'}</span>
            </button>
          )}
        </div>

        {/* Dial-in info toggle */}
        {meeting.dialIn && (
          <div className="pt-1">
            <button
              onClick={() => setShowDialIn(!showDialIn)}
              className="text-[11px] text-white/40 hover:text-white/70 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Phone className="w-3 h-3" />
              <span>Dial-in phone information</span>
              {showDialIn ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {showDialIn && (
              <div className="mt-2 p-2.5 rounded-xl bg-black/40 border border-white/[0.08] text-[11px] font-mono text-white/70 space-y-1 animate-in fade-in duration-200">
                <div className="text-white/40 text-[10px] uppercase font-bold tracking-wider">Toll-free audio dial-in</div>
                <div>{meeting.dialIn}</div>
                {meeting.passcode && <div>Passcode: {meeting.passcode}</div>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
