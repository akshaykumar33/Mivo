'use client';

import * as React from 'react';
import { api } from '@/lib/api-client';
import { Sparkles, Key, CheckCircle2, AlertCircle, X, Shield, Cpu, RefreshCw } from 'lucide-react';

export interface GeminiSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GeminiSettingsModal: React.FC<GeminiSettingsModalProps> = ({ isOpen, onClose }) => {
  const [apiKey, setApiKey] = React.useState('');
  const [status, setStatus] = React.useState<'IDLE' | 'TESTING' | 'VALID' | 'INVALID'>('IDLE');
  const [statusMessage, setStatusMessage] = React.useState('');
  const [detectedModel, setDetectedModel] = React.useState('');

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedKey = localStorage.getItem('mivo_gemini_api_key') || '';
      setApiKey(savedKey);
      if (savedKey) {
        setStatus('VALID');
        setStatusMessage('Custom Gemini API Key active');
        setDetectedModel('gemini-3.8-flash / gemini-flash-latest');
      }
    }
  }, [isOpen]);

  const handleTestAndSaveKey = async () => {
    if (!apiKey.trim()) {
      localStorage.removeItem('mivo_gemini_api_key');
      setStatus('IDLE');
      setStatusMessage('Key removed. Using default smart AI engine.');
      return;
    }

    setStatus('TESTING');
    setStatusMessage('Connecting to Google Gemini REST API...');

    try {
      const res = await api.post<{ valid: boolean; model: string; message: string }>('/api/v1/ai/verify-key', {
        apiKey: apiKey.trim(),
      });

      if (res.success && res.data?.valid) {
        localStorage.setItem('mivo_gemini_api_key', apiKey.trim());
        setStatus('VALID');
        setStatusMessage(res.data.message || 'Key connected and saved successfully!');
        setDetectedModel(res.data.model || 'gemini-3.8-flash');
      } else {
        setStatus('INVALID');
        setStatusMessage(res.data?.message || 'Invalid Gemini API key. Please check key permissions.');
      }
    } catch (err: any) {
      setStatus('INVALID');
      setStatusMessage(err?.message || 'Connection failed.');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="gemini-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200"
    >
      {/* Backdrop */}
      <div onClick={onClose} className="fixed inset-0 cursor-pointer" />

      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-3xl bg-[var(--bg-surface-0)] border border-[var(--border-subtle)] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)] p-5 sm:p-6 space-y-5 select-none z-10 custom-scrollbar text-[var(--text-primary)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[var(--brand-primary,#dc2626)]/15 border border-[var(--brand-primary,#dc2626)]/30 flex items-center justify-center text-[var(--brand-primary,#dc2626)] shadow-sm">
              <Sparkles className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 id="gemini-modal-title" className="text-sm font-bold text-[var(--text-primary)] font-display">Gemini AI Configuration</h3>
              <p className="text-xs text-[var(--text-secondary)]">Gemini 3.7 / 2.5 Pro & Flash Integration</p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Info Banner */}
        <div className="p-3.5 rounded-2xl bg-[var(--bg-surface-1)] border border-[var(--border-subtle)] flex items-start gap-3">
          <Cpu className="w-4 h-4 text-[var(--brand-primary,#dc2626)] flex-shrink-0 mt-0.5" />
          <div className="text-xs text-[var(--text-secondary)] leading-relaxed">
            Mivo utilizes <strong>Google Gemini AI</strong> for real-time translation, automated Meeting Minutes (MOM), and in-call Copilot assistance.
          </div>
        </div>

        {/* API Key Input Field */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-[var(--text-secondary)] flex items-center justify-between">
            <span>Gemini API Key (Optional)</span>
            <span className="text-[10px] text-emerald-500 font-mono font-medium">Stored Locally</span>
          </label>
          <div className="relative flex items-center">
            <Key className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5" />
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--bg-surface-1)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--brand-primary,#dc2626)] focus:ring-1 focus:ring-[var(--brand-primary,#dc2626)]/20 font-mono tracking-wider transition-all shadow-xs"
            />
          </div>
        </div>

        {/* Status Feedback */}
        {statusMessage && (
          <div
            className={`p-3 rounded-xl border text-xs font-medium flex items-center gap-2 ${
              status === 'VALID'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                : status === 'INVALID'
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
                : 'bg-[var(--bg-surface-1)] border-[var(--border-subtle)] text-[var(--text-secondary)]'
            }`}
          >
            {status === 'VALID' ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            ) : status === 'INVALID' ? (
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
            ) : (
              <RefreshCw className="w-4 h-4 flex-shrink-0 animate-spin" />
            )}
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[var(--border-subtle)]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)] transition-colors cursor-pointer"
          >
            Close
          </button>
          <button
            onClick={handleTestAndSaveKey}
            disabled={status === 'TESTING'}
            className="px-5 py-2 rounded-xl bg-[var(--brand-primary,#dc2626)] hover:brightness-105 active:scale-[0.985] text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
          >
            {status === 'TESTING' ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Verifying...</span>
              </>
            ) : (
              <>
                <Shield className="w-3.5 h-3.5" />
                <span>Save & Connect Key</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
