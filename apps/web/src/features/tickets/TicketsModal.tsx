'use client';

import * as React from 'react';
import { useTicketStore } from '@/stores/ticketStore';
import { TicketPriority, TicketStatus } from '@mivo/shared';
import {
  Ticket,
  Plus,
  X,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FolderOpen,
  Send,
  UserCheck,
  Tag,
  Flame,
} from 'lucide-react';

export const TicketsModal: React.FC = () => {
  const {
    isModalOpen,
    setIsModalOpen,
    tickets,
    isLoading,
    fetchTickets,
    createTicket,
    updateTicket,
  } = useTicketStore();

  const [activeTab, setActiveTab] = React.useState<'LIST' | 'CREATE'>('LIST');
  const [filterStatus, setFilterStatus] = React.useState<string>('ALL');

  // Form state
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [category, setCategory] = React.useState('Technical');
  const [priority, setPriority] = React.useState<TicketPriority>('MEDIUM');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Close on Escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsModalOpen(false);
      }
    };
    if (isModalOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, setIsModalOpen]);

  React.useEffect(() => {
    if (isModalOpen) {
      fetchTickets();
    }
  }, [isModalOpen, fetchTickets]);

  if (!isModalOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setErrorMsg('Title and description are required.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const created = await createTicket({
        title,
        description,
        category,
        priority,
      });

      if (created) {
        setTitle('');
        setDescription('');
        setActiveTab('LIST');
      } else {
        setErrorMsg('Failed to create ticket. Please try again.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error creating ticket');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (ticketId: string, newStatus: TicketStatus) => {
    await updateTicket(ticketId, { status: newStatus });
  };

  const filteredTickets = tickets.filter((t) => {
    if (filterStatus === 'ALL') return true;
    return t.status === filterStatus;
  });

  const getPriorityBadge = (p: TicketPriority) => {
    switch (p) {
      case 'URGENT':
        return 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30';
      case 'HIGH':
        return 'bg-amber-500/15 text-amber-800 dark:text-amber-400 border-amber-500/30';
      case 'MEDIUM':
        return 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30';
      case 'LOW':
        return 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-400 border-emerald-500/30';
    }
  };

  const getStatusBadge = (s: TicketStatus) => {
    switch (s) {
      case 'OPEN':
        return 'bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/25';
      case 'IN_PROGRESS':
        return 'bg-violet-500/15 text-violet-700 dark:text-violet-400 border-violet-500/25';
      case 'RESOLVED':
        return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/25';
      case 'CLOSED':
        return 'bg-[var(--bg-surface-2)] text-[var(--text-secondary)] border-[var(--border-subtle)]';
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tickets-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-fade-in select-none"
    >
      {/* Backdrop */}
      <div
        onClick={() => setIsModalOpen(false)}
        className="fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity"
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-2xl max-h-[92vh] sm:max-h-[85vh] bg-[var(--bg-surface-0)] border border-[var(--border-subtle)] rounded-3xl shadow-[0_24px_80px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-2xl flex flex-col overflow-hidden z-10 animate-scale-up">
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-shrink-0 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[var(--brand-primary,#dc2626)] flex items-center justify-center shadow-xs flex-shrink-0 text-white">
              <Ticket className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <h2 id="tickets-modal-title" className="text-base font-bold text-[var(--text-primary)] font-display tracking-tight truncate">
                Support & Issues Hub
              </h2>
              <p className="text-xs text-[var(--text-secondary)] truncate">
                Manage incident reports, feature requests, & service tickets
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-[var(--bg-surface-1)] rounded-xl p-1 border border-[var(--border-subtle)]">
              <button
                onClick={() => setActiveTab('LIST')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'LIST'
                    ? 'bg-[var(--brand-primary,#dc2626)] text-white shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                Tickets ({tickets.length})
              </button>
              <button
                onClick={() => setActiveTab('CREATE')}
                className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'CREATE'
                    ? 'bg-[var(--brand-primary,#dc2626)] text-white shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Plus className="w-3 h-3" />
                Create
              </button>
            </div>

            <button
              onClick={() => setIsModalOpen(false)}
              aria-label="Close dialog"
              className="w-8 h-8 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        {activeTab === 'CREATE' ? (
          <form onSubmit={handleCreate} className="p-6 space-y-4 overflow-y-auto">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-700 dark:text-rose-400">
                {errorMsg}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Ticket Title
              </label>
              <input
                type="text"
                placeholder="e.g. Realtime audio drops on Safari or New Room feature"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-surface-1)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] placeholder:[var(--text-muted)] focus:outline-none focus:border-[var(--brand-primary,#dc2626)] focus:ring-1 focus:ring-[var(--brand-primary,#dc2626)]/20 transition-all shadow-xs"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-surface-1)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-primary,#dc2626)] cursor-pointer"
                >
                  <option value="Technical">Technical Bug</option>
                  <option value="Feature">Feature Request</option>
                  <option value="Billing">Billing & Plan</option>
                  <option value="Security">Security & Access</option>
                  <option value="General">General Inquiry</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TicketPriority)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-surface-1)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-primary,#dc2626)] cursor-pointer"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Description & Reproduction Steps
              </label>
              <textarea
                placeholder="Provide detailed context, steps to reproduce, or requirements..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-surface-1)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] placeholder:[var(--text-muted)] focus:outline-none focus:border-[var(--brand-primary,#dc2626)] focus:ring-1 focus:ring-[var(--brand-primary,#dc2626)]/20 resize-none transition-all shadow-xs"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActiveTab('LIST')}
                className="px-4 py-2 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[var(--brand-primary,#dc2626)] hover:brightness-105 active:scale-[0.98] text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Submitting...' : 'Submit Ticket'}</span>
              </button>
            </div>
          </form>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Status Filter Bar */}
            <div className="px-6 py-2 border-b border-[var(--border-subtle)] flex items-center gap-2 overflow-x-auto scrollbar-none flex-shrink-0 bg-black/[0.01]">
              {['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    filterStatus === st
                      ? 'bg-[var(--brand-primary,#dc2626)] text-white shadow-xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {st.replace('_', ' ')}
                </button>
              ))}
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5 scrollbar-thin">
              {isLoading && tickets.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3">
                  <div className="w-8 h-8 border-2 border-[var(--brand-primary,#dc2626)] border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs text-[var(--text-secondary)]">Loading tickets...</span>
                </div>
              ) : filteredTickets.length === 0 ? (
                <div className="py-16 flex flex-col items-center justify-center text-center px-4">
                  <div className="w-14 h-14 rounded-2xl bg-black/5 dark:bg-white/5 border border-[var(--border-subtle)] flex items-center justify-center mb-3">
                    <Ticket className="w-7 h-7 text-[var(--text-secondary)]/50" />
                  </div>
                  <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">
                    No tickets found
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] max-w-xs mb-3">
                    Submit your first ticket or bug report using the create button above.
                  </p>
                  <button
                    onClick={() => setActiveTab('CREATE')}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-[var(--brand-primary,#dc2626)] border border-red-500/20 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Create Ticket
                  </button>
                </div>
              ) : (
                filteredTickets.map((t) => (
                  <div
                    key={t.id}
                    className="p-3.5 rounded-2xl bg-[var(--bg-surface-1)] hover:bg-[var(--bg-surface-2)] border border-[var(--border-subtle)] hover:border-black/10 transition-all duration-200"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="text-xs font-bold text-[var(--text-primary)] font-display truncate">
                          {t.title}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${getPriorityBadge(
                            t.priority
                          )}`}
                        >
                          {t.priority}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${getStatusBadge(
                            t.status
                          )}`}
                        >
                          {t.status.replace('_', ' ')}
                        </span>
                      </div>

                      <span className="text-[10px] text-[var(--text-secondary)] flex-shrink-0">
                        #{t.id.slice(0, 8)}
                      </span>
                    </div>

                    <p className="text-xs text-[var(--text-secondary)] line-clamp-2 leading-relaxed mb-3">
                      {t.description}
                    </p>

                    <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)] text-[11px] text-[var(--text-secondary)]">
                      <div className="flex items-center gap-2">
                        <span>Category: {t.category}</span>
                        <span>•</span>
                        <span>By {t.creator?.displayName || t.creator?.username || 'User'}</span>
                      </div>

                      {/* Status Change Controls */}
                      <div className="flex items-center gap-1.5">
                        {t.status !== 'RESOLVED' && (
                          <button
                            onClick={() => handleStatusChange(t.id, 'RESOLVED')}
                            className="px-2 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 text-[10px] font-semibold transition-colors cursor-pointer"
                          >
                            Resolve
                          </button>
                        )}
                        {t.status !== 'CLOSED' && (
                          <button
                            onClick={() => handleStatusChange(t.id, 'CLOSED')}
                            className="px-2 py-1 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-[10px] font-semibold transition-colors cursor-pointer"
                          >
                            Close
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[var(--border-subtle)] bg-black/[0.01] flex items-center justify-between text-xs text-[var(--text-secondary)] flex-shrink-0">
          <span>Tickets sync automatically in real-time</span>
          <button
            onClick={() => setIsModalOpen(false)}
            className="px-4 py-1.5 rounded-xl bg-[var(--bg-surface-1)] hover:bg-[var(--bg-surface-2)] text-[var(--text-primary)] border border-[var(--border-subtle)] font-medium transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
