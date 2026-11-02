'use client';

import * as React from 'react';
import {
  Sparkles,
  X,
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Clock,
  User,
  ExternalLink,
  Pin,
  Bot,
  Volume2,
} from 'lucide-react';

export interface PinnedTicketItem {
  id: string;
  title: string;
  priority: string;
  status: string;
  assignee: string;
  isBlocker: boolean;
  blockerReason?: string;
}

export interface PinnedDataTilePayload {
  type: 'SPRINT_BLOCKERS' | 'ACTION_CONFIRMATION' | 'METRICS' | 'SUMMARY';
  title: string;
  badge: string;
  summary: string;
  tickets?: PinnedTicketItem[];
}

export interface AiPinnedDataTileProps {
  payload: PinnedDataTilePayload;
  onDismiss: () => void;
  onOpenTicketsModal?: () => void;
  isPinned?: boolean;
  onTogglePin?: () => void;
}

export const AiPinnedDataTile: React.FC<AiPinnedDataTileProps> = ({
  payload,
  onDismiss,
  onOpenTicketsModal,
  isPinned = true,
  onTogglePin,
}) => {
  const tickets = payload.tickets || [];
  const blockers = tickets.filter((t) => t.isBlocker);
  const urgentCount = tickets.filter((t) => t.priority === 'URGENT').length;

  return (
    <div className="w-full h-full min-h-[300px] rounded-3xl bg-[var(--bg-surface-0,#10131e)] border border-[var(--border-subtle,rgba(255,255,255,0.1))] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)] relative flex flex-col overflow-hidden animate-scale-in">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-white/[0.08] bg-white/[0.02] backdrop-blur-md z-10">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-xl bg-[var(--brand-primary,#6366f1)]/10 text-[var(--brand-primary,#6366f1)] border border-[var(--brand-primary,#6366f1)]/20">
            <Bot className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs sm:text-sm font-semibold text-white tracking-wide font-display">
                {payload.title}
              </h4>
              <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 text-[10px] font-medium">
                {payload.badge || 'Live Stage Sync'}
              </span>
            </div>
            <p className="text-[11px] text-white/50 truncate max-w-xs sm:max-w-md">
              Pinned by Mivo AI Co-Host • Dual Duplex Stage Widget
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {onTogglePin && (
            <button
              onClick={onTogglePin}
              className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
                isPinned
                  ? 'bg-violet-600/30 border-violet-500/40 text-violet-300'
                  : 'bg-white/[0.04] border-white/[0.08] text-white/60 hover:text-white'
              }`}
              title={isPinned ? 'Unpin Stage Tile' : 'Pin Stage Tile'}
            >
              <Pin className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={onDismiss}
            className="p-1.5 rounded-xl bg-white/[0.04] hover:bg-rose-500/20 border border-white/[0.08] hover:border-rose-500/30 text-white/60 hover:text-rose-300 transition-all cursor-pointer"
            title="Dismiss Pinned Tile"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Summary Highlight Pill Bar */}
      <div className="px-4 sm:px-5 py-2.5 bg-violet-950/20 border-b border-white/[0.06] flex items-center justify-between text-xs flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-white/80 font-medium text-[11px] sm:text-xs">
            {payload.summary}
          </span>
        </div>

        <div className="flex items-center gap-2 text-[10px] font-bold">
          <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30">
            {urgentCount} Urgent
          </span>
          <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
            {blockers.length} Blockers
          </span>
          <span className="px-2 py-0.5 rounded-md bg-white/[0.06] text-white/70">
            {tickets.length} In Sprint
          </span>
        </div>
      </div>

      {/* Scrollable Ticket List Body */}
      <div className="flex-1 p-3 sm:p-4 overflow-y-auto space-y-2.5">
        {tickets.map((t) => {
          const isUrgent = t.priority === 'URGENT';
          const isHigh = t.priority === 'HIGH';

          return (
            <div
              key={t.id}
              className={`p-3 rounded-2xl border transition-all duration-200 group ${
                isUrgent
                  ? 'bg-rose-950/20 border-rose-500/40 hover:border-rose-500 shadow-lg shadow-rose-950/30'
                  : isHigh
                  ? 'bg-amber-950/20 border-amber-500/30 hover:border-amber-500/50'
                  : 'bg-white/[0.03] border-white/[0.08] hover:border-white/[0.15]'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5 flex-1 min-w-0">
                  <div className="mt-0.5 flex-shrink-0">
                    {isUrgent ? (
                      <AlertOctagon className="w-4 h-4 text-rose-400 animate-pulse" />
                    ) : isHigh ? (
                      <Clock className="w-4 h-4 text-amber-400" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs sm:text-sm font-bold text-white group-hover:text-cyan-300 transition-colors truncate">
                        {t.title}
                      </span>
                    </div>

                    {/* Blocker Callout Box */}
                    {t.isBlocker && t.blockerReason && (
                      <div className="mt-2 p-2 rounded-xl bg-black/40 border border-rose-500/30 text-[11px] text-rose-200/90 leading-relaxed font-sans">
                        <strong className="text-rose-400 font-semibold text-[10px] flex items-center gap-1 mb-0.5">
                          <AlertTriangle className="w-3 h-3 text-rose-400" />
                          <span>Active blocker summary</span>
                        </strong>
                        {t.blockerReason}
                      </div>
                    )}
                  </div>
                </div>

                {/* Priority & Assignee Badges */}
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      isUrgent
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : isHigh
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                    }`}
                  >
                    {t.priority}
                  </span>

                  <div className="flex items-center gap-1 text-[11px] text-white/70 bg-white/[0.05] px-2 py-0.5 rounded-lg border border-white/[0.06]">
                    <User className="w-3 h-3 text-cyan-400" />
                    <span className="font-medium truncate max-w-[90px]">
                      {t.assignee}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {tickets.length === 0 && (
          <div className="h-full flex items-center justify-center p-8 text-center text-white/50 text-xs">
            No active sprint tickets found for this query.
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="px-4 py-2.5 bg-black/40 border-t border-white/[0.08] flex items-center justify-between text-xs">
        <span className="text-[10px] text-white/40 flex items-center gap-1">
          <Volume2 className="w-3 h-3 text-violet-400" />
          <span>Verbal context broadcasted to all speakers</span>
        </span>

        {onOpenTicketsModal && (
          <button
            onClick={onOpenTicketsModal}
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[var(--brand-primary,#6366f1)] hover:opacity-90 active:scale-[0.98] text-white font-semibold text-[11px] shadow-xs transition-all cursor-pointer"
          >
            <span>Open Tickets Hub</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
};
