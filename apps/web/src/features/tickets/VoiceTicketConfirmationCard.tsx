'use client';

import * as React from 'react';
import { Ticket, Check, X, User, AlertCircle, Clock, Volume2 } from 'lucide-react';
import { api } from '../../lib/api-client';
import { realtime } from '../../lib/socket-client';
import { REALTIME_EVENTS } from '@mivo/shared';

export interface VoiceTicketProposal {
  title: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  category?: string;
  suggestedAssignee?: string;
  communityId?: string;
  speakerName?: string;
}

export interface VoiceTicketConfirmationCardProps {
  proposal: VoiceTicketProposal;
  roomId?: string;
  onConfirm: (createdTicket: any) => void;
  onDismiss: () => void;
}

export const VoiceTicketConfirmationCard: React.FC<VoiceTicketConfirmationCardProps> = ({
  proposal,
  roomId,
  onConfirm,
  onDismiss,
}) => {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [title, setTitle] = React.useState(proposal.title);
  const [priority, setPriority] = React.useState(proposal.priority);
  const [assignee, setAssignee] = React.useState(proposal.suggestedAssignee || 'Unassigned');

  // Handle ticket creation via REST / Socket
  const handleConfirm = React.useCallback(async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      // 1. Try socket confirm if connected
      const socket = realtime.getSocket();
      if (socket && roomId) {
        socket.emit(REALTIME_EVENTS.ROOM_VOICE_TICKET_CONFIRM, {
          roomId,
          ticketProposal: {
            title,
            description: proposal.description || title,
            priority,
            category: proposal.category || 'Engineering',
            suggestedAssignee: assignee,
            communityId: proposal.communityId,
          },
        });
      }

      // 2. Also ensure database persistence via REST
      const res = await api.post<any>('/api/v1/tickets', {
        title,
        description: proposal.description || title,
        priority,
        category: proposal.category || 'Engineering',
        communityId: proposal.communityId,
      });

      if (res.success && res.data) {
        onConfirm(res.data);
      } else {
        onConfirm({
          id: 'ticket-' + Date.now(),
          title,
          priority,
          assignee: { displayName: assignee },
        });
      }
    } catch (err) {
      console.warn('Voice ticket creation fallback:', err);
      onConfirm({
        id: 'ticket-' + Date.now(),
        title,
        priority,
        assignee: { displayName: assignee },
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, title, priority, assignee, proposal, roomId, onConfirm]);

  // Priority color styling
  const getPriorityStyle = (p: string) => {
    switch (p) {
      case 'URGENT':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      case 'HIGH':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'MEDIUM':
        return 'bg-sky-500/20 text-sky-300 border-sky-500/40';
      default:
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    }
  };

  return (
    <div className="w-full max-w-lg p-4 rounded-2xl bg-[var(--bg-surface-0)] border border-[var(--border-subtle)] text-[var(--text-primary)] shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-4 duration-300 relative z-30">
      {/* Top Banner */}
      <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-red-500/10 text-[var(--brand-primary,#dc2626)] border border-red-500/20">
            <Ticket className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-[var(--text-primary)] tracking-wide flex items-center gap-1.5 font-display">
              <span>Spoken Voice-to-Ticket Detected</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-[var(--brand-primary,#dc2626)] font-mono">
                AI Intent
              </span>
            </h4>
            {proposal.speakerName && (
              <p className="text-[11px] text-[var(--text-secondary)]">
                Spoken by <span className="text-[var(--text-primary)] font-medium">{proposal.speakerName}</span>
              </p>
            )}
          </div>
        </div>

        <button
          onClick={onDismiss}
          className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Ticket Details Body */}
      <div className="py-3 space-y-2.5">
        <div>
          <label className="text-xs font-medium text-[var(--text-secondary)] block mb-1">
            Ticket Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-1.5 rounded-lg bg-[var(--bg-surface-1)] border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-primary,#dc2626)] transition-all"
          />
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="text-xs font-medium text-[var(--text-secondary)] block mb-1">
              Priority
            </label>
            <div className="flex items-center gap-1">
              {(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={`px-2 py-1 text-[10px] font-semibold rounded-md border transition-all cursor-pointer ${
                    priority === p ? getPriorityStyle(p) : 'bg-transparent text-[var(--text-secondary)] border-[var(--border-subtle)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-[var(--text-secondary)] block mb-1">
              Assignee
            </label>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--bg-surface-1)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)]">
              <User className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              <input
                type="text"
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                className="bg-transparent border-none text-xs text-[var(--text-primary)] focus:outline-none w-full"
              />
            </div>
          </div>
        </div>

        {proposal.description && (
          <p className="text-[11px] text-[var(--text-secondary)] italic line-clamp-2 bg-[var(--bg-surface-1)] p-2 rounded-lg border border-[var(--border-subtle)]">
            "{proposal.description}"
          </p>
        )}
      </div>

      {/* Action Footer */}
      <div className="pt-2.5 border-t border-[var(--border-subtle)] flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-secondary)]">
          <Volume2 className="w-3 h-3 text-[var(--brand-primary,#dc2626)] animate-pulse" />
          <span>Say <span className="text-[var(--brand-primary,#dc2626)] font-semibold font-mono">"Confirm"</span> or click</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onDismiss}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer"
          >
            Dismiss
          </button>
          <button
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[var(--brand-primary,#dc2626)] hover:brightness-105 active:scale-[0.98] text-xs font-semibold text-white shadow-xs transition-all cursor-pointer disabled:opacity-50"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{isSubmitting ? 'Creating...' : 'Create Ticket'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
