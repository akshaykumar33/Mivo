'use client';

import * as React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  X,
  Volume2,
  Database,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

export interface FactCheckAlertData {
  hasConflict: boolean;
  speaker?: string;
  statement?: string;
  actualTruth?: string;
  severity?: 'WARNING' | 'CRITICAL';
}

export interface LiveFactCheckHUDProps {
  alert: FactCheckAlertData | null;
  onDismiss: () => void;
  onClarifyOnStage?: (statement: string, truth: string) => void;
}

export const LiveFactCheckHUD: React.FC<LiveFactCheckHUDProps> = ({
  alert,
  onDismiss,
  onClarifyOnStage,
}) => {
  if (!alert || !alert.hasConflict) return null;

  return (
    <div className="fixed top-20 right-4 sm:right-8 z-50 max-w-sm sm:max-w-md w-full animate-slide-in-right select-none shadow-2xl">
      <div className="rounded-3xl bg-[var(--bg-surface-0)]/95 backdrop-blur-xl border border-amber-500/40 p-4 shadow-2xl relative overflow-hidden text-[var(--text-primary)]">
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/25">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-amber-700 dark:text-amber-400 font-display">
                  Silent Fact-Check Notice
                </span>
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-300 text-[10px] font-semibold">
                  Live Audit
                </span>
              </div>
              <span className="text-[11px] text-[var(--text-secondary)]">
                Discrepancy detected with verified records
              </span>
            </div>
          </div>

          <button
            onClick={onDismiss}
            className="p-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.1] text-white/50 hover:text-white transition-all cursor-pointer"
            title="Dismiss fact-check alert"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Statement Comparison Box */}
        <div className="space-y-2 mt-2">
          {/* Spoken Quote */}
          <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs">
            <div className="text-[10px] uppercase font-bold text-white/50 flex items-center gap-1 mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
              <span>Spoken by {alert.speaker || 'Speaker'}</span>
            </div>
            <p className="text-white/80 italic font-sans leading-snug">
              &ldquo;{alert.statement}&rdquo;
            </p>
          </div>

          {/* Database Truth */}
          <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-500/30 text-xs">
            <div className="text-[10px] uppercase font-bold text-amber-400 flex items-center gap-1 mb-1">
              <Database className="w-3 h-3" />
              <span>Verified Record</span>
            </div>
            <p className="text-amber-100 font-semibold leading-snug">
              {alert.actualTruth}
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-[var(--border-subtle)]">
          <button
            onClick={onDismiss}
            className="text-[11px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            Ignore & Dismiss
          </button>

          {onClarifyOnStage && (
            <button
              onClick={() => onClarifyOnStage(alert.statement || '', alert.actualTruth || '')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs shadow-xs transition-all cursor-pointer"
            >
              <Volume2 className="w-3 h-3" />
              <span>Broadcast Correction</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
