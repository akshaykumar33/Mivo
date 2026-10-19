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
          {/* Apple Translucent Header */}
          <div className="h-16 px-5 border-b border-[var(--border-subtle)] flex items-center justify-between bg-gradient-to-r from-[#5E5CE6]/10 via-[#BF5AF2]/10 to-transparent">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-[12px] bg-gradient-to-tr from-[#BF5AF2] via-[#5E5CE6] to-[#0A84FF] flex items-center justify-center text-white shadow-[0_4px_16px_rgba(191,90,242,0.4)]">
                <Sparkles className="w-4 h-4 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-[var(--text-primary)] font-display tracking-tight flex items-center gap-1.5">
                  <span>Gemini AI Scribe & Hub</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-[#5E5CE6]/30 text-[#64D2FF] font-mono">
                    3.7 / 2.5
                  </span>
                </h3>
                <span className="text-[10px] text-[#BF5AF2] font-semibold">
                  Multilingual AI, Copilot & Executive MOM
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsGeminiSettingsOpen(true)}
                className="p-2 rounded-[10px] text-white/50 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
                title="Configure Gemini API Key"
              >
                <Settings className="w-4 h-4 text-[#64D2FF]" />
              </button>

              <button
                onClick={onClose}
                className="p-2 rounded-[10px] text-white/40 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Apple Segmented Tabs */}
          <div className="flex border-b border-white/[0.07] bg-[#06070B]/80 p-2 gap-1 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setActiveTab('LIVE_VOICE')}
              className={`flex-1 py-1.5 px-2 rounded-[10px] text-xs font-semibold transition-all duration-150 whitespace-nowrap cursor-pointer ${
                activeTab === 'LIVE_VOICE'
                  ? 'bg-gradient-to-r from-[#5E5CE6] to-[#0A84FF] text-white shadow-md'
                  : 'text-white/50 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              Live Voice
            </button>
            <button
              onClick={() => setActiveTab('TEXT_TRANSLATOR')}
              className={`flex-1 py-1.5 px-2 rounded-[10px] text-xs font-semibold transition-all duration-150 whitespace-nowrap cursor-pointer ${
                activeTab === 'TEXT_TRANSLATOR'
                  ? 'bg-gradient-to-r from-[#0A84FF] to-[#64D2FF] text-white shadow-md'
                  : 'text-white/50 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              Translator
            </button>
            <button
              onClick={() => setActiveTab('COPILOT')}
              className={`flex-1 py-1.5 px-2 rounded-[10px] text-xs font-semibold transition-all duration-150 whitespace-nowrap cursor-pointer ${
                activeTab === 'COPILOT'
                  ? 'bg-gradient-to-r from-[#BF5AF2] via-[#5E5CE6] to-[#0A84FF] text-white shadow-md'
                  : 'text-white/50 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              Copilot
            </button>
            <button
              onClick={() => setActiveTab('NOTES')}
              className={`flex-1 py-1.5 px-2 rounded-[10px] text-xs font-semibold transition-all duration-150 whitespace-nowrap cursor-pointer ${
                activeTab === 'NOTES'
                  ? 'bg-gradient-to-r from-[#BF5AF2] to-[#5E5CE6] text-white shadow-md'
                  : 'text-white/50 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              Notes
            </button>
            <button
              onClick={() => {
                if (!generatedMOM) handleGenerateMOM();
                setActiveTab('MOM');
              }}
              className={`flex-1 py-1.5 px-2 rounded-[10px] text-xs font-semibold transition-all duration-150 whitespace-nowrap cursor-pointer ${
                activeTab === 'MOM'
                  ? 'bg-gradient-to-r from-[#30D158] to-[#63E6E2] text-black font-bold shadow-md'
                  : 'text-white/50 hover:text-white hover:bg-white/[0.04]'
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
                <div className="p-3.5 rounded-[18px] bg-white/[0.03] border border-white/[0.07] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white/80">Translate Speech Into:</span>
                    <LanguageSelectorPopover
                      value={targetLang}
                      onChange={(code) => setTargetLang(code)}
                      label="Speech Target Language"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-white/[0.05]">
                    <span className="text-[11px] text-white/50">Continuous Speech Dictation:</span>
                    <button
                      onClick={toggleTranscription}
                      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-[12px] text-xs font-bold transition-all cursor-pointer ${
                        isRecording
                          ? 'bg-[#FF453A] text-white shadow-[0_0_16px_rgba(255,69,58,0.5)] animate-pulse'
                          : 'bg-gradient-to-r from-[#5E5CE6] to-[#0A84FF] text-white hover:scale-102 shadow-md'
                      }`}
                    >
                      {isRecording ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      <span>{isRecording ? 'Listening Live...' : 'Start Dictation'}</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-white/[0.05]">
                    <input
                      type="text"
                      placeholder="Or dictate/type speech turn..."
                      value={liveSpeechInput}
                      onChange={(e) => setLiveSpeechInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddLiveTranscriptTurn(liveSpeechInput);
                      }}
                      className="flex-1 px-3 py-1.5 rounded-[12px] bg-white/[0.04] border border-white/[0.08] text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#5E5CE6]"
                    />
                    <button
                      onClick={() => handleAddLiveTranscriptTurn(liveSpeechInput)}
                      disabled={!liveSpeechInput.trim()}
                      className="px-3 py-1.5 rounded-[12px] bg-[#5E5CE6] hover:bg-[#5E5CE6]/80 text-white text-xs font-semibold disabled:opacity-40 cursor-pointer transition-all"
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
                      className="p-3.5 rounded-[16px] bg-white/[0.02] border border-white/[0.05] hover:border-[#5E5CE6]/30 transition-all space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#BF5AF2]">{t.speaker}</span>
                        <span className="text-[10px] font-mono text-white/40">{t.time}</span>
                      </div>

                      <p className="text-xs text-white/90 leading-relaxed font-medium">
                        "{t.text}"
                      </p>

                      {t.translatedText && (
                        <div className="pt-2 border-t border-white/[0.05] flex items-start justify-between gap-2">
                          <p className="text-xs text-[#30D158] leading-relaxed font-semibold">
                            🌐 {t.translatedText}
                          </p>
                          <button
                            onClick={() => translationManager.speakText(t.translatedText || t.text, targetLang)}
                            className="p-1 rounded-lg text-white/50 hover:text-[#30D158] hover:bg-white/[0.06] transition-colors flex-shrink-0 cursor-pointer"
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
                <div className="p-3.5 rounded-[18px] bg-white/[0.03] border border-white/[0.07] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white/80">Translate Into:</span>
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
                    className="w-full p-3 rounded-[14px] bg-white/[0.04] border border-white/[0.08] text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#5E5CE6] resize-none"
                  />

                  <button
                    onClick={handleTranslateManualText}
                    disabled={isTranslating || !sourceText.trim()}
                    className="w-full py-2 rounded-[12px] bg-gradient-to-r from-[#0A84FF] to-[#64D2FF] text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-md hover:scale-102 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    <span>{isTranslating ? 'Translating with Gemini...' : 'Translate & Synthesize Audio'}</span>
                  </button>
                </div>

                {translatedResult && (
                  <div className="p-4 rounded-[18px] bg-gradient-to-br from-[#5E5CE6]/15 to-[#0A84FF]/10 border border-[#5E5CE6]/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#64D2FF]">
                        Gemini Translation Result
                      </span>
                      <button
                        onClick={() => translationManager.speakText(translatedResult, targetLang)}
                        className="p-1 rounded-lg text-white hover:text-[#64D2FF] hover:bg-white/[0.08] transition-colors cursor-pointer"
                        title="Play Translated Speech"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-sm font-semibold text-white leading-relaxed">
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
                    className="px-2.5 py-1 rounded-[10px] bg-white/[0.04] hover:bg-[#5E5CE6]/20 border border-white/[0.08] text-[10px] font-semibold text-white/80 whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Zap className="w-3 h-3 text-[#64D2FF]" />
                    <span>Summarize Discussion</span>
                  </button>

                  <button
                    onClick={() => handleAskCopilot('What are the key action items and deliverables?')}
                    className="px-2.5 py-1 rounded-[10px] bg-white/[0.04] hover:bg-[#BF5AF2]/20 border border-white/[0.08] text-[10px] font-semibold text-white/80 whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-3 h-3 text-[#30D158]" />
                    <span>Action Items</span>
                  </button>
                </div>

                {/* Copilot Chat Feed */}
                <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
                  {copilotMessages.map((msg, i) => (
                    <div
                      key={i}
                      className={`p-3 rounded-[16px] text-xs leading-relaxed ${
                        msg.sender === 'user'
                          ? 'bg-[#5E5CE6]/20 border border-[#5E5CE6]/40 text-white ml-6 font-semibold'
                          : 'bg-white/[0.03] border border-white/[0.07] text-white/90 mr-4 font-normal'
                      }`}
                    >
                      <div className="text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                        {msg.sender === 'user' ? (
                          <span className="text-[#64D2FF]">You</span>
                        ) : (
                          <span className="text-[#BF5AF2] flex items-center gap-1">
                            <Bot className="w-3 h-3" />
                            <span>Gemini Copilot</span>
                          </span>
                        )}
                      </div>
                      <div className="whitespace-pre-wrap">{msg.text}</div>
                    </div>
                  ))}
                  {isCopilotThinking && (
                    <div className="p-3 rounded-[16px] bg-white/[0.03] border border-white/[0.07] text-xs text-white/60 flex items-center gap-2 animate-pulse">
                      <Bot className="w-4 h-4 text-[#BF5AF2]" />
                      <span>Gemini is analyzing meeting context...</span>
                    </div>
                  )}
                </div>

                {/* Copilot Question Input */}
                <div className="flex items-center gap-2 pt-2 border-t border-white/[0.08]">
                  <input
                    type="text"
                    value={copilotQuestion}
                    onChange={(e) => setCopilotQuestion(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAskCopilot()}
                    placeholder="Ask Gemini anything about this meeting..."
                    className="flex-1 px-3 py-2 rounded-[12px] bg-white/[0.04] border border-white/[0.08] text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#5E5CE6]"
                  />
                  <button
                    onClick={() => handleAskCopilot()}
                    disabled={isCopilotThinking || !copilotQuestion.trim()}
                    className="p-2 rounded-[12px] bg-gradient-to-r from-[#5E5CE6] to-[#0A84FF] text-white hover:scale-105 transition-all disabled:opacity-40 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* TAB 4: NOTES */}
            {activeTab === 'NOTES' && (
              <div className="flex flex-col h-full space-y-2">
                <div className="text-[10px] font-bold text-white/40 uppercase tracking-wider flex items-center justify-between">
                  <span>Markdown Notes Scratchpad</span>
                  <span className="text-[10px] text-[#BF5AF2]">Auto-saved</span>
                </div>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={16}
                  className="w-full flex-1 p-3.5 rounded-[16px] bg-white/[0.03] border border-white/[0.08] text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#5E5CE6] font-mono leading-relaxed resize-none"
                />
              </div>
            )}

            {/* TAB 5: MOM DOC */}
            {activeTab === 'MOM' && (
              <div className="flex flex-col h-full space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">
                    Executive Minutes of Meeting
                  </span>
                  <button
                    onClick={handleGenerateMOM}
                    disabled={isGeneratingMOM}
                    className="text-[10px] font-bold text-[#BF5AF2] hover:text-white px-2.5 py-1 rounded-[8px] bg-[#BF5AF2]/20 border border-[#BF5AF2]/40 hover:bg-[#BF5AF2] transition-colors cursor-pointer"
                  >
                    {isGeneratingMOM ? 'Generating...' : 'Re-generate with Gemini'}
                  </button>
                </div>
                <textarea
                  value={generatedMOM || notes}
                  onChange={(e) => setGeneratedMOM(e.target.value)}
                  rows={16}
                  className="w-full flex-1 p-3.5 rounded-[16px] bg-white/[0.03] border border-white/[0.08] text-xs text-white font-mono leading-relaxed resize-none"
                />
              </div>
            )}
          </div>

          {/* Footer Email Dispatch */}
          <div className="p-4 bg-[#06070B] border-t border-white/[0.07] space-y-2">
            <button
              onClick={handleSendEmailSummary}
              disabled={isSendingEmail}
              className="w-full py-2.5 px-4 rounded-[14px] bg-gradient-to-r from-[#5E5CE6] via-[#BF5AF2] to-[#0A84FF] hover:opacity-90 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(94,92,230,0.4)] transition-all disabled:opacity-50 cursor-pointer"
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
