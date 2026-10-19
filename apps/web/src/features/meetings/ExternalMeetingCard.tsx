'use client';

import * as React from 'react';
import { ExternalMeetingDTO } from '@mivo/shared';
import { GoogleMeetIcon, MicrosoftTeamsIcon } from './ExternalMeetingIcons';
import { Copy, Check, ExternalLink, Radio, Phone, ChevronDown, ChevronUp, User, Video } from 'lucide-react';
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
      className={`my-2 max-w-lg w-full rounded-2xl border transition-all duration-300 overflow-hidden shadow-sm hover:shadow-md bg-[var(--bg-surface-0)] ${
        isGoogle
          ? 'border-emerald-500/30 hover:border-emerald-500/60'
          : 'border-indigo-500/30 hover:border-indigo-500/60'
      }`}
    >
      {/* Top Brand Header Accent Bar */}
      <div
        className={`px-4 py-3 flex items-start justify-between gap-3 border-b ${
          isGoogle
            ? 'bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-500/15'
            : 'bg-gradient-to-r from-indigo-500/10 via-indigo-500/5 to-transparent border-indigo-500/15'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center p-2.5 shadow-sm flex-shrink-0 border ${
              isGoogle
                ? 'bg-emerald-50 border-emerald-200 shadow-emerald-500/10'
                : 'bg-indigo-50 border-indigo-200 shadow-indigo-500/10'
            }`}
          >
            {isGoogle ? (
              <GoogleMeetIcon className="w-6 h-6" />
            ) : (
              <MicrosoftTeamsIcon className="w-6 h-6" />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                  isGoogle
                    ? 'bg-emerald-500/15 text-emerald-800 border-emerald-500/30 font-display'
                    : 'bg-indigo-500/15 text-indigo-800 border-indigo-500/30 font-display'
                }`}
              >
                {isGoogle ? 'Google Meet' : 'Microsoft Teams'}
              </span>

              {isCurrentlyBridged && (
                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full animate-pulse">
                  <Radio className="w-3 h-3 text-emerald-600" />
                  <span>Bridged to Stage</span>
                </span>
              )}
            </div>

            <h4 className="text-sm font-bold text-[#111827] mt-1 truncate tracking-tight font-display">
              {meeting.title}
            </h4>
          </div>
        </div>

        {/* Copy Invite Link Button */}
        <button
          onClick={handleCopy}
          className="p-2 rounded-xl bg-[var(--bg-surface-1)] hover:bg-[var(--bg-surface-2)] text-[#71717A] hover:text-[#111827] border border-[var(--border-subtle)] transition-all cursor-pointer flex-shrink-0 group shadow-xs"
          title="Copy Meeting Link"
        >
          {copied ? (
            <span className="flex items-center gap-1 text-emerald-600 text-xs font-semibold">
              <Check className="w-3.5 h-3.5" />
              <span className="text-[10px]">Copied</span>
            </span>
          ) : (
            <Copy className="w-4 h-4 group-hover:scale-110 transition-transform" />
          )}
        </button>
      </div>

      {/* Body Details */}
      <div className="p-4 pt-3 space-y-3">
        {/* Meeting Code Badge & Creator */}
        <div className="flex items-center justify-between text-xs text-[#71717A] flex-wrap gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-[#71717A] uppercase tracking-wider">Meeting Code:</span>
            <span className="font-mono font-bold text-xs text-[#111827] bg-[var(--bg-surface-1)] px-2.5 py-0.5 rounded-lg border border-[var(--border-subtle)]">
              {meeting.meetingCode}
            </span>
          </div>

          {meeting.createdBy && (
            <span className="text-[11px] text-[#71717A] truncate max-w-[180px] flex items-center gap-1">
              <User className="w-3 h-3 text-[#71717A]" />
              <span>Host:</span>
              <span className="text-[#111827] font-semibold">{meeting.createdBy.displayName}</span>
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
            className={`flex-1 h-10 rounded-xl font-bold text-xs flex items-center justify-center gap-2 text-white shadow-md transition-all duration-200 cursor-pointer hover:scale-[1.01] active:scale-[0.99] ${
              isGoogle
                ? 'bg-gradient-to-r from-[#00AC47] via-[#00963E] to-[#00832D] hover:from-[#00BC4E] hover:to-[#00963E] shadow-emerald-600/20'
                : 'bg-gradient-to-r from-[#4F46E5] via-[#4338CA] to-[#3730A3] hover:from-[#6366F1] hover:to-[#4338CA] shadow-indigo-600/20'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>Join on {isGoogle ? 'Google Meet' : 'MS Teams'}</span>
            <ExternalLink className="w-3.5 h-3.5 ml-0.5" />
          </a>

          {/* Optional Stage/Conversation Bridge Button */}
          {(roomId || conversationId) && !isCurrentlyBridged && (
            <button
              onClick={handleBridge}
              disabled={isBridging}
              className="px-3.5 h-10 rounded-xl bg-red-500/10 hover:bg-red-500/15 text-red-700 border border-red-500/25 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer flex-shrink-0 shadow-xs"
              title={roomId ? 'Bridge this external call to the Mivo stage' : 'Pin this external call to the group conversation banner'}
            >
              <Radio className="w-3.5 h-3.5 text-red-600" />
              <span className="hidden sm:inline">{isBridging ? 'Bridging...' : roomId ? 'Bridge Stage' : 'Bridge Call'}</span>
            </button>
          )}
        </div>

        {/* Dial-in info toggle */}
        {meeting.dialIn && (
          <div className="pt-1 border-t border-[var(--border-subtle)]">
            <button
              onClick={() => setShowDialIn(!showDialIn)}
              className="text-[11px] text-[#71717A] hover:text-[#111827] flex items-center gap-1.5 transition-colors cursor-pointer font-medium"
            >
              <Phone className="w-3 h-3 text-red-600" />
              <span>Dial-in phone information</span>
              {showDialIn ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {showDialIn && (
              <div className="mt-2 p-2.5 rounded-xl bg-[var(--bg-surface-1)] border border-[var(--border-subtle)] text-xs font-mono text-[#111827] space-y-1 animate-fade-in shadow-xs">
                <div className="text-[#71717A] text-[10px] uppercase font-bold tracking-wider">Toll-free audio dial-in</div>
                <div className="font-bold">{meeting.dialIn}</div>
                {meeting.passcode && (
                  <div className="text-[11px] text-[#71717A]">
                    Passcode: <span className="text-[#111827] font-bold">{meeting.passcode}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
