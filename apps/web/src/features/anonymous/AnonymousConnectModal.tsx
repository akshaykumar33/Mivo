'use client';

import * as React from 'react';
import { useAuthStore } from '@/stores/authStore';
import { realtime } from '@/lib/socket-client';
import {
  REALTIME_EVENTS,
  AnonMatchedPayload,
  AnonMessageBroadcast,
} from '@mivo/shared';
import {
  X,
  Sparkles,
  Users,
  MessageSquare,
  Video,
  Send,
  FastForward,
  LogOut,
  ShieldAlert,
  Eye,
  CheckCircle2,
  Dice5,
  Radio,
  UserCheck,
  Flame,
  Mic,
  MicOff,
  VideoOff,
  Smile,
} from 'lucide-react';

const SUGGESTED_TAGS = ['Tech', 'Gaming', 'AI', 'Music', 'Casual', 'Coding', 'Movies', 'Crypto'];

export const AnonymousConnectModal: React.FC = () => {
  const { user, isGuest, anonConnectModalOpen, setAnonConnectModalOpen, setUpgradeModalOpen } =
    useAuthStore();

  const [mode, setMode] = React.useState<'TEXT' | 'VIDEO'>('TEXT');
  const [selectedTags, setSelectedTags] = React.useState<string[]>(['Tech', 'Casual']);
  const [customTagInput, setCustomTagInput] = React.useState('');
  const [pseudonym, setPseudonym] = React.useState('');
  const [state, setState] = React.useState<'IDLE' | 'SEARCHING' | 'CONNECTED'>('IDLE');
  const [queueCount, setQueueCount] = React.useState<number>(8);

  // Active Session State
  const [currentSessionId, setCurrentSessionId] = React.useState<string | null>(null);
  const [partner, setPartner] = React.useState<AnonMatchedPayload['partner'] | null>(null);
  const [messages, setMessages] = React.useState<Array<{ id: string; sender: string; content: string; time: string; isSelf: boolean }>>([]);
  const [inputMessage, setInputMessage] = React.useState('');
  const [partnerTyping, setPartnerTyping] = React.useState(false);
  const [revealRequested, setRevealRequested] = React.useState(false);
  const [revealedUsers, setRevealedUsers] = React.useState<{ user1?: any; user2?: any } | null>(null);
  const [rateLimitWarning, setRateLimitWarning] = React.useState<string | null>(null);

  // Video State (if mode === 'VIDEO')
  const [isMicMuted, setIsMicMuted] = React.useState(false);
  const [isVideoDisabled, setIsVideoDisabled] = React.useState(false);
  const localVideoRef = React.useRef<HTMLVideoElement>(null);
  const localStreamRef = React.useRef<MediaStream | null>(null);

  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  // Generate initial pseudonym
  React.useEffect(() => {
    if (!pseudonym) {
      const tag = Math.floor(100 + Math.random() * 900);
      setPseudonym(isGuest ? `Guest Explorer #${tag}` : `Incognito User #${tag}`);
    }
  }, [isGuest, pseudonym]);

  // Socket Event Listeners
  React.useEffect(() => {
    if (!anonConnectModalOpen) return;

    const handleQueueStatus = (data: { inQueue?: boolean; queueLength?: number }) => {
      if (typeof data.queueLength === 'number') {
        setQueueCount(data.queueLength);
      }
    };

    const handleMatched = (data: AnonMatchedPayload) => {
      setCurrentSessionId(data.sessionId);
      setPartner(data.partner);
      setState('CONNECTED');
      setMessages([]);
      setRevealRequested(false);
      setRevealedUsers(null);
      setRateLimitWarning(null);

      // If video mode, initialize local media stream
      if (data.mode === 'VIDEO') {
        navigator.mediaDevices
          ?.getUserMedia({ video: true, audio: true })
          .then((stream) => {
            localStreamRef.current = stream;
            if (localVideoRef.current) {
              localVideoRef.current.srcObject = stream;
            }
          })
          .catch(() => {});
      }
    };

    const handleMessageReceived = (data: AnonMessageBroadcast) => {
      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          sender: data.senderPseudonym,
          content: data.content,
          time: new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isSelf: data.senderId === user?.id,
        },
      ]);
    };

    const handleTyping = (data: { sessionId: string; isTyping: boolean }) => {
      setPartnerTyping(data.isTyping);
    };

    const handlePartnerLeft = (data: { message?: string }) => {
      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          sender: 'System',
          content: data.message || 'Your partner has disconnected or skipped.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isSelf: false,
        },
      ]);
      setPartner(null);
    };

    const handleRevealRequest = () => {
      setRevealRequested(true);
    };

    const handleRevealAccepted = (data: any) => {
      setRevealedUsers(data);
      setRevealRequested(false);
    };

    const handleError = (data: { code: string; message: string }) => {
      if (data.code === 'RATE_LIMITED') {
        setRateLimitWarning(data.message);
        setTimeout(() => setRateLimitWarning(null), 3000);
      }
    };

    realtime.on(REALTIME_EVENTS.ANON_QUEUE_STATUS, handleQueueStatus);
    realtime.on(REALTIME_EVENTS.ANON_MATCHED, handleMatched);
    realtime.on(REALTIME_EVENTS.ANON_MESSAGE_RECEIVED, handleMessageReceived);
    realtime.on(REALTIME_EVENTS.ANON_TYPING, handleTyping);
    realtime.on(REALTIME_EVENTS.ANON_PARTNER_LEFT, handlePartnerLeft);
    realtime.on(REALTIME_EVENTS.ANON_REVEAL_REQUEST, handleRevealRequest);
    realtime.on(REALTIME_EVENTS.ANON_REVEAL_ACCEPTED, handleRevealAccepted);
    realtime.on('error', handleError);

    return () => {
      realtime.off(REALTIME_EVENTS.ANON_QUEUE_STATUS, handleQueueStatus);
      realtime.off(REALTIME_EVENTS.ANON_MATCHED, handleMatched);
      realtime.off(REALTIME_EVENTS.ANON_MESSAGE_RECEIVED, handleMessageReceived);
      realtime.off(REALTIME_EVENTS.ANON_TYPING, handleTyping);
      realtime.off(REALTIME_EVENTS.ANON_PARTNER_LEFT, handlePartnerLeft);
      realtime.off(REALTIME_EVENTS.ANON_REVEAL_REQUEST, handleRevealRequest);
      realtime.off(REALTIME_EVENTS.ANON_REVEAL_ACCEPTED, handleRevealAccepted);
      realtime.off('error', handleError);
    };
  }, [anonConnectModalOpen, user?.id]);

  // Scroll chat to bottom
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, partnerTyping]);

  if (!anonConnectModalOpen) return null;

  const handleStartSearch = () => {
    setState('SEARCHING');
    realtime.emit(REALTIME_EVENTS.ANON_QUEUE_JOIN, {
      mode,
      interests: selectedTags,
      pseudonym,
    });
  };

  const handleCancelSearch = () => {
    setState('IDLE');
    realtime.emit(REALTIME_EVENTS.ANON_QUEUE_LEAVE, {});
  };

  const handleNextMatch = () => {
    setMessages([]);
    setPartner(null);
    setRevealedUsers(null);
    setState('SEARCHING');
    realtime.emit(REALTIME_EVENTS.ANON_NEXT, {
      mode,
      interests: selectedTags,
      pseudonym,
    });
  };

  const handleEndChat = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    realtime.emit(REALTIME_EVENTS.ANON_END, {});
    setState('IDLE');
    setCurrentSessionId(null);
    setPartner(null);
    setMessages([]);
    setRevealedUsers(null);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !currentSessionId) return;

    realtime.emit(REALTIME_EVENTS.ANON_SEND_MESSAGE, {
      sessionId: currentSessionId,
      content: inputMessage.trim(),
    });

    setInputMessage('');
    realtime.emit(REALTIME_EVENTS.ANON_TYPING, { sessionId: currentSessionId, isTyping: false });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputMessage(e.target.value);
    if (currentSessionId) {
      realtime.emit(REALTIME_EVENTS.ANON_TYPING, {
        sessionId: currentSessionId,
        isTyping: e.target.value.length > 0,
      });
    }
  };

  const handleRequestReveal = () => {
    if (!currentSessionId) return;
    realtime.emit(REALTIME_EVENTS.ANON_REVEAL_REQUEST, { sessionId: currentSessionId });
  };

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleAddCustomTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && customTagInput.trim()) {
      e.preventDefault();
      const clean = customTagInput.trim();
      if (!selectedTags.includes(clean)) {
        setSelectedTags([...selectedTags, clean]);
      }
      setCustomTagInput('');
    }
  };

  const rerollPseudonym = () => {
    const animals = ['Falcon', 'Fox', 'Wolf', 'Panda', 'Lynx', 'Otter', 'Badger', 'Tiger'];
    const chosen = animals[Math.floor(Math.random() * animals.length)];
    const num = Math.floor(100 + Math.random() * 900);
    setPseudonym(isGuest ? `Guest ${chosen} #${num}` : `Anon ${chosen} #${num}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-2xl bg-[var(--bg-surface-0)] border border-[var(--border-subtle)] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-[#111827] relative">
        {/* Ambient Top Glow Bar */}
        <div className="h-1.5 bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-500 w-full shrink-0" />

        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-[var(--border-subtle)] flex items-center justify-between gap-3 bg-[var(--bg-surface-1)] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-500 text-white flex items-center justify-center shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold tracking-tight font-display">
                  Anonymous &amp; Guest Connect
                </h2>
                {isGuest && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 border border-amber-500/30">
                    Guest Mode
                  </span>
                )}
              </div>
              <p className="text-xs text-[#71717A]">
                Match 1-on-1 with anonymous peers or guests in real-time.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                handleEndChat();
                setAnonConnectModalOpen(false);
              }}
              className="p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MAIN BODY: 3 STATES (IDLE, SEARCHING, CONNECTED) */}
        {state === 'IDLE' && (
          <div className="p-5 sm:p-6 space-y-5 overflow-y-auto">
            {/* Guest Limitations Pill Notice */}
            {isGuest && (
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-amber-800">
                  <UserCheck className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    Connecting as a <strong>Guest User</strong> (3s chat rate limit applies).
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setUpgradeModalOpen(true)}
                  className="px-2.5 py-1 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] shadow-xs cursor-pointer shrink-0"
                >
                  Upgrade
                </button>
              </div>
            )}

            {/* Mode Selection */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-2">
                Choose Connection Mode
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setMode('TEXT')}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                    mode === 'TEXT'
                      ? 'bg-rose-50 border-rose-500 ring-2 ring-rose-500/20 shadow-xs'
                      : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      mode === 'TEXT' ? 'bg-rose-600 text-white' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-900">Text Chat</div>
                    <div className="text-[11px] text-gray-500">Fast, lightweight &amp; private</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setMode('VIDEO')}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                    mode === 'VIDEO'
                      ? 'bg-rose-50 border-rose-500 ring-2 ring-rose-500/20 shadow-xs'
                      : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      mode === 'VIDEO' ? 'bg-rose-600 text-white' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    <Video className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-900">Video &amp; Voice</div>
                    <div className="text-[11px] text-gray-500">Peer-to-peer live camera</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Anonymous Persona / Pseudonym */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-gray-700">Your Anonymous Pseudonym</label>
                <button
                  type="button"
                  onClick={rerollPseudonym}
                  className="text-[11px] text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Dice5 className="w-3.5 h-3.5" />
                  <span>Randomize</span>
                </button>
              </div>
              <input
                type="text"
                value={pseudonym}
                onChange={(e) => setPseudonym(e.target.value)}
                maxLength={32}
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-gray-50 border border-gray-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/30 text-gray-900 font-semibold"
              />
            </div>

            {/* Shared Interests */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-2">
                Matching Interests (Tags)
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2.5">
                {SUGGESTED_TAGS.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
                      }`}
                    >
                      #{tag}
                    </button>
                  );
                })}
              </div>

              <input
                type="text"
                value={customTagInput}
                onChange={(e) => setCustomTagInput(e.target.value)}
                onKeyDown={handleAddCustomTag}
                placeholder="Type custom tag and press Enter..."
                className="w-full px-3 py-1.5 text-xs rounded-xl bg-gray-50 border border-gray-200 text-gray-800 placeholder-gray-400 focus:outline-none focus:bg-white"
              />
            </div>

            {/* Action Bar */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleStartSearch}
                className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
              >
                <Radio className="w-4 h-4 animate-pulse" />
                <span>Find Anonymous Match</span>
              </button>
            </div>
          </div>
        )}

        {/* SEARCHING RADAR STATE */}
        {state === 'SEARCHING' && (
          <div className="p-8 sm:p-12 flex flex-col items-center justify-center text-center space-y-6">
            <div className="relative w-28 h-28 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-2 border-rose-500/30 animate-ping" />
              <div className="absolute inset-2 rounded-full border-2 border-rose-500/50 animate-pulse" />
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-red-600 to-rose-600 text-white flex items-center justify-center shadow-lg">
                <Radio className="w-8 h-8 animate-spin" />
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold text-gray-900 font-display">
                Matching with an Anonymous Peer...
              </h3>
              <p className="text-xs text-gray-500 mt-1 max-w-sm">
                Pairing you with another guest or anonymous user interested in{' '}
                {selectedTags.length ? selectedTags.map((t) => `#${t}`).join(', ') : 'anything'}.
              </p>
            </div>

            <button
              type="button"
              onClick={handleCancelSearch}
              className="py-2 px-5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs transition-colors cursor-pointer"
            >
              Cancel Search
            </button>
          </div>
        )}

        {/* CONNECTED STATE: TEXT OR VIDEO */}
        {state === 'CONNECTED' && partner && (
          <div className="flex-1 flex flex-col min-h-[420px] max-h-[600px] overflow-hidden">
            {/* Active Partner Top Bar */}
            <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-rose-500 to-amber-500 text-white font-bold text-xs flex items-center justify-center shrink-0">
                  {partner.pseudonym.charAt(0)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-gray-900 truncate">
                      {partner.pseudonym}
                    </span>
                    {partner.isGuest ? (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-700 border border-amber-300">
                        Guest
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-purple-100 text-purple-700 border border-purple-300">
                        Anon
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-gray-500 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>Connected • Mode: {mode}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Next Match, Reveal, Leave */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleRequestReveal}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold border flex items-center gap-1 transition-colors cursor-pointer ${
                    revealedUsers
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                      : revealRequested
                      ? 'bg-amber-50 text-amber-700 border-amber-300 animate-pulse'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                  }`}
                  title="Request Mutual Identity Reveal"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>{revealedUsers ? 'Revealed' : revealRequested ? 'Accept Reveal' : 'Reveal'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleNextMatch}
                  className="px-2.5 py-1 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                  title="Skip to next partner"
                >
                  <FastForward className="w-3.5 h-3.5" />
                  <span>Next</span>
                </button>

                <button
                  type="button"
                  onClick={handleEndChat}
                  className="p-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors cursor-pointer"
                  title="End conversation"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Revealed Profiles Alert (if mutual consent given) */}
            {revealedUsers && (
              <div className="p-2.5 bg-emerald-50 border-b border-emerald-200 text-emerald-900 text-xs flex items-center justify-between gap-2 px-4 shrink-0">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Mutual reveal accepted! You are chatting with a verified user.</span>
                </div>
              </div>
            )}

            {/* Warning Rate Limit Notice */}
            {rateLimitWarning && (
              <div className="p-2 bg-rose-50 border-b border-rose-200 text-rose-800 text-xs px-4 flex items-center gap-2 shrink-0 animate-shake">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                <span>{rateLimitWarning}</span>
              </div>
            )}

            {/* Video Grid (if Video mode) */}
            {mode === 'VIDEO' && (
              <div className="p-3 bg-gray-900 grid grid-cols-2 gap-2 h-44 shrink-0">
                <div className="relative rounded-2xl overflow-hidden bg-black flex items-center justify-center border border-white/10">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-2 left-2 text-[10px] font-bold text-white bg-black/60 px-2 py-0.5 rounded-md">
                    You ({pseudonym})
                  </div>
                </div>

                <div className="relative rounded-2xl overflow-hidden bg-gray-800 flex items-center justify-center border border-white/10">
                  <div className="text-center p-3 text-white/70">
                    <Video className="w-8 h-8 mx-auto mb-1 opacity-50" />
                    <div className="text-xs font-semibold">{partner.pseudonym}</div>
                    <div className="text-[10px] text-emerald-400">P2P Stream Connected</div>
                  </div>
                  <div className="absolute bottom-2 left-2 text-[10px] font-bold text-white bg-black/60 px-2 py-0.5 rounded-md">
                    {partner.pseudonym}
                  </div>
                </div>
              </div>
            )}

            {/* Messages Stream */}
            <div className="flex-1 p-4 overflow-y-auto space-y-2.5 bg-[var(--bg-surface-0)]">
              {messages.length === 0 && (
                <div className="text-center py-8 text-gray-400 text-xs">
                  Connected with <strong>{partner.pseudonym}</strong>! Say hello 👋
                </div>
              )}

              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex flex-col ${m.isSelf ? 'items-end' : 'items-start'}`}
                >
                  <div className="text-[10px] text-gray-400 mb-0.5 px-1">
                    {m.sender} • {m.time}
                  </div>
                  <div
                    className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-xs font-medium break-words ${
                      m.isSelf
                        ? 'bg-rose-600 text-white rounded-tr-none'
                        : 'bg-gray-100 text-gray-900 rounded-tl-none border border-gray-200'
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}

              {partnerTyping && (
                <div className="text-[11px] text-gray-400 italic">
                  {partner.pseudonym} is typing...
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input Bar */}
            <form
              onSubmit={handleSendMessage}
              className="p-3 border-t border-[var(--border-subtle)] bg-[var(--bg-surface-1)] flex items-center gap-2 shrink-0"
            >
              <input
                type="text"
                value={inputMessage}
                onChange={handleInputChange}
                placeholder={`Message ${partner.pseudonym}...`}
                className="flex-1 px-3.5 py-2 text-xs rounded-xl bg-white border border-gray-300 focus:outline-none focus:ring-2 focus:ring-rose-500/30 text-gray-900"
              />
              <button
                type="submit"
                disabled={!inputMessage.trim()}
                className="p-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white transition-colors cursor-pointer shrink-0 shadow-xs"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
