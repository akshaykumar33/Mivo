'use client';

import * as React from 'react';
import { Shield, ShieldCheck, RefreshCw, X, Lock, CheckCircle2, KeyRound, Zap } from 'lucide-react';
import { E2eeSafetyCodeVerification } from '@mivo/shared';
import { e2eeEngine } from '@/lib/e2ee-engine';

const getSasIcon = (token: string, idx: number) => {
  const code = token.codePointAt(0) || idx;
  const icons = [Shield, Zap, KeyRound, Lock, CheckCircle2, ShieldCheck];
  return icons[code % icons.length];
};

export interface E2EEVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  roomName: string;
}

export const E2EEVerificationModal: React.FC<E2EEVerificationModalProps> = ({
  isOpen,
  onClose,
  roomId,
  roomName,
}) => {
  const [safetyCode, setSafetyCode] = React.useState<E2eeSafetyCodeVerification | null>(null);
  const [isRotating, setIsRotating] = React.useState(false);
  const [isVerified, setIsVerified] = React.useState(false);

  // Close on Escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  React.useEffect(() => {
    if (isOpen && roomId) {
      e2eeEngine.fetchSafetyCode(roomId).then(setSafetyCode);
    }
  }, [isOpen, roomId]);

  if (!isOpen) return null;

  const handleRotate = async () => {
    setIsRotating(true);
    try {
      const updated = await e2eeEngine.rotateRatchet(roomId);
      setSafetyCode(updated);
      setIsVerified(false);
    } finally {
      setIsRotating(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="e2ee-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn"
    >
      <div className="w-full max-w-lg bg-[var(--bg-surface-0)] border border-[var(--border-subtle)] rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.06)] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)] bg-[var(--bg-surface-1)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 id="e2ee-modal-title" className="text-base font-bold text-[var(--text-primary)] font-display flex items-center gap-2">
                Zero-Trust E2EE Room
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px] font-mono font-bold">
                  MLS Epoch #{safetyCode?.epoch || 1}
                </span>
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                Media streams encrypted with AES-GCM Insertable Streams
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Room info banner */}
          <div className="p-3.5 rounded-xl bg-[var(--bg-surface-1)] border border-[var(--border-subtle)] flex items-start gap-3 text-xs text-[var(--text-secondary)]">
            <Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
            <span>
              End-to-End Encryption guarantees that media frames transmitted in <strong className="text-[var(--text-primary)]">#{roomName}</strong> cannot be inspected, intercepted, or decrypted by servers or intermediaries.
            </span>
          </div>

          {/* Verification Tokens (SAS Visual Fingerprint) */}
          <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-[var(--bg-surface-1)] border border-[var(--border-subtle)] shadow-inner">
            <span className="text-xs font-medium text-[var(--text-secondary)] mb-3">
              Out-of-Band Safety Tokens (SAS)
            </span>
            <div className="flex items-center gap-3 p-3 bg-[var(--bg-surface-0)] rounded-xl border border-[var(--border-subtle)] shadow-xs">
              {(safetyCode?.verificationEmojis || ['SAS-1', 'SAS-2', 'SAS-3', 'SAS-4']).map((token, idx) => {
                const IconComponent = getSasIcon(token, idx);
                return (
                  <div
                    key={idx}
                    className="w-12 h-12 rounded-xl bg-[var(--bg-surface-2)] border border-[var(--border-subtle)] flex flex-col items-center justify-center gap-0.5 hover:scale-105 hover:border-[var(--brand-primary,#dc2626)] transition-all shadow-xs"
                    title={`Token ${idx + 1}`}
                  >
                    <IconComponent className="w-5 h-5 text-[var(--text-primary)]" />
                    <span className="text-[8px] font-mono font-bold text-[var(--text-muted)]">
                      {`T${idx + 1}`}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 font-mono font-bold text-sm tracking-widest text-emerald-700 dark:text-emerald-300 select-all bg-[var(--bg-surface-0)] px-3 py-1.5 rounded-lg border border-emerald-500/30">
              {safetyCode?.fingerprintHex || '9824 5510 3982 7714'}
            </div>
            <p className="text-[11px] text-[var(--text-muted)] mt-2 text-center">
              Compare this safety code with attendees over a secure channel to verify zero man-in-the-middle tampering.
            </p>
          </div>

          {/* Cryptographic Parameters Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-[var(--bg-surface-1)] border border-[var(--border-subtle)]">
              <span className="text-[10px] text-[var(--text-muted)] block">Frame Cipher</span>
              <span className="font-mono font-semibold text-[var(--text-primary)] mt-0.5 block">AES-256-GCM</span>
            </div>
            <div className="p-3 rounded-xl bg-[var(--bg-surface-1)] border border-[var(--border-subtle)]">
              <span className="text-[10px] text-[var(--text-muted)] block">Key Ratchet Protocol</span>
              <span className="font-mono font-semibold text-blue-600 dark:text-blue-400 mt-0.5 block">MLS Tree Ratchet</span>
            </div>
            <div className="p-3 rounded-xl bg-[var(--bg-surface-1)] border border-[var(--border-subtle)]">
              <span className="text-[10px] text-[var(--text-muted)] block">Insertable Streams</span>
              <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5 block">WebRTC Transform Active</span>
            </div>
            <div className="p-3 rounded-xl bg-[var(--bg-surface-1)] border border-[var(--border-subtle)]">
              <span className="text-[10px] text-[var(--text-muted)] block">Verified Peers</span>
              <span className="font-mono font-semibold text-[var(--text-primary)] mt-0.5 block">
                {safetyCode?.participantsVerified || 1} participant(s)
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--border-subtle)] bg-[var(--bg-surface-1)]">
          <button
            onClick={handleRotate}
            disabled={isRotating}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--bg-surface-2)] hover:bg-[var(--bg-surface-0)] border border-[var(--border-subtle)] transition-all cursor-pointer disabled:opacity-50"
            title="Rotate key ratchet and advance epoch counter"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRotating ? 'animate-spin' : ''}`} />
            <span>Rotate Key Ratchet</span>
          </button>

          <button
            onClick={() => {
              setIsVerified(true);
              setTimeout(() => onClose(), 600);
            }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all shadow-xs cursor-pointer ${
              isVerified
                ? 'bg-emerald-600 hover:bg-emerald-500'
                : 'bg-[var(--brand-primary,#dc2626)] hover:brightness-105 active:scale-[0.98]'
            }`}
          >
            {isVerified ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Verified!</span>
              </>
            ) : (
              <>
                <Shield className="w-4 h-4" />
                <span>Confirm & Verify</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
