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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Frosted Glass Backdrop */}
      <div onClick={onClose} className="fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity" />

      {/* Apple Vision Pro Modal Card */}
      <div className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-[28px] bg-[#0A0C14]/95 border border-white/[0.14] backdrop-blur-3xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] p-4 sm:p-6 space-y-5 select-none animate-slide-up z-10 custom-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[14px] bg-gradient-to-tr from-[#BF5AF2] via-[#5E5CE6] to-[#0A84FF] flex items-center justify-center text-white shadow-[0_4px_16px_rgba(191,90,242,0.4)]">
              <Sparkles className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white font-display">Gemini AI Configuration</h3>
              <p className="text-xs text-white/50">Gemini 3.7 / 2.5 Pro & Flash Integration</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-[10px] text-white/40 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Info Banner */}
        <div className="p-3.5 rounded-[18px] bg-gradient-to-r from-[#5E5CE6]/10 via-[#BF5AF2]/10 to-transparent border border-[#5E5CE6]/20 flex items-start gap-3">
          <Cpu className="w-4 h-4 text-[#BF5AF2] flex-shrink-0 mt-0.5" />
          <div className="text-xs text-white/80 leading-relaxed">
            Mivo utilizes <strong>Google Gemini AI</strong> for real-time translation, automated Meeting Minutes (MOM), and in-call Copilot assistance.
          </div>
        </div>

        {/* API Key Input Field */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-white/70 flex items-center justify-between">
            <span>Gemini API Key (Optional)</span>
            <span className="text-[10px] text-[#30D158] font-mono font-bold">Stored Locally & Securely</span>
          </label>
          <div className="relative flex items-center">
            <Key className="w-4 h-4 text-white/40 absolute left-3.5" />
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full pl-10 pr-4 py-2.5 rounded-[14px] bg-white/[0.04] border border-white/[0.09] text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#5E5CE6] font-mono tracking-wider transition-all"
            />
          </div>
        </div>

        {/* Status Feedback */}
        {statusMessage && (
          <div
            className={`p-3 rounded-[14px] border text-xs font-semibold flex items-center gap-2 ${
              status === 'VALID'
                ? 'bg-[#30D158]/15 border-[#30D158]/40 text-[#30D158]'
                : status === 'INVALID'
                ? 'bg-[#FF453A]/15 border-[#FF453A]/40 text-[#FF453A]'
                : 'bg-white/[0.04] border-white/[0.08] text-white/70'
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
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/[0.08]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-[12px] text-xs font-semibold text-white/60 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
          >
            Close
          </button>
          <button
            onClick={handleTestAndSaveKey}
            disabled={status === 'TESTING'}
            className="px-5 py-2 rounded-[12px] bg-gradient-to-r from-[#5E5CE6] to-[#0A84FF] text-white text-xs font-bold shadow-[0_4px_16px_rgba(94,92,230,0.4)] hover:scale-102 transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
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
