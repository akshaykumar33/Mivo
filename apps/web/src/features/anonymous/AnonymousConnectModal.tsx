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
  Maximize2,
  Minimize2,
  Gamepad2,
  HelpCircle,
  Volume2,
  Share2,
  Copy,
  Check,
  ExternalLink,
  KeyRound,
  BookOpen,
} from 'lucide-react';

import { CanvasTriviaJamPlayground } from './jam/CanvasTriviaJamPlayground';
import { GameRulesModal } from './jam/GameRulesModal';

const SUGGESTED_TAGS = ['Tech', 'Gaming', 'AI', 'Music', 'Casual', 'Coding', 'Movies', 'Crypto'];

const QUICK_ICEBREAKERS = [
  'Pineapple on pizza: Yes or No?',
  'If you had 1 superpower, what would it be?',
  'What is your go-to midnight snack?',
  'Do you believe aliens have visited Earth?',
  'What is the best song ever created?',
];

export const AnonymousConnectModal: React.FC = () => {
  const { user, isGuest, isOrg, anonConnectModalOpen, setAnonConnectModalOpen, setUpgradeModalOpen } =
    useAuthStore();

  const [mode, setMode] = React.useState<'TEXT' | 'VIDEO'>('TEXT');
  const [selectedTags, setSelectedTags] = React.useState<string[]>(['Tech', 'Casual']);
  const [customTagInput, setCustomTagInput] = React.useState('');
  const [pseudonym, setPseudonym] = React.useState('');
  const [state, setState] = React.useState<'IDLE' | 'SEARCHING' | 'CONNECTED'>('IDLE');
  const [queueCount, setQueueCount] = React.useState<number>(8);
  const [isTheaterMode, setIsTheaterMode] = React.useState(false);
  const [mobileTab, setMobileTab] = React.useState<'CHAT' | 'PLAYGROUND'>('PLAYGROUND');

  // Matchmaking & 2nd Player Room Mode (Guests default to PRIVATE connection code)
  const [matchTab, setMatchTab] = React.useState<'DISCOVERY' | 'PRIVATE' | 'SOLO'>(isGuest ? 'PRIVATE' : 'DISCOVERY');
  const [roomCodeInput, setRoomCodeInput] = React.useState('');
  const [activeRoomCode, setActiveRoomCode] = React.useState<string | null>(null);
  const [copiedInvite, setCopiedInvite] = React.useState(false);
  const [rulesModalOpen, setRulesModalOpen] = React.useState(false);

  // Active Session State
  const [currentSessionId, setCurrentSessionId] = React.useState<string | null>(null);
  const [partner, setPartner] = React.useState<AnonMatchedPayload['partner'] | null>(null);
  const [isHost, setIsHost] = React.useState(true);
  const [messages, setMessages] = React.useState<
    Array<{ id: string; sender: string; content: string; time: string; isSelf: boolean; isSystem?: boolean }>
  >([]);
  const [inputMessage, setInputMessage] = React.useState('');
  const [partnerTyping, setPartnerTyping] = React.useState(false);
  const [revealRequested, setRevealRequested] = React.useState(false);
  const [revealedUsers, setRevealedUsers] = React.useState<{ user1?: any; user2?: any } | null>(null);
  const [rateLimitWarning, setRateLimitWarning] = React.useState<string | null>(null);

  // Video & Voice State
  const [isMicMuted, setIsMicMuted] = React.useState(false);
  const [isVideoDisabled, setIsVideoDisabled] = React.useState(false);
  const [isSpeakingPulse, setIsSpeakingPulse] = React.useState(false);
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

  // Voice activity pulse simulation when mic unmuted
  React.useEffect(() => {
    if (isMicMuted || state !== 'CONNECTED') {
      setIsSpeakingPulse(false);
      return;
    }
    const pulseInterval = setInterval(() => {
      setIsSpeakingPulse((p) => !p);
    }, 1800);
    return () => clearInterval(pulseInterval);
  }, [isMicMuted, state]);

  // Resilient queue join emitter with room-aware debounce
  const lastEmitTimeRef = React.useRef<number>(0);
  const lastEmitCodeRef = React.useRef<string | null>(null);
  const emitQueueJoin = React.useCallback(
    (code?: string) => {
      const cleanCode = code ? code.trim().toUpperCase() : undefined;
      const now = Date.now();
      if (lastEmitCodeRef.current === cleanCode && now - lastEmitTimeRef.current < 1000) {
        console.log('[Jam] Debouncing duplicate emitQueueJoin for same room');
        return;
      }
      lastEmitTimeRef.current = now;
      lastEmitCodeRef.current = cleanCode || null;

      const payload: any = {
        mode,
        interests: selectedTags,
        pseudonym: pseudonym || (isGuest ? 'Guest Explorer' : 'Incognito User'),
      };
      if (cleanCode) {
        payload.roomCode = cleanCode;
      }

      const doEmit = () => {
        console.log('[Jam] Emitting ANON_QUEUE_JOIN:', payload);
        realtime.emit(REALTIME_EVENTS.ANON_QUEUE_JOIN, payload);
      };

      if (realtime.isConnected()) {
        doEmit();
      } else {
        const socket = realtime.getSocket();
        if (socket) {
          socket.once('connect', doEmit);
        } else {
          setTimeout(() => {
            if (realtime.isConnected()) doEmit();
          }, 400);
        }
      }
    },
    [mode, selectedTags, pseudonym, isGuest]
  );

  const handleJoinPrivateJam = React.useCallback(
    (codeToJoin?: string) => {
      const code = (codeToJoin || roomCodeInput).trim().toUpperCase();
      if (!code) return;
      setActiveRoomCode(code);
      setRoomCodeInput(code);
      setState('SEARCHING');
      emitQueueJoin(code);
    },
    [roomCodeInput, emitQueueJoin]
  );

  const handleRegisterPrivateRoom = React.useCallback(
    (code: string) => {
      const cleanCode = code.trim().toUpperCase();
      setActiveRoomCode(cleanCode);
      setRoomCodeInput(cleanCode);
      console.log('[Jam] Registering private room on server:', cleanCode);
      emitQueueJoin(cleanCode);
    },
    [emitQueueJoin]
  );

  // Auto-join from URL parameter (e.g. ?jamCode=JAM410)
  const autoJoinAttemptedRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const code = params.get('jamCode') || params.get('jam');
    if (!code) return;

    const cleanCode = code.trim().toUpperCase();
    if (autoJoinAttemptedRef.current === cleanCode) return;
    autoJoinAttemptedRef.current = cleanCode;

    console.log('[Jam] Auto-joining private room from URL:', cleanCode);
    setAnonConnectModalOpen(true);
    setMatchTab('PRIVATE');
    setRoomCodeInput(cleanCode);
    setActiveRoomCode(cleanCode);
    setState('SEARCHING');

    // Clean up address bar query so browser navigation doesn't loop
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('jamCode');
      url.searchParams.delete('jam');
      window.history.replaceState({}, '', url.toString());
    } catch {}

    emitQueueJoin(cleanCode);
  }, [setAnonConnectModalOpen, emitQueueJoin]);

  // Socket Event Listeners - Always active to never miss match events
  React.useEffect(() => {
    const handleQueueStatus = (data: { inQueue?: boolean; queueLength?: number; roomCode?: string }) => {
      if (typeof data.queueLength === 'number') {
        setQueueCount(data.queueLength);
      }
      if (data.roomCode) {
        setActiveRoomCode(data.roomCode);
      }
    };

    const handleMatched = (data: AnonMatchedPayload) => {
      console.log('[Jam] handleMatched received:', data);
      setAnonConnectModalOpen(true);
      setCurrentSessionId(data.sessionId);
      setPartner(data.partner);
      if (typeof data.isHost === 'boolean') {
        setIsHost(data.isHost);
      } else {
        setIsHost(!data.partner || data.partner.userId === 'bot-companion' || (user?.id || pseudonym) <= data.partner.userId);
      }
      setState('CONNECTED');
      setMessages([
        {
          id: 'welcome-jam',
          sender: 'Mivo Co-Op Jam',
          content: `You matched with ${data.partner.pseudonym}! Try drawing, playing Pong, or answering a dilemma together!`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isSelf: false,
          isSystem: true,
        },
      ]);
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
          content: data.message || 'Your partner has disconnected or skipped. Switched to Solo Practice with Nova!',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isSelf: false,
          isSystem: true,
        },
      ]);
      setPartner({
        userId: 'bot-companion',
        pseudonym: 'Nova (AI Partner)',
        isGuest: false,
        interests: ['Doodling', 'RetroGames', 'Trivia', 'Memes'],
      });
      setIsHost(true);
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
  }, [user?.id]);

  // Scroll chat to bottom
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, partnerTyping]);

  const handleStartSearch = () => {
    setActiveRoomCode(null);
    setState('SEARCHING');
    emitQueueJoin();
  };

  const handleCreatePrivateJam = () => {
    const code = `JAM${Math.floor(100 + Math.random() * 900)}`;
    setActiveRoomCode(code);
    setRoomCodeInput(code);
    setIsHost(true);
    setState('SEARCHING');
    emitQueueJoin(code);
  };

  const handleCancelSearch = () => {
    autoJoinAttemptedRef.current = null;
    setState('IDLE');
    setActiveRoomCode(null);
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
      roomCode: activeRoomCode || undefined,
    });
  };

  // Instant launch solo/bot playground demo
  const handleLaunchDemoJam = () => {
    const demoSessionId = `jam_${Date.now()}`;
    setCurrentSessionId(demoSessionId);
    setPartner({
      userId: 'bot-companion',
      pseudonym: 'Nova (AI Partner)',
      isGuest: false,
      interests: ['Doodling', 'RetroGames', 'Trivia', 'Memes'],
    });
    setIsHost(true);
    setState('CONNECTED');
    setMessages([
      {
        id: 'msg-welcome-demo',
        sender: 'Nova (AI Partner)',
        content: "Welcome to Canvas & Trivia Jam! Select any game on the right — we can doodle, play Pong, solve riddles, or test our reaction speeds! You can also invite a real 2nd player anytime.",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isSelf: false,
      },
    ]);
  };

  const handleEndChat = () => {
    autoJoinAttemptedRef.current = null;
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    realtime.emit(REALTIME_EVENTS.ANON_END, {});
    setState('IDLE');
    setCurrentSessionId(null);
    setPartner(null);
    setActiveRoomCode(null);
    setMessages([]);
    setRevealedUsers(null);
  };

  const handleSendMessage = (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const content = customText || inputMessage;
    if (!content.trim() || !currentSessionId) return;

    realtime.emit(REALTIME_EVENTS.ANON_SEND_MESSAGE, {
      sessionId: currentSessionId,
      content: content.trim(),
    });

    // Local optimistic append if testing in demo mode
    if (partner?.userId === 'bot-companion') {
      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          sender: pseudonym,
          content: content.trim(),
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isSelf: true,
        },
      ]);
    }

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

  // Direct share link for active room
  const directShareLink = activeRoomCode && typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}?jamCode=${activeRoomCode}`
    : '';

  const handleCopyLink = () => {
    if (!directShareLink) return;
    navigator.clipboard?.writeText(directShareLink);
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 2500);
  };

  const activePartner = partner || {
    userId: 'bot-companion',
    pseudonym: 'Nova (AI Partner)',
    isGuest: false,
    interests: ['Doodling', 'RetroGames', 'Trivia', 'Memes'],
  };

  if (!anonConnectModalOpen) return null;

  if (isOrg) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
        <div className="w-full max-w-md bg-[var(--bg-surface-0)] border border-purple-500/30 rounded-3xl p-6 shadow-2xl text-center">
          <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 mx-auto mb-4">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-[var(--text-primary)] font-display">
            Games Disabled for Organization Workspaces
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">
            Casual minigames and random anonymous matchmaking are disabled in Enterprise Organization accounts to maintain workplace focus and compliance.
          </p>
          <div className="mt-4 p-3 rounded-xl bg-[var(--bg-surface-1)] border border-[var(--border-subtle)] text-[11px] text-[var(--text-muted)] text-left space-y-1">
            <div className="font-semibold text-purple-400">Your Enterprise Features:</div>
            <div>• Unlimited Cloud Storage</div>
            <div>• Spoken Voice-to-Task Ticket AI Extraction</div>
            <div>• Real-time Live Code Sharing stages</div>
            <div>• Full HD Group Video & Audio Meetings</div>
          </div>
          <button
            onClick={() => setAnonConnectModalOpen(false)}
            className="mt-5 w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
          >
            Return to Workspace
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div
        className={`w-full ${
          state === 'CONNECTED'
            ? isTheaterMode
              ? 'fixed inset-2 z-50 max-w-none h-[98vh]'
              : 'max-w-6xl xl:max-w-7xl h-[88vh]'
            : 'max-w-2xl max-h-[92vh]'
        } bg-[var(--bg-surface-0)] border border-[var(--border-subtle)] rounded-3xl shadow-2xl overflow-hidden flex flex-col text-[var(--text-primary)] relative transition-all duration-200`}
      >
        {/* Modal Header */}
        <div className="p-3.5 sm:p-4 border-b border-[var(--border-subtle)] flex items-center justify-between gap-3 bg-[var(--bg-surface-1)] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[var(--brand-primary,#dc2626)] text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold tracking-tight font-display">
                  Co-Op "Canvas &amp; Trivia Jam"
                </h2>
                {state === 'CONNECTED' ? (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Split-Screen Live
                  </span>
                ) : isGuest ? (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                    Guest Mode
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                {state === 'CONNECTED'
                  ? 'Real-time collaborative playground: Live chat on the left, interactive minigames on the right.'
                  : 'Speed connect with strangers or invite a 2nd player for 60s speed doodling, retro Pong & dilemma trivia!'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Rules Button in Header */}
            <button
              type="button"
              onClick={() => setRulesModalOpen(true)}
              className="px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 text-amber-700 dark:text-amber-300 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              title="Read Game Rules & Guide"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span className="hidden sm:inline">How to Play</span>
            </button>

            {state === 'CONNECTED' && (
              <button
                type="button"
                onClick={() => setIsTheaterMode(!isTheaterMode)}
                className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)] transition-colors cursor-pointer"
                title={isTheaterMode ? 'Exit Theater Mode' : 'Expand Theater Mode'}
              >
                {isTheaterMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            )}

            <button
              onClick={() => {
                handleEndChat();
                setAnonConnectModalOpen(false);
              }}
              aria-label="Close dialog"
              className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ================= STATE 1: IDLE / LOBBY ================= */}
        {state === 'IDLE' && (
          <div className="p-4 sm:p-6 space-y-4 overflow-y-auto">
            {/* 3 Main Connection Modes */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 sm:gap-2 bg-[var(--bg-surface-1)] p-1.5 rounded-2xl border border-[var(--border-subtle)]">
              <button
                type="button"
                onClick={() => setMatchTab('DISCOVERY')}
                className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 min-w-0 ${
                  matchTab === 'DISCOVERY'
                    ? 'bg-[var(--bg-surface-0)] text-[var(--text-primary)] shadow-xs border border-[var(--border-subtle)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Radio className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Match Strangers</span>
              </button>

              <button
                type="button"
                onClick={() => setMatchTab('PRIVATE')}
                className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 min-w-0 ${
                  matchTab === 'PRIVATE'
                    ? 'bg-[var(--brand-primary,#dc2626)] text-white shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Users className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Invite 2nd Player</span>
              </button>

              <button
                type="button"
                onClick={handleLaunchDemoJam}
                className="py-2 px-3 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)] transition-all cursor-pointer flex items-center justify-center gap-1.5 min-w-0"
              >
                <Gamepad2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="truncate">Solo / Practice</span>
              </button>
            </div>

            {/* TAB 1: PRIVATE ROOM / INVITE 2ND PLAYER DIRECTLY */}
            {matchTab === 'PRIVATE' && (
              <div className="p-4 sm:p-5 rounded-3xl bg-[var(--bg-surface-1)] border border-[var(--border-subtle)] text-[var(--text-primary)] space-y-4 shadow-sm">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--brand-primary,#dc2626)] text-white shadow-xs">
                      2-Player Direct Room
                    </span>
                    <span className="text-xs text-[var(--text-secondary)] font-mono">No Queue Waiting</span>
                  </div>
                  <h3 className="text-base font-bold font-display tracking-tight text-[var(--text-primary)] mt-1">
                    Invite a Friend or Open in a 2nd Browser Tab
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Create a private room to get a shareable link/code, or enter your friend's code to connect immediately!
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* Option A: Create Private Room */}
                  <div className="p-4 rounded-2xl bg-[var(--bg-surface-0)] border border-[var(--border-subtle)] space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 font-semibold text-xs text-[var(--text-primary)]">
                        <KeyRound className="w-4 h-4 text-amber-500" />
                        <span>Create New Room</span>
                      </div>
                      <p className="text-[11px] text-[var(--text-secondary)] mt-1">
                        Generates a 5-letter Room Code and direct invite URL for your friend.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleCreatePrivateJam}
                      className="w-full py-2.5 rounded-xl bg-[var(--brand-primary,#dc2626)] hover:brightness-105 active:scale-[0.98] text-white font-semibold text-xs shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Share2 className="w-4 h-4" />
                      <span>Create Private Room Code</span>
                    </button>
                  </div>

                  {/* Option B: Join with Code */}
                  <div className="p-4 rounded-2xl bg-[var(--bg-surface-0)] border border-[var(--border-subtle)] space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 font-semibold text-xs text-[var(--text-primary)]">
                        <Users className="w-4 h-4 text-blue-500" />
                        <span>Join Friend's Room</span>
                      </div>
                      <p className="text-[11px] text-[var(--text-secondary)] mt-1">
                        Have a code from a friend? Enter it below to join their split screen.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={roomCodeInput}
                        onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                        placeholder="e.g. JAM88"
                        className="flex-1 px-3 py-2 text-xs rounded-xl bg-[var(--bg-surface-1)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-mono font-bold focus:outline-none focus:border-[var(--brand-primary,#dc2626)] uppercase"
                      />
                      <button
                        type="button"
                        disabled={!roomCodeInput.trim()}
                        onClick={() => handleJoinPrivateJam()}
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-semibold text-xs shadow-xs transition-all cursor-pointer shrink-0"
                      >
                        Join!
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: DISCOVERY / STRANGER QUEUE */}
            {matchTab === 'DISCOVERY' && (
              <div className="space-y-4">
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
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">
                    Choose Connection Mode
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setMode('TEXT')}
                      className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                        mode === 'TEXT'
                          ? 'bg-rose-500/10 border-rose-500/30 ring-1 ring-rose-500/20 shadow-xs'
                          : 'bg-[var(--bg-surface-0)] border-[var(--border-subtle)] hover:border-black/20 dark:hover:border-white/20'
                      }`}
                    >
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                          mode === 'TEXT' ? 'bg-[var(--brand-primary,#dc2626)] text-white' : 'bg-[var(--bg-surface-2)] text-[var(--text-secondary)]'
                        }`}
                      >
                        <MessageSquare className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-[var(--text-primary)]">Text &amp; Canvas Jam</div>
                        <div className="text-[11px] text-[var(--text-secondary)]">Live chat + interactive playground</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setMode('VIDEO')}
                      className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                        mode === 'VIDEO'
                          ? 'bg-rose-500/10 border-rose-500/30 ring-1 ring-rose-500/20 shadow-xs'
                          : 'bg-[var(--bg-surface-0)] border-[var(--border-subtle)] hover:border-black/20 dark:hover:border-white/20'
                      }`}
                    >
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                          mode === 'VIDEO' ? 'bg-[var(--brand-primary,#dc2626)] text-white' : 'bg-[var(--bg-surface-2)] text-[var(--text-secondary)]'
                        }`}
                      >
                        <Video className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-[var(--text-primary)]">Video + Audio Jam</div>
                        <div className="text-[11px] text-[var(--text-secondary)]">WebRTC camera + interactive playground</div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Pseudonym Field */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-[var(--text-secondary)]">Your Incognito Alias</label>
                    <button
                      type="button"
                      onClick={rerollPseudonym}
                      className="text-[11px] font-semibold text-[var(--brand-primary,#dc2626)] hover:brightness-110 flex items-center gap-1 cursor-pointer"
                    >
                      <Dice5 className="w-3.5 h-3.5" />
                      <span>Reroll Alias</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={pseudonym}
                    onChange={(e) => setPseudonym(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-[var(--border-subtle)] focus:outline-none focus:border-[var(--brand-primary,#dc2626)] text-xs font-semibold text-[var(--text-primary)] bg-[var(--bg-surface-0)] shadow-xs"
                  />
                </div>

                {/* Shared Interests Tags */}
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">
                    Pairing Interests &amp; Tags
                  </label>
                  <div className="flex flex-wrap gap-1.5 mb-2.5">
                    {SUGGESTED_TAGS.map((tag) => {
                      const isSelected = selectedTags.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleTag(tag)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[var(--brand-primary,#dc2626)] text-white shadow-xs'
                              : 'bg-[var(--bg-surface-2)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)]'
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
                    placeholder="Type a custom interest and press Enter (e.g. Anime, Science)..."
                    className="w-full px-3.5 py-2 rounded-xl border border-[var(--border-subtle)] text-xs focus:outline-none focus:border-[var(--brand-primary,#dc2626)] bg-[var(--bg-surface-0)] text-[var(--text-primary)] placeholder:[var(--text-muted)] shadow-xs"
                  />
                </div>

                {/* Queue Counter & Join Button */}
                <div className="pt-2 space-y-3">
                  <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] px-1">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>{queueCount} active peers waiting in match pool</span>
                    </span>
                    <span>Fast 1-on-1 discovery</span>
                  </div>

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
          </div>
        )}

        {/* ================= STATE 2: SEARCHING / PRIVATE RADAR ================= */}
        {state === 'SEARCHING' && (
          <div className="p-8 sm:p-12 flex flex-col items-center justify-center text-center space-y-6">
            <div className="relative w-28 h-28 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-2 border-rose-500/30 animate-ping" />
              <div className="absolute inset-2 rounded-full border-2 border-rose-500/50 animate-pulse" />
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-red-600 to-rose-600 text-white flex items-center justify-center shadow-lg">
                <Radio className="w-8 h-8 animate-spin" />
              </div>
            </div>

            {/* If Waiting in Private Room */}
            {activeRoomCode ? (
              <div className="space-y-4 max-w-md w-full">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/15 text-rose-600 border border-rose-500/25 text-xs font-bold mb-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                    <span>Connecting to Private Jam Room</span>
                  </div>
                  <h3 className="text-xl font-bold text-[var(--text-primary)] font-display">
                    Room Code: <span className="text-[var(--brand-primary,#dc2626)] font-mono tracking-wider">{activeRoomCode}</span>
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">
                    Connecting to your partner or waiting for 2nd player to enter the room...
                  </p>
                </div>

                {/* Direct Share Link & 2nd Tab Button */}
                <div className="p-3.5 rounded-2xl bg-[var(--bg-surface-1)] border border-[var(--border-subtle)] text-left space-y-2.5">
                  <label className="text-xs font-medium text-[var(--text-secondary)] block">Share Invite Link with Friend:</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={directShareLink}
                      className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-[var(--bg-surface-0)] border border-[var(--border-subtle)] font-mono text-[var(--text-primary)] select-all"
                    />
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="px-3 py-1.5 rounded-xl bg-[var(--brand-primary,#dc2626)] hover:brightness-105 active:scale-[0.98] text-white text-xs font-semibold transition-colors shrink-0 flex items-center gap-1 cursor-pointer shadow-xs"
                    >
                      {copiedInvite ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedInvite ? 'Copied!' : 'Copy'}</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleJoinPrivateJam(activeRoomCode)}
                      className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Re-sync / Connect Now</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => window.open(directShareLink, '_blank')}
                      className="w-full py-2 rounded-xl bg-[var(--bg-surface-2)] hover:bg-[var(--bg-surface-0)] text-[var(--text-primary)] font-medium text-xs border border-[var(--border-subtle)] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open 2nd Browser Tab</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <h3 className="text-lg font-bold text-[var(--text-primary)] font-display">
                  Matching with an Anonymous Peer...
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-sm">
                  Pairing you with another guest or anonymous user interested in{' '}
                  {selectedTags.length ? selectedTags.map((t) => `#${t}`).join(', ') : 'anything'}.
                </p>
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleLaunchDemoJam}
                className="py-2 px-4 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 font-semibold text-xs border border-purple-500/20 transition-colors cursor-pointer"
              >
                Launch with AI Partner Immediately
              </button>

              <button
                type="button"
                onClick={handleCancelSearch}
                className="py-2 px-5 rounded-xl bg-[var(--bg-surface-2)] hover:bg-[var(--bg-surface-1)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)] font-medium text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ================= STATE 3: CONNECTED SPLIT-SCREEN ================= */}
        {state === 'CONNECTED' && (
          <div className="flex-1 flex flex-col overflow-hidden min-h-0">
            {/* Mobile View Toggle Bar */}
            <div className="lg:hidden flex items-center justify-around border-b border-[var(--border-subtle)] bg-[var(--bg-surface-1)] p-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setMobileTab('PLAYGROUND')}
                className={`flex-1 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  mobileTab === 'PLAYGROUND'
                    ? 'bg-[var(--brand-primary,#dc2626)] text-white shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Gamepad2 className="w-4 h-4" />
                <span>Co-Op Jam Playground</span>
              </button>

              <button
                type="button"
                onClick={() => setMobileTab('CHAT')}
                className={`flex-1 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  mobileTab === 'CHAT'
                    ? 'bg-[var(--brand-primary,#dc2626)] text-white shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>Live Chat &amp; Voice</span>
              </button>
            </div>

            {/* Split Screen Grid */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden min-h-0">
              {/* LEFT COLUMN: LIVE CHAT / AUDIO / VIDEO (4-5 cols) */}
              <div
                className={`lg:col-span-5 xl:col-span-4 flex flex-col h-full border-r border-[var(--border-subtle)] bg-[var(--bg-surface-0)] overflow-hidden ${
                  mobileTab === 'CHAT' ? 'flex' : 'hidden lg:flex'
                }`}
              >
                {/* Partner Top Bar */}
                <div className="px-3.5 py-2.5 bg-[var(--bg-surface-1)] border-b border-[var(--border-subtle)] flex items-center justify-between gap-2 shrink-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="relative">
                      <div className="w-8 h-8 rounded-full bg-[var(--bg-surface-2)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-bold text-xs flex items-center justify-center shrink-0">
                        {activePartner.pseudonym.charAt(0)}
                      </div>
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-[var(--bg-surface-0)]" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-[var(--text-primary)] truncate">
                          {activePartner.pseudonym}
                        </span>
                        {activePartner.isGuest ? (
                          <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded-md bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/25">
                            Guest
                          </span>
                        ) : (
                          <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded-md bg-purple-500/10 text-purple-800 dark:text-purple-300 border border-purple-500/25">
                            Anon
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-[var(--text-secondary)] flex items-center gap-1">
                        <span>Synced 1-on-1</span>
                        <span>•</span>
                        <span className="text-[var(--brand-primary,#dc2626)] font-semibold">{mode}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions: Reveal, Next, End */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={handleRequestReveal}
                      className={`px-2 py-1 rounded-xl text-[11px] font-semibold border flex items-center gap-1 transition-colors cursor-pointer ${
                        revealedUsers
                          ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/30'
                          : revealRequested
                          ? 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30 animate-pulse'
                          : 'bg-[var(--bg-surface-1)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:bg-[var(--bg-surface-2)]'
                      }`}
                      title="Request Mutual Identity Reveal"
                    >
                      <Eye className="w-3 h-3" />
                      <span>{revealedUsers ? 'Revealed' : revealRequested ? 'Accept' : 'Reveal'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleNextMatch}
                      className="px-2 py-1 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-500/20 font-semibold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                      title="Skip to next partner"
                    >
                      <FastForward className="w-3 h-3" />
                      <span>Next</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleEndChat}
                      className="p-1 rounded-xl bg-[var(--bg-surface-2)] hover:bg-[var(--bg-surface-1)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)] transition-colors cursor-pointer"
                      title="End conversation"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Voice / Audio Presence Bar or Video Grid */}
                {mode === 'VIDEO' ? (
                  <div className="p-2.5 bg-black grid grid-cols-2 gap-2 h-36 shrink-0">
                    <div className="relative rounded-2xl overflow-hidden bg-[var(--bg-surface-1)] flex items-center justify-center border border-[var(--border-subtle)]">
                      <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-1.5 left-1.5 text-[9px] font-bold text-white bg-black/60 px-1.5 py-0.5 rounded-md">
                        You
                      </div>
                    </div>

                    <div className="relative rounded-2xl overflow-hidden bg-[var(--bg-surface-1)] flex items-center justify-center border border-[var(--border-subtle)]">
                      <div className="text-center p-2 text-[var(--text-secondary)]">
                        <Video className="w-6 h-6 mx-auto mb-1 opacity-50" />
                        <div className="text-[11px] font-semibold">{activePartner.pseudonym}</div>
                      </div>
                      <div className="absolute bottom-1.5 left-1.5 text-[9px] font-bold text-white bg-black/60 px-1.5 py-0.5 rounded-md">
                        Peer
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="px-3 py-2 bg-[var(--bg-surface-1)] border-b border-[var(--border-subtle)] flex items-center justify-between gap-2 shrink-0">
                    <div className="flex items-center gap-2 text-xs">
                      <div
                        className={`w-7 h-7 rounded-xl flex items-center justify-center ${
                          isMicMuted
                            ? 'bg-[var(--bg-surface-2)] text-[var(--text-secondary)]'
                            : 'bg-red-500/15 text-[var(--brand-primary,#dc2626)] animate-pulse'
                        }`}
                      >
                        {isMicMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                      </div>

                      <div>
                        <div className="text-[11px] font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                          <span>Live Voice Channel</span>
                          {!isMicMuted && (
                            <span className="flex items-center gap-0.5">
                              <span className="w-1 h-2 bg-emerald-500 rounded-full animate-pulse" />
                              <span className="w-1 h-3 bg-emerald-500 rounded-full animate-pulse delay-100" />
                              <span className="w-1 h-1.5 bg-emerald-500 rounded-full animate-pulse delay-200" />
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-[var(--text-secondary)]">
                          {isMicMuted ? 'Mic is muted' : 'Voice connected with peer'}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsMicMuted(!isMicMuted)}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold border transition-colors cursor-pointer ${
                        isMicMuted
                          ? 'bg-[var(--bg-surface-1)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:bg-[var(--bg-surface-2)]'
                          : 'bg-[var(--brand-primary,#dc2626)] text-white border-[var(--brand-primary,#dc2626)] shadow-xs'
                      }`}
                    >
                      {isMicMuted ? 'Unmute' : 'Mute Mic'}
                    </button>
                  </div>
                )}

                {/* Messages Stream */}
                <div className="flex-1 p-3 overflow-y-auto space-y-2 bg-[var(--bg-surface-0)] min-h-0">
                  {messages.map((m) => {
                    if (m.isSystem) {
                      return (
                        <div
                          key={m.id}
                          className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-800 dark:text-purple-300 text-[11px] text-center my-1"
                        >
                          {m.content}
                        </div>
                      );
                    }

                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col ${m.isSelf ? 'items-end' : 'items-start'}`}
                      >
                        <div className="text-[10px] text-[var(--text-muted)] mb-0.5 px-1">
                          {m.sender} • {m.time}
                        </div>
                        <div
                          className={`max-w-[85%] rounded-2xl px-3 py-1.5 text-xs font-medium break-words ${
                            m.isSelf
                              ? 'bg-[var(--brand-primary,#dc2626)] text-white rounded-tr-none shadow-xs'
                              : 'bg-[var(--bg-surface-1)] text-[var(--text-primary)] rounded-tl-none border border-[var(--border-subtle)]'
                          }`}
                        >
                          {m.content}
                        </div>
                      </div>
                    );
                  })}

                  {partnerTyping && (
                    <div className="text-[11px] text-[var(--text-muted)] italic">
                      {activePartner.pseudonym} is typing...
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Quick Icebreakers Prompt Bar */}
                <div className="px-3 py-1.5 bg-[var(--bg-surface-1)] border-t border-[var(--border-subtle)] flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
                  <span className="text-[10px] font-semibold text-[var(--text-muted)] shrink-0">Ask:</span>
                  {QUICK_ICEBREAKERS.map((prompt, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSendMessage(undefined, prompt)}
                      className="text-[10px] font-medium text-[var(--text-secondary)] hover:text-[var(--brand-primary,#dc2626)] bg-[var(--bg-surface-0)] hover:bg-[var(--bg-surface-2)] px-2 py-1 rounded-lg border border-[var(--border-subtle)] transition-colors shrink-0 whitespace-nowrap cursor-pointer shadow-xs"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>

                {/* Chat Input Bar */}
                <form
                  onSubmit={(e) => handleSendMessage(e)}
                  className="p-2.5 border-t border-[var(--border-subtle)] bg-[var(--bg-surface-0)] flex items-center gap-2 shrink-0"
                >
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={handleInputChange}
                    placeholder={`Message ${activePartner.pseudonym}...`}
                    className="flex-1 px-3 py-2 text-xs rounded-xl bg-[var(--bg-surface-1)] border border-[var(--border-subtle)] focus:outline-none focus:border-[var(--brand-primary,#dc2626)] text-[var(--text-primary)] shadow-xs"
                  />
                  <button
                    type="submit"
                    disabled={!inputMessage.trim()}
                    className="p-2 rounded-xl bg-[var(--brand-primary,#dc2626)] hover:brightness-105 active:scale-[0.98] disabled:opacity-40 text-white transition-colors cursor-pointer shrink-0 shadow-xs"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>

              {/* RIGHT COLUMN: CO-OP CANVAS & TRIVIA JAM PLAYGROUND (7-8 cols) */}
              <div
                className={`lg:col-span-7 xl:col-span-8 flex flex-col h-full bg-[#080912] overflow-hidden ${
                  mobileTab === 'PLAYGROUND' ? 'flex' : 'hidden lg:flex'
                }`}
              >
                <CanvasTriviaJamPlayground
                  sessionId={currentSessionId || 'default_jam'}
                  myPseudonym={pseudonym}
                  partnerPseudonym={activePartner.pseudonym}
                  isHost={isHost}
                  sessionRoomCode={activeRoomCode || undefined}
                  onRegisterPrivateRoom={handleRegisterPrivateRoom}
                  onGameEventNotice={(notice) => {
                    setMessages((prev) => [
                      ...prev,
                      {
                        id: Math.random().toString(),
                        sender: 'Game Event',
                        content: notice,
                        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        isSelf: false,
                        isSystem: true,
                      },
                    ]);
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Global Game Rules Modal */}
        <GameRulesModal
          isOpen={rulesModalOpen}
          onClose={() => setRulesModalOpen(false)}
        />
      </div>
    </div>
  );
};
