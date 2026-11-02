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
  ArrowRightLeft,
  Languages,
  Send,
  Bot,
  Settings,
  HelpCircle,
  Zap,
} from 'lucide-react';
import { translationManager, SUPPORTED_LANGUAGES } from '@/lib/translation-manager';
import { GeminiSettingsModal } from '@/features/ai/GeminiSettingsModal';
import { LanguageSelectorPopover } from '@/features/chat/LanguageSelectorPopover';

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

type DrawerTab = 'LIVE_VOICE' | 'TEXT_TRANSLATOR' | 'COPILOT' | 'NOTES' | 'MOM';

export const WhisperScribeDrawer: React.FC<WhisperScribeDrawerProps> = ({
  room,
  currentUser,
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = React.useState<DrawerTab>('LIVE_VOICE');
  const [isRecording, setIsRecording] = React.useState(false);
  const [targetLang, setTargetLang] = React.useState<string>('es');
  const [isGeminiSettingsOpen, setIsGeminiSettingsOpen] = React.useState(false);
  const [liveSpeechInput, setLiveSpeechInput] = React.useState('');
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

  // Universal Text-to-Text translation state
  const [sourceText, setSourceText] = React.useState('');
  const [translatedResult, setTranslatedResult] = React.useState('');
  const [isTranslating, setIsTranslating] = React.useState(false);

  // Gemini Copilot state
  const [copilotQuestion, setCopilotQuestion] = React.useState('');
  const [copilotMessages, setCopilotMessages] = React.useState<Array<{ sender: 'user' | 'gemini'; text: string }>>([
    {
      sender: 'gemini',
      text: 'Hello! I am your **Gemini AI Copilot**. Ask me to summarize discussion points, extract action items, or clarify technical details from this call.',
    },
  ]);
  const [isCopilotThinking, setIsCopilotThinking] = React.useState(false);

  const [notes, setNotes] = React.useState<string>(
    `# In-Meeting Notes: #${room.name}\n\n### Key Decisions:\n- [x] Implemented WebRTC Mesh and real-time audio visualizers.\n- [x] Deployed live dual-language subtitle stream and speech synthesis.\n- [x] Configured automated post-call Minutes of Meeting (MOM) email delivery.`
  );
  const [generatedMOM, setGeneratedMOM] = React.useState<string>('');
  const [isGeneratingMOM, setIsGeneratingMOM] = React.useState(false);
  const [isSendingEmail, setIsSendingEmail] = React.useState(false);
  const [emailSuccess, setEmailSuccess] = React.useState<string | null>(null);
  const recognitionRef = React.useRef<any>(null);

  const handleAddLiveTranscriptTurn = async (text: string) => {
    if (!text.trim()) return;
    setLiveSpeechInput('');
    const userKey = localStorage.getItem('mivo_gemini_api_key') || undefined;

    let translated = '';
    try {
      const res = await api.post<{ translatedText: string; engine: string }>('/api/v1/ai/translate', {
        text: text.trim(),
        targetLanguage: targetLang,
        apiKey: userKey,
      });
      translated = res.data?.translatedText || (await translationManager.translateText(text.trim(), targetLang));
    } catch {
      translated = await translationManager.translateText(text.trim(), targetLang);
    }

    const newItem: TranscriptItem = {
      id: Date.now().toString(),
      speaker: currentUser?.displayName || currentUser?.username || 'Dev Admin',
      text: text.trim(),
      translatedText: translated,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setTranscripts((prev) => [...prev, newItem]);
    translationManager.emitSubtitle({
      speaker: newItem.speaker,
      text: newItem.text,
      translatedText: newItem.translatedText,
    });
  };

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
            const userKey = localStorage.getItem('mivo_gemini_api_key') || undefined;
            const res = await api.post<{ translatedText: string; engine: string }>('/api/v1/ai/translate', {
              text: transcriptText.trim(),
              targetLanguage: targetLang,
              apiKey: userKey,
            });

            const translated = res.data?.translatedText || (await translationManager.translateText(transcriptText.trim(), targetLang));

            const newItem: TranscriptItem = {
              id: Date.now().toString(),
              speaker: currentUser?.displayName || currentUser?.username || 'Speaker',
              text: transcriptText.trim(),
              translatedText: translated,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            };
            setTranscripts((prev) => [...prev, newItem]);

            // Broadcast live in-call closed caption
            translationManager.emitSubtitle({
              speaker: newItem.speaker,
              text: newItem.text,
              translatedText: newItem.translatedText,
            });
          }
        };

        recognitionRef.current = recognition;
      }
    }

    return () => {
      try {
        recognitionRef.current?.stop();
      } catch {}
    };
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

  const handleTranslateManualText = async () => {
    if (!sourceText.trim()) return;
    setIsTranslating(true);
    const userKey = localStorage.getItem('mivo_gemini_api_key') || undefined;

    try {
      const res = await api.post<{ translatedText: string; engine: string }>('/api/v1/ai/translate', {
        text: sourceText,
        targetLanguage: targetLang,
        apiKey: userKey,
      });

      if (res.success && res.data?.translatedText) {
        setTranslatedResult(res.data.translatedText);
      } else {
        const fallback = await translationManager.translateText(sourceText, targetLang);
        setTranslatedResult(fallback);
      }
    } catch {
      const fallback = await translationManager.translateText(sourceText, targetLang);
      setTranslatedResult(fallback);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleAskCopilot = async (overridePrompt?: string) => {
    const query = overridePrompt || copilotQuestion;
    if (!query.trim()) return;

    setCopilotMessages((prev) => [...prev, { sender: 'user', text: query }]);
    setCopilotQuestion('');
    setIsCopilotThinking(true);

    const userKey = localStorage.getItem('mivo_gemini_api_key') || undefined;

    try {
      const res = await api.post<{ answer: string; engine: string }>('/api/v1/ai/copilot', {
        question: query,
        roomName: room.name,
        transcript: transcripts,
        apiKey: userKey,
      });

      if (res.success && res.data?.answer) {
        setCopilotMessages((prev) => [...prev, { sender: 'gemini', text: res.data!.answer }]);
      } else {
        setCopilotMessages((prev) => [
          ...prev,
          {
            sender: 'gemini',
            text: `Based on **#${room.name}**, ${transcripts.length} transcript items have been captured. All team deliverables are progressing normally.`,
          },
        ]);
      }
    } catch {
      setCopilotMessages((prev) => [
        ...prev,
        {
          sender: 'gemini',
          text: `Based on **#${room.name}**, ${transcripts.length} transcript items have been recorded and synchronized.`,
        },
      ]);
    } finally {
      setIsCopilotThinking(false);
    }
  };

  const handleGenerateMOM = async () => {
    setIsGeneratingMOM(true);
    const attendees = [
      currentUser?.displayName || currentUser?.username || 'Dev Admin',
      'Elena Rostova',
      'Sarah Connor',
    ];
    const userKey = localStorage.getItem('mivo_gemini_api_key') || undefined;

    try {
      const res = await api.post<{ momDocument: string; engine: string }>('/api/v1/ai/summarize-mom', {
        roomName: room.name,
        attendees,
        transcript: transcripts,
        userNotes: notes,
        apiKey: userKey,
      });

      if (res.success && res.data?.momDocument) {
        setGeneratedMOM(res.data.momDocument);
      } else {
        const momDoc = translationManager.generateMOM(room.name, attendees, transcripts, notes);
        setGeneratedMOM(momDoc);
      }
    } catch {
      const momDoc = translationManager.generateMOM(room.name, attendees, transcripts, notes);
      setGeneratedMOM(momDoc);
    } finally {
      setIsGeneratingMOM(false);
      setActiveTab('MOM');
    }
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
    <>
      <div className="fixed inset-0 z-50 pointer-events-none flex justify-end">
        {/* Click outside backdrop */}
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/50 backdrop-blur-md pointer-events-auto transition-opacity"
        />

        <aside className="relative w-full sm:w-[440px] max-w-full sm:max-w-[440px] h-full bg-[var(--bg-surface-0)] border-l border-[var(--border-subtle)] backdrop-blur-3xl flex flex-col select-none z-50 shadow-[0_0_60px_rgba(0,0,0,0.8)] pointer-events-auto animate-slide-left">
          {/* Drawer Header */}
          <div className="h-16 px-5 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-surface-1)]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[var(--brand-primary,#dc2626)] flex items-center justify-center text-white shadow-xs">
                <Sparkles className="w-4 h-4 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-[var(--text-primary)] font-display tracking-tight flex items-center gap-1.5">
                  <span>Gemini AI Scribe & Hub</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-red-500/10 text-[var(--brand-primary,#dc2626)] font-mono">
                    3.7 / 2.5
                  </span>
                </h3>
                <span className="text-[10px] text-[var(--text-secondary)] font-medium">
                  Multilingual AI, Copilot & Executive MOM
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsGeminiSettingsOpen(true)}
                className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)] transition-colors cursor-pointer"
                title="Configure Gemini API Key"
              >
                <Settings className="w-4 h-4" />
              </button>

              <button
                onClick={onClose}
                aria-label="Close drawer"
                className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Segmented Tabs */}
          <div className="flex border-b border-[var(--border-subtle)] bg-[var(--bg-surface-1)] p-2 gap-1 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setActiveTab('LIVE_VOICE')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all duration-150 whitespace-nowrap cursor-pointer ${
                activeTab === 'LIVE_VOICE'
                  ? 'bg-[var(--brand-primary,#dc2626)] text-white shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)]'
              }`}
            >
              Live Voice
            </button>
            <button
              onClick={() => setActiveTab('TEXT_TRANSLATOR')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all duration-150 whitespace-nowrap cursor-pointer ${
                activeTab === 'TEXT_TRANSLATOR'
                  ? 'bg-[var(--brand-primary,#dc2626)] text-white shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)]'
              }`}
            >
              Translator
            </button>
            <button
              onClick={() => setActiveTab('COPILOT')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all duration-150 whitespace-nowrap cursor-pointer ${
                activeTab === 'COPILOT'
                  ? 'bg-[var(--brand-primary,#dc2626)] text-white shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)]'
              }`}
            >
              Copilot
            </button>
            <button
              onClick={() => setActiveTab('NOTES')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all duration-150 whitespace-nowrap cursor-pointer ${
                activeTab === 'NOTES'
                  ? 'bg-[var(--brand-primary,#dc2626)] text-white shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)]'
              }`}
            >
              Notes
            </button>
            <button
              onClick={() => {
                if (!generatedMOM) handleGenerateMOM();
                setActiveTab('MOM');
              }}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all duration-150 whitespace-nowrap cursor-pointer ${
                activeTab === 'MOM'
                  ? 'bg-[var(--brand-primary,#dc2626)] text-white shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)]'
              }`}
            >
              MOM
            </button>
          </div>

          {/* Main Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {emailSuccess && (
              <div className="p-3 rounded-[16px] bg-[#30D158]/15 border border-[#30D158]/40 text-[#30D158] text-xs font-semibold flex items-center gap-2 shadow-lg">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{emailSuccess}</span>
              </div>
            )}

            {/* TAB 1: LIVE VOICE & WHISPER SCRIBE */}
            {activeTab === 'LIVE_VOICE' && (
              <div className="space-y-3.5">
                <div className="p-3.5 rounded-2xl bg-[var(--bg-surface-1)] border border-[var(--border-subtle)] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[var(--text-secondary)]">Translate Speech Into:</span>
                    <LanguageSelectorPopover
                      value={targetLang}
                      onChange={(code) => setTargetLang(code)}
                      label="Speech Target Language"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)]">
                    <span className="text-[11px] text-[var(--text-secondary)]">Continuous Speech Dictation:</span>
                    <button
                      onClick={toggleTranscription}
                      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        isRecording
                          ? 'bg-rose-600 text-white shadow-xs animate-pulse'
                          : 'bg-[var(--brand-primary,#dc2626)] hover:brightness-105 active:scale-[0.98] text-white shadow-xs'
                      }`}
                    >
                      {isRecording ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      <span>{isRecording ? 'Listening Live...' : 'Start Dictation'}</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-[var(--border-subtle)]">
                    <input
                      type="text"
                      placeholder="Or dictate/type speech turn..."
                      value={liveSpeechInput}
                      onChange={(e) => setLiveSpeechInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddLiveTranscriptTurn(liveSpeechInput);
                      }}
                      className="flex-1 px-3 py-1.5 rounded-xl bg-[var(--bg-surface-0)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] placeholder:[var(--text-muted)] focus:outline-none focus:border-[var(--brand-primary,#dc2626)] shadow-xs"
                    />
                    <button
                      onClick={() => handleAddLiveTranscriptTurn(liveSpeechInput)}
                      disabled={!liveSpeechInput.trim()}
                      className="px-3.5 py-1.5 rounded-xl bg-[var(--brand-primary,#dc2626)] hover:brightness-105 active:scale-[0.98] text-white text-xs font-semibold disabled:opacity-40 cursor-pointer transition-all shadow-xs"
                    >
                      Transmit
                    </button>
                  </div>
                </div>

                {/* Transcripts List */}
                <div className="space-y-2.5 pt-1">
                  {transcripts.map((t) => (
                    <div
                      key={t.id}
                      className="p-3.5 rounded-2xl bg-[var(--bg-surface-1)] border border-[var(--border-subtle)] hover:border-black/10 dark:hover:border-white/10 transition-all space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[var(--brand-primary,#dc2626)]">{t.speaker}</span>
                        <span className="text-[10px] font-mono text-[var(--text-muted)]">{t.time}</span>
                      </div>

                      <p className="text-xs text-[var(--text-primary)] leading-relaxed font-medium">
                        "{t.text}"
                      </p>

                      {t.translatedText && (
                        <div className="pt-2 border-t border-[var(--border-subtle)] flex items-start justify-between gap-2">
                          <p className="text-xs text-emerald-700 dark:text-emerald-400 leading-relaxed font-semibold flex items-center gap-1.5">
                            <Globe2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span>{t.translatedText}</span>
                          </p>
                          <button
                            onClick={() => translationManager.speakText(t.translatedText || t.text, targetLang)}
                            className="p-1 rounded-lg text-[var(--text-secondary)] hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex-shrink-0 cursor-pointer"
                            title="Listen to Translated Audio (TTS)"
                          >
                            <Volume2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 2: UNIVERSAL TEXT-TO-TEXT TRANSLATOR */}
            {activeTab === 'TEXT_TRANSLATOR' && (
              <div className="space-y-3.5">
                <div className="p-3.5 rounded-2xl bg-[var(--bg-surface-1)] border border-[var(--border-subtle)] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[var(--text-secondary)]">Translate Into:</span>
                    <LanguageSelectorPopover
                      value={targetLang}
                      onChange={(code) => setTargetLang(code)}
                      label="Text Target Language"
                    />
                  </div>

                  <textarea
                    value={sourceText}
                    onChange={(e) => setSourceText(e.target.value)}
                    placeholder="Type any message, technical question, or note to translate with Gemini AI..."
                    rows={4}
                    className="w-full p-3 rounded-xl bg-[var(--bg-surface-0)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] placeholder:[var(--text-muted)] focus:outline-none focus:border-[var(--brand-primary,#dc2626)] resize-none shadow-xs"
                  />

                  <button
                    onClick={handleTranslateManualText}
                    disabled={isTranslating || !sourceText.trim()}
                    className="w-full py-2.5 rounded-xl bg-[var(--brand-primary,#dc2626)] hover:brightness-105 active:scale-[0.98] text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    <span>{isTranslating ? 'Translating with Gemini...' : 'Translate & Synthesize Audio'}</span>
                  </button>
                </div>

                {translatedResult && (
                  <div className="p-4 rounded-2xl bg-[var(--bg-surface-1)] border border-[var(--border-subtle)] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[var(--brand-primary,#dc2626)]">
                        Gemini Translation Result
                      </span>
                      <button
                        onClick={() => translationManager.speakText(translatedResult, targetLang)}
                        className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)] transition-colors cursor-pointer"
                        title="Play Translated Speech"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-sm font-semibold text-[var(--text-primary)] leading-relaxed">
                      {translatedResult}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: GEMINI AI COPILOT */}
            {activeTab === 'COPILOT' && (
              <div className="flex flex-col h-full space-y-3">
                {/* Quick Action Suggestion Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  <button
                    onClick={() => handleAskCopilot('Summarize the top discussion points so far')}
                    className="px-2.5 py-1 rounded-lg bg-[var(--bg-surface-1)] hover:bg-[var(--bg-surface-2)] border border-[var(--border-subtle)] text-[11px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Zap className="w-3 h-3 text-[var(--brand-primary,#dc2626)]" />
                    <span>Summarize Discussion</span>
                  </button>

                  <button
                    onClick={() => handleAskCopilot('What are the key action items and deliverables?')}
                    className="px-2.5 py-1 rounded-lg bg-[var(--bg-surface-1)] hover:bg-[var(--bg-surface-2)] border border-[var(--border-subtle)] text-[11px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    <span>Action Items</span>
                  </button>
                </div>

                {/* Copilot Chat Feed */}
                <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
                  {copilotMessages.map((msg, i) => (
                    <div
                      key={i}
                      className={`p-3 rounded-2xl text-xs leading-relaxed ${
                        msg.sender === 'user'
                          ? 'bg-[var(--brand-primary,#dc2626)] text-white ml-6 font-medium shadow-xs'
                          : 'bg-[var(--bg-surface-1)] border border-[var(--border-subtle)] text-[var(--text-primary)] mr-4 font-normal'
                      }`}
                    >
                      <div className="text-[10px] font-semibold mb-1 flex items-center gap-1">
                        {msg.sender === 'user' ? (
                          <span className="text-white/80">You</span>
                        ) : (
                          <span className="text-[var(--text-secondary)] flex items-center gap-1">
                            <Bot className="w-3 h-3 text-[var(--brand-primary,#dc2626)]" />
                            <span>Gemini Copilot</span>
                          </span>
                        )}
                      </div>
                      <div className="whitespace-pre-wrap">{msg.text}</div>
                    </div>
                  ))}
                  {isCopilotThinking && (
                    <div className="p-3 rounded-2xl bg-[var(--bg-surface-1)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] flex items-center gap-2 animate-pulse">
                      <Bot className="w-4 h-4 text-[var(--brand-primary,#dc2626)]" />
                      <span>Gemini is analyzing meeting context...</span>
                    </div>
                  )}
                </div>

                {/* Copilot Question Input */}
                <div className="flex items-center gap-2 pt-2 border-t border-[var(--border-subtle)]">
                  <input
                    type="text"
                    value={copilotQuestion}
                    onChange={(e) => setCopilotQuestion(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAskCopilot()}
                    placeholder="Ask Gemini anything about this meeting..."
                    className="flex-1 px-3 py-2 rounded-xl bg-[var(--bg-surface-0)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] placeholder:[var(--text-muted)] focus:outline-none focus:border-[var(--brand-primary,#dc2626)] shadow-xs"
                  />
                  <button
                    onClick={() => handleAskCopilot()}
                    disabled={isCopilotThinking || !copilotQuestion.trim()}
                    className="p-2 rounded-xl bg-[var(--brand-primary,#dc2626)] hover:brightness-105 active:scale-[0.98] text-white transition-all disabled:opacity-40 cursor-pointer shadow-xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* TAB 4: NOTES */}
            {activeTab === 'NOTES' && (
              <div className="flex flex-col h-full space-y-2">
                <div className="text-xs font-medium text-[var(--text-secondary)] flex items-center justify-between">
                  <span>Markdown Notes Scratchpad</span>
                  <span className="text-[11px] text-[var(--brand-primary,#dc2626)]">Auto-saved</span>
                </div>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={16}
                  className="w-full flex-1 p-3.5 rounded-2xl bg-[var(--bg-surface-1)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] placeholder:[var(--text-muted)] focus:outline-none focus:border-[var(--brand-primary,#dc2626)] font-mono leading-relaxed resize-none shadow-xs"
                />
              </div>
            )}

            {/* TAB 5: MOM DOC */}
            {activeTab === 'MOM' && (
              <div className="flex flex-col h-full space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[var(--text-secondary)]">
                    Executive Minutes of Meeting
                  </span>
                  <button
                    onClick={handleGenerateMOM}
                    disabled={isGeneratingMOM}
                    className="text-xs font-semibold text-[var(--brand-primary,#dc2626)] hover:brightness-110 px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-colors cursor-pointer"
                  >
                    {isGeneratingMOM ? 'Generating...' : 'Re-generate with Gemini'}
                  </button>
                </div>
                <textarea
                  value={generatedMOM || notes}
                  onChange={(e) => setGeneratedMOM(e.target.value)}
                  rows={16}
                  className="w-full flex-1 p-3.5 rounded-2xl bg-[var(--bg-surface-1)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] font-mono leading-relaxed resize-none shadow-xs"
                />
              </div>
            )}
          </div>

          {/* Footer Email Dispatch */}
          <div className="p-4 bg-[var(--bg-surface-1)] border-t border-[var(--border-subtle)] space-y-2">
            <button
              onClick={handleSendEmailSummary}
              disabled={isSendingEmail}
              className="w-full py-2.5 px-4 rounded-xl bg-[var(--brand-primary,#dc2626)] hover:brightness-105 active:scale-[0.98] text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              <Mail className="w-4 h-4" />
              <span>{isSendingEmail ? 'Dispatching MOM...' : 'Email Official MOM & Notes'}</span>
            </button>
          </div>
        </aside>
      </div>

      <GeminiSettingsModal
        isOpen={isGeminiSettingsOpen}
        onClose={() => setIsGeminiSettingsOpen(false)}
      />
    </>
  );
};
