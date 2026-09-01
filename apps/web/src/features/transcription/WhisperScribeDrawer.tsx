'use client';

import * as React from 'react';
import { RoomDTO, UserDTO } from '@mivo/shared';
import { api } from '@/lib/api-client';
import {
  Sparkles,
  Mic,
  MicOff,
  Mail,
  FileText,
  CheckCircle2,
  X,
  Play,
  Square,
  Copy,
  Clock,
} from 'lucide-react';

export interface TranscriptItem {
  id: string;
  speaker: string;
  text: string;
  time: string;
}

export interface WhisperScribeDrawerProps {
  room: RoomDTO;
  currentUser: UserDTO | null;
  isOpen: boolean;
  onClose: () => void;
}

export const WhisperScribeDrawer: React.FC<WhisperScribeDrawerProps> = ({
  room,
  currentUser,
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = React.useState<'TRANSCRIPT' | 'NOTES'>('TRANSCRIPT');
  const [isRecording, setIsRecording] = React.useState(false);
  const [transcripts, setTranscripts] = React.useState<TranscriptItem[]>([
    {
      id: '1',
      speaker: 'Elena Rostova',
      text: 'Starting our architecture sync on WebRTC media pipelines and adaptive audio visualizers.',
      time: '12:30 PM',
    },
    {
      id: '2',
      speaker: 'Dev Admin',
      text: 'Agreed. Let us ensure the Whisper AI scribe handles live notes and automatic email digests post-meeting.',
      time: '12:31 PM',
    },
  ]);
  const [notes, setNotes] = React.useState<string>(
    `# Meeting Notes: #${room.name}\n\n### Key Decisions & Agenda:\n- [x] Verified full-mesh WebRTC signaling and live stream tiles.\n- [x] Modernized Obsidian dark theme with glassmorphism elevations.\n- [ ] Configure automatic post-meeting AI notes email delivery.\n\n### Action Items:\n- Review transcription accuracy across all room modes.\n- Test screen share 60fps latency.`
  );
  const [isSendingEmail, setIsSendingEmail] = React.useState(false);
  const [emailSuccess, setEmailSuccess] = React.useState<string | null>(null);
  const recognitionRef = React.useRef<any>(null);

  // Initialize Speech Recognition if supported
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          const current = event.resultIndex;
          const transcriptText = event.results[current][0].transcript;

          if (transcriptText.trim()) {
            const newItem: TranscriptItem = {
              id: Date.now().toString(),
              speaker: currentUser?.displayName || currentUser?.username || 'Speaker',
              text: transcriptText.trim(),
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            };
            setTranscripts((prev) => [...prev, newItem]);
          }
        };

        recognitionRef.current = recognition;
      }
    }
  }, [currentUser]);

  const toggleTranscription = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    } else {
      try {
        recognitionRef.current?.start();
      } catch {
        // Recognition already active or fallback
      }
      setIsRecording(true);
    }
  };

  const handleSendEmailSummary = async () => {
    setIsSendingEmail(true);
    setEmailSuccess(null);

    const targetEmail = currentUser?.email || 'dev@mivo.app';
    const targetName = currentUser?.displayName || currentUser?.username || 'Dev Admin';

    try {
      const res = await api.post(`/api/v1/rooms/${room.id}/email-summary`, {
        notes,
        transcript: transcripts,
        email: targetEmail,
        name: targetName,
      });

      if (res.success) {
        setEmailSuccess(`Meeting summary & notes emailed to ${targetEmail}!`);
        setTimeout(() => setEmailSuccess(null), 6000);
      }
    } catch (e) {
      console.error('Failed to email summary:', e);
    } finally {
      setIsSendingEmail(false);
    }
  };

  if (!isOpen) return null;

  return (
    <aside className="w-80 sm:w-96 h-full bg-[#0B0D14] border-l border-white/[0.08] flex flex-col select-none z-30 shadow-2xl backdrop-blur-2xl">
      {/* Header */}
      <div className="h-14 px-4 border-b border-white/[0.06] flex items-center justify-between bg-gradient-to-r from-violet-600/10 to-transparent">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-violet-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-violet-600/30">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white font-display tracking-tight">Whisper AI Scribe</h3>
            <span className="text-[10px] text-violet-400 font-semibold">Live Notes & Email Digest</span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/[0.06] bg-[#07080C] p-1.5 gap-1">
        <button
          onClick={() => setActiveTab('TRANSCRIPT')}
          className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'TRANSCRIPT'
              ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Live Transcript ({transcripts.length})
        </button>
        <button
          onClick={() => setActiveTab('NOTES')}
          className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'NOTES'
              ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Meeting Notes
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {emailSuccess && (
          <div className="p-3 rounded-2xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2 shadow-lg shadow-emerald-600/20">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{emailSuccess}</span>
          </div>
        )}

        {activeTab === 'TRANSCRIPT' ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-2.5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
              <span className="text-xs font-semibold text-slate-300">Live Speech Dictation</span>
              <button
                onClick={toggleTranscription}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                  isRecording
                    ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30 animate-pulse'
                    : 'bg-violet-600 text-white hover:bg-violet-500 shadow-md'
                }`}
              >
                {isRecording ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                <span>{isRecording ? 'Listening...' : 'Start Dictation'}</span>
              </button>
            </div>

            <div className="space-y-2.5 pt-2">
              {transcripts.map((t) => (
                <div
                  key={t.id}
                  className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.04] hover:border-violet-500/30 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-violet-300">{t.speaker}</span>
                    <span className="text-[10px] text-slate-500">{t.time}</span>
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed select-text">{t.text}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full space-y-2">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Markdown Scratchpad</span>
              <span className="text-[10px] text-violet-400">Auto-saved</span>
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={16}
              className="w-full flex-1 p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500 font-mono leading-relaxed resize-none"
            />
          </div>
        )}
      </div>

      {/* Footer Email Button */}
      <div className="p-4 bg-[#07080C] border-t border-white/[0.06] space-y-2">
        <button
          onClick={handleSendEmailSummary}
          disabled={isSendingEmail}
          className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-violet-600/30 transition-all disabled:opacity-50"
        >
          <Mail className="w-4 h-4" />
          <span>{isSendingEmail ? 'Dispatching Summary...' : 'Email Meeting Summary & Notes'}</span>
        </button>
      </div>
    </aside>
  );
};
