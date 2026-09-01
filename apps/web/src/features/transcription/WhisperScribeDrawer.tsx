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
  Volume2,
  Globe2,
  FileSpreadsheet,
} from 'lucide-react';
import { translationManager, SUPPORTED_LANGUAGES, LanguageOption } from '@/lib/translation-manager';

export interface TranscriptItem {
  id: string;
  speaker: string;
  text: string;
  translatedText?: string;
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
  const [activeTab, setActiveTab] = React.useState<'TRANSCRIPT' | 'NOTES' | 'MOM'>('TRANSCRIPT');
  const [isRecording, setIsRecording] = React.useState(false);
  const [targetLang, setTargetLang] = React.useState<string>('es');
  const [transcripts, setTranscripts] = React.useState<TranscriptItem[]>([
    {
      id: '1',
      speaker: 'Elena Rostova',
      text: 'Starting our architecture sync on WebRTC media pipelines.',
      translatedText: 'Iniciando nuestra sincronización de arquitectura en canalizaciones de medios WebRTC.',
      time: '12:30 PM',
    },
    {
      id: '2',
      speaker: 'Dev Admin',
      text: 'We are ready to deploy the multilingual translation and MOM engine.',
      translatedText: 'Estamos listos para desplegar el motor de traducción multilingüe y MOM.',
      time: '12:31 PM',
    },
  ]);
  const [notes, setNotes] = React.useState<string>(
    `# In-Meeting Notes: #${room.name}\n\n### Key Decisions:\n- [x] Implemented WebRTC Mesh and real-time audio visualizers.\n- [x] Deployed live dual-language subtitle stream and speech synthesis.\n- [x] Configured automated post-call Minutes of Meeting (MOM) email delivery.`
  );
  const [generatedMOM, setGeneratedMOM] = React.useState<string>('');
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

        recognition.onresult = async (event: any) => {
          const current = event.resultIndex;
          const transcriptText = event.results[current][0].transcript;

          if (transcriptText.trim()) {
            const translated = await translationManager.translateText(
              transcriptText.trim(),
              targetLang
            );

            const newItem: TranscriptItem = {
              id: Date.now().toString(),
              speaker: currentUser?.displayName || currentUser?.username || 'Speaker',
              text: transcriptText.trim(),
              translatedText: translated,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            };
            setTranscripts((prev) => [...prev, newItem]);
          }
        };

        recognitionRef.current = recognition;
      }
    }
  }, [currentUser, targetLang]);

  const toggleTranscription = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    } else {
      try {
        recognitionRef.current?.start();
      } catch {}
      setIsRecording(true);
    }
  };

  const handleGenerateMOM = () => {
    const attendees = [currentUser?.displayName || currentUser?.username || 'Dev Admin', 'Elena Rostova', 'Sarah Connor'];
    const momDoc = translationManager.generateMOM(room.name, attendees, transcripts, notes);
    setGeneratedMOM(momDoc);
    setActiveTab('MOM');
  };

  const handleSendEmailSummary = async () => {
    setIsSendingEmail(true);
    setEmailSuccess(null);

    const targetEmail = currentUser?.email || 'dev@mivo.app';
    const targetName = currentUser?.displayName || currentUser?.username || 'Dev Admin';

    try {
      const res = await api.post(`/api/v1/rooms/${room.id}/email-summary`, {
        notes: generatedMOM || notes,
        transcript: transcripts,
        email: targetEmail,
        name: targetName,
      });

      if (res.success) {
        setEmailSuccess(`MOM & transcript emailed to ${targetEmail}!`);
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
    <div className="fixed inset-0 z-50 pointer-events-none flex justify-end">
      {/* Click outside backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto transition-opacity"
      />

      <aside className="relative w-80 sm:w-96 h-full bg-[#090B10] border-l border-white/[0.1] flex flex-col select-none z-50 shadow-2xl pointer-events-auto animate-slide-left">
      {/* Header */}
      <div className="h-14 px-4 border-b border-white/[0.06] flex items-center justify-between bg-gradient-to-r from-violet-600/10 to-transparent">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-violet-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-violet-600/30">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white font-display tracking-tight">Whisper AI Scribe</h3>
            <span className="text-[10px] text-violet-400 font-semibold">Multilingual Translation & MOM</span>
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
          Live ({transcripts.length})
        </button>
        <button
          onClick={() => setActiveTab('NOTES')}
          className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'NOTES'
              ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Notes
        </button>
        <button
          onClick={() => {
            if (!generatedMOM) handleGenerateMOM();
            setActiveTab('MOM');
          }}
          className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'MOM'
              ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          MOM Doc
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

        {/* TRANSCRIPT TAB */}
        {activeTab === 'TRANSCRIPT' && (
          <div className="space-y-3">
            {/* Controls Bar: Dictation + Language Selector */}
            <div className="flex flex-col gap-2 p-3 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">Target Language:</span>
                <select
                  value={targetLang}
                  onChange={(e) => setTargetLang(e.target.value)}
                  className="bg-[#0E1017] border border-white/[0.1] rounded-xl px-2.5 py-1 text-xs text-white focus:outline-none focus:border-violet-500 font-semibold"
                >
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.flag} {lang.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-white/[0.04]">
                <span className="text-[11px] text-slate-400">Microphone Dictation:</span>
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
            </div>

            {/* Transcript Stream */}
            <div className="space-y-2.5 pt-1">
              {transcripts.map((t) => (
                <div
                  key={t.id}
                  className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.04] hover:border-violet-500/30 transition-colors space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-violet-300">{t.speaker}</span>
                    <span className="text-[10px] text-slate-500">{t.time}</span>
                  </div>

                  {/* Original Spoken Text */}
                  <p className="text-xs text-slate-300 leading-relaxed select-text font-medium">
                    {t.text}
                  </p>

                  {/* Translated Text & Audio Synthesizer */}
                  {t.translatedText && (
                    <div className="pt-1 border-t border-white/[0.04] flex items-start justify-between gap-2">
                      <p className="text-xs text-cyan-300 leading-relaxed font-semibold italic">
                        {t.translatedText}
                      </p>
                      <button
                        onClick={() => translationManager.speakText(t.translatedText || t.text, targetLang)}
                        className="p-1 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-white/[0.06] transition-colors flex-shrink-0"
                        title="Listen to Translated Speech (TTS)"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* NOTES TAB */}
        {activeTab === 'NOTES' && (
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

        {/* MOM DOC TAB */}
        {activeTab === 'MOM' && (
          <div className="flex flex-col h-full space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Generated Minutes of Meeting (MOM)
              </span>
              <button
                onClick={handleGenerateMOM}
                className="text-[10px] font-bold text-violet-300 hover:text-white px-2 py-0.5 rounded-lg bg-violet-600/30 border border-violet-500/40"
              >
                Re-generate
              </button>
            </div>
            <textarea
              value={generatedMOM || notes}
              onChange={(e) => setGeneratedMOM(e.target.value)}
              rows={16}
              className="w-full flex-1 p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-xs text-slate-100 font-mono leading-relaxed resize-none"
            />
          </div>
        )}
      </div>

      {/* Footer Dispatch Button */}
      <div className="p-4 bg-[#07080C] border-t border-white/[0.06] space-y-2">
        <button
          onClick={handleSendEmailSummary}
          disabled={isSendingEmail}
          className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-violet-600/30 transition-all disabled:opacity-50"
        >
          <Mail className="w-4 h-4" />
          <span>{isSendingEmail ? 'Dispatching...' : 'Email Official MOM & Notes'}</span>
        </button>
      </div>
    </aside>
  </div>
  );
};
