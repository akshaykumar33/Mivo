'use client';

import * as React from 'react';
import { AlertCircle, CheckCircle2, PhoneOff } from 'lucide-react';

export interface RecordingConsentBannerProps {
  isRecording: boolean;
  hostName: string;
  onConsentDismiss: () => void;
  onLeaveCall: () => void;
}

export const RecordingConsentBanner: React.FC<RecordingConsentBannerProps> = ({
  isRecording,
  hostName,
  onConsentDismiss,
  onLeaveCall,
}) => {
  const [dismissed, setDismissed] = React.useState(false);

  React.useEffect(() => {
    if (!isRecording) {
      setDismissed(false);
    }
  }, [isRecording]);

  if (!isRecording || dismissed) return null;

  return (
    <div className="w-full bg-rose-950/90 border-b border-rose-800/80 px-4 py-2.5 backdrop-blur-2xl flex flex-wrap items-center justify-between gap-3 text-xs text-white z-40 animate-fade-in shadow-2xl">
      <div className="flex items-center gap-2.5">
        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping flex-shrink-0" />
        <span className="font-bold text-rose-200">
          🔴 Meeting Recording Active:
        </span>
        <span className="text-slate-200">
          <strong className="text-white">{hostName}</strong> has started recording this session. By staying in the room, you acknowledge and consent to being recorded.
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setDismissed(true)}
          className="px-3 py-1 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition-colors"
        >
          I Consent
        </button>
        <button
          onClick={onLeaveCall}
          className="px-3 py-1 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-slate-300 hover:text-white font-semibold text-xs transition-colors"
        >
          Leave Call
        </button>
      </div>
    </div>
  );
};
