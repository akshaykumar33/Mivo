'use client';

import * as React from 'react';
import { MessageDTO, RoomDTO, AttachmentMetaDTO, REALTIME_EVENTS } from '@mivo/shared';
import { api } from '@/lib/api-client';
import { realtime } from '@/lib/socket-client';
import { usePresenceStore } from '@/stores/presenceStore';
import { useAuthStore } from '@/stores/authStore';
import { Avatar, Badge } from '@mivo/ui';
import { MessageComposer } from './MessageComposer';
import { ThreadSidebar } from './ThreadSidebar';
import {
  MessageSquare,
  Sparkles,
  Hash,
  CheckCheck,
  Smile,
  Heart,
  ThumbsUp,
  Flame,
  PartyPopper,
  FileText,
  Download,
  ExternalLink,
  Film,
  Music,
  X,
  Eye,
  Bot,
  CornerUpLeft,
  MessageSquareReply,
  MessageSquareText,
  ChevronRight,
  Languages,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { translationManager, SUPPORTED_LANGUAGES } from '@/lib/translation-manager';
import { LanguageSelectorPopover } from './LanguageSelectorPopover';
import { storageClient } from '@/lib/storage-client';
import { ExternalMeetingCard } from '@/features/meetings/ExternalMeetingCard';
import { GraphicalReaction } from '@/features/reactions';
import {
  UniversalFileViewerModal,
  YouTubeEmbedCard,
  extractYouTubeUrls,
  FileViewerItem,
  resolveStorageUrl,
} from '@/features/files';

function sanitizeChatMessage(content: string, hasMeetingAttachment: boolean): string | null {
  if (!content) return null;
  if (content === 'Sent attachments') return null;
  if (
    hasMeetingAttachment &&
    (content.includes('Created Google Meet Session') ||
      content.includes('Created Microsoft Teams Session') ||
      (content.includes('Created') && content.includes('Session:')))
  ) {
    return null;
  }
  const trimmed = content.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export interface ChatStreamProps {
  room: RoomDTO;
}

export const ChatStream: React.FC<ChatStreamProps> = ({ room }) => {
  const { user: currentUser } = useAuthStore();
  const userStatuses = usePresenceStore((s) => s.userStatuses);
  const [messages, setMessages] = React.useState<MessageDTO[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const [messageReactions, setMessageReactions] = React.useState<Record<string, Record<string, number>>>({});
  const [typingUsers, setTypingUsers] = React.useState<Record<string, string>>({});
  const [activeViewerFile, setActiveViewerFile] = React.useState<FileViewerItem | null>(null);
  const [replyingTo, setReplyingTo] = React.useState<MessageDTO | null>(null);
  const [activeThreadRoot, setActiveThreadRoot] = React.useState<MessageDTO | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = React.useState<string | null>(null);
  const scrollBottomRef = React.useRef<HTMLDivElement>(null);

  // Multilingual AI Translation & Native Audio Playback (TTS) state
  const [targetLang, setTargetLang] = React.useState<string>('es');
  const [translatedMap, setTranslatedMap] = React.useState<
    Record<string, { translatedText: string; langCode: string; isLoading?: boolean }>
  >({});
  const [speakingMsgId, setSpeakingMsgId] = React.useState<string | null>(null);

  const handleTranslateMessage = async (msgId: string, text: string, langToUse?: string) => {
    const lang = langToUse || targetLang;
    if (!text?.trim()) return;

    setTranslatedMap((prev) => ({
      ...prev,
      [msgId]: { translatedText: '', langCode: lang, isLoading: true },
    }));

    try {
      const userKey =
        typeof localStorage !== 'undefined'
          ? localStorage.getItem('mivo_gemini_api_key') || undefined
          : undefined;
      const res = await api.post<{ translatedText: string; engine: string }>('/api/v1/ai/translate', {
        text: text.trim(),
        targetLanguage: lang,
        apiKey: userKey,
      });

      const translated =
        res.data?.translatedText || (await translationManager.translateText(text.trim(), lang));
      setTranslatedMap((prev) => ({
        ...prev,
        [msgId]: { translatedText: translated, langCode: lang, isLoading: false },
      }));
    } catch {
      const fallback = await translationManager.translateText(text.trim(), lang);
      setTranslatedMap((prev) => ({
        ...prev,
        [msgId]: { translatedText: fallback, langCode: lang, isLoading: false },
      }));
    }
  };

  const handleSpeakText = (msgId: string, text: string, langCode: string) => {
    if (speakingMsgId === msgId) {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setSpeakingMsgId(null);
      return;
    }
    setSpeakingMsgId(msgId);
    translationManager.speakText(text, langCode, () => {
      setSpeakingMsgId(null);
    });
  };

  const handleDismissTranslation = (msgId: string) => {
    setTranslatedMap((prev) => {
      const copy = { ...prev };
      delete copy[msgId];
      return copy;
    });
  };

  // 1. Fetch historical messages for the room
  React.useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    api.get<MessageDTO[]>(`/api/v1/rooms/${room.id}/messages`).then((res) => {
      if (isMounted && res.success && res.data) {
        const seen = new Set<string>();
        const uniqueMessages = res.data.filter((m) => {
          if (!m.id || seen.has(m.id)) return false;
          seen.add(m.id);
          return true;
        });
        setMessages(uniqueMessages);
      }
      if (isMounted) {
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [room.id]);

  // 2. Real-time message subscription & typing indicators
  React.useEffect(() => {
    const handleNewMessage = (newMsg: MessageDTO) => {
      if (newMsg.roomId === room.id) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
      }
    };

    const handleTyping = (data: { roomId: string; userId: string; username: string }) => {
      if (data.roomId === room.id) {
        setTypingUsers((prev) => ({ ...prev, [data.userId]: data.username }));
      }
    };

    const handleStopTyping = (data: { roomId: string; userId: string }) => {
      if (data.roomId === room.id) {
        setTypingUsers((prev) => {
          const copy = { ...prev };
          delete copy[data.userId];
          return copy;
        });
      }
    };

    const handleReactionAdded = (data: { roomId: string; messageId: string; emoji: string }) => {
      if (data.roomId === room.id) {
        setMessageReactions((prev) => {
          const currentMsg = prev[data.messageId] || {};
          const currentCount = currentMsg[data.emoji] || 0;
          return {
            ...prev,
            [data.messageId]: {
              ...currentMsg,
              [data.emoji]: currentCount + 1,
            },
          };
        });
      }
    };

    const handleAiAgentResponse = (data: any) => {
      if (data.roomId === room.id && data.status === 'SPEAKING' && data.speechText) {
        const botMsg: MessageDTO = {
          id: `ai-msg-${Date.now()}`,
          roomId: room.id,
          senderId: 'mivo-ai-cohost',
          content: `**Mivo AI Co-Host:** ${data.speechText}${
            data.pinnedTile?.tickets?.length
              ? `\n\n**Live Sprint Stage Sync:**\n` +
                data.pinnedTile.tickets
                  .map(
                    (t: any) =>
                      `• **[${t.priority}]** ${t.title} (${t.status}) — *${t.assignee}*`
                  )
                  .join('\n')
              : ''
          }`,
          attachments: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          sender: {
            id: 'mivo-ai-cohost',
            username: 'mivo_ai',
            displayName: 'Mivo AI Co-Host',
            avatarUrl: null,
            status: 'ONLINE',
            customStatus: 'Stage Co-Host & Real-Time Duplex Agent',
          },
        };

        setMessages((prev) => [...prev, botMsg]);
      }
    };

    const handleThreadUpdated = (data: { roomId: string; threadId: string; threadMeta: any }) => {
      if (data.roomId === room.id) {
        setMessages((prev) =>
          prev.map((m) => (m.id === data.threadId ? { ...m, threadMeta: data.threadMeta } : m))
        );
        setActiveThreadRoot((prev) => {
          if (prev && prev.id === data.threadId) {
            return { ...prev, threadMeta: data.threadMeta };
          }
          return prev;
        });
      }
    };

    realtime.on(REALTIME_EVENTS.CHAT_NEW_MESSAGE, handleNewMessage);
    realtime.on(REALTIME_EVENTS.CHAT_THREAD_UPDATED, handleThreadUpdated);
    realtime.on(REALTIME_EVENTS.CHAT_TYPING, handleTyping);
    realtime.on(REALTIME_EVENTS.CHAT_STOP_TYPING, handleStopTyping);
    realtime.on(REALTIME_EVENTS.CHAT_REACTION_ADDED, handleReactionAdded);
    realtime.on(REALTIME_EVENTS.ROOM_AI_AGENT_RESPONSE, handleAiAgentResponse);

    return () => {
      realtime.off(REALTIME_EVENTS.CHAT_NEW_MESSAGE, handleNewMessage);
      realtime.off(REALTIME_EVENTS.CHAT_THREAD_UPDATED, handleThreadUpdated);
      realtime.off(REALTIME_EVENTS.CHAT_TYPING, handleTyping);
      realtime.off(REALTIME_EVENTS.CHAT_STOP_TYPING, handleStopTyping);
      realtime.off(REALTIME_EVENTS.CHAT_REACTION_ADDED, handleReactionAdded);
      realtime.off(REALTIME_EVENTS.ROOM_AI_AGENT_RESPONSE, handleAiAgentResponse);
    };
  }, [room.id, room.name, room.channelId]);

  // Jump smoothly to quoted message (WhatsApp style)
  const handleJumpToMessage = (messageId: string) => {
    const el = document.getElementById(`msg-${messageId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedMessageId(messageId);
      setTimeout(() => {
        setHighlightedMessageId((curr) => (curr === messageId ? null : curr));
      }, 2000);
    }
  };

  // 3. Auto-scroll on new messages
  React.useEffect(() => {
    scrollBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  const handleMessageSent = (sentMsg: MessageDTO) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === sentMsg.id)) return prev;
      return [...prev, sentMsg];
    });

    if (
      sentMsg.content.toLowerCase().includes('@mivo') ||
      sentMsg.content.toLowerCase().startsWith('mivo')
    ) {
      const socket = realtime.getSocket();
      if (socket) {
        socket.emit(REALTIME_EVENTS.ROOM_AI_AGENT_ACTION, {
          roomId: room.id,
          query: sentMsg.content,
          roomName: room.name,
          attendees: [sentMsg.sender?.displayName || 'Attendee'],
          communityId: room.channelId,
        });
      }
    }
  };


  const handleAddReaction = (msgId: string, emoji: string) => {
    setMessageReactions((prev) => {
      const currentMsg = prev[msgId] || {};
      const currentCount = currentMsg[emoji] || 0;
      return {
        ...prev,
        [msgId]: {
          ...currentMsg,
          [emoji]: currentCount + 1,
        },
      };
    });

    realtime.emit(REALTIME_EVENTS.CHAT_REACTION_ADD, {
      roomId: room.id,
      messageId: msgId,
      emoji,
    });
  };

  const typingNames = Object.values(typingUsers);

  return (
    <div className="flex-1 flex h-full overflow-hidden select-none">
      <div className="flex-1 flex flex-col h-full bg-[var(--bg-canvas)] relative overflow-hidden select-none min-w-0">
        {/* Multilingual AI Instant Translation Control Bar */}
        <div className="h-10 px-3 sm:px-6 bg-[var(--bg-surface-0)] border-b border-[var(--border-subtle)] flex items-center justify-between text-xs z-10 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-violet-600/15 text-violet-600 dark:text-violet-300 font-bold text-[11px] border border-violet-500/25">
              <Languages className="w-3.5 h-3.5" />
              <span>AI Translation</span>
            </span>
            <span className="text-[11px] text-[var(--text-muted)] font-semibold hidden sm:inline">Target:</span>
            <LanguageSelectorPopover
              value={targetLang}
              onChange={(code) => setTargetLang(code)}
            />
          </div>
          <span className="text-[10px] text-[var(--text-muted)] font-mono hidden md:inline">
            12+ Languages • Whisper AI & Native Audio TTS
          </span>
        </div>

        {/* Message History Scroller */}
        <div className="flex-1 overflow-y-auto px-2 sm:px-6 py-4 space-y-3 sm:space-y-4 custom-scrollbar">
        {isLoading && (
          <div className="flex flex-col items-center justify-center h-48 space-y-3 text-[var(--text-muted)]">
            <div className="w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-[#71717A]">Loading secure message history...</p>
          </div>
        )}

        {!isLoading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-center px-4">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-600 mb-3 shadow-sm">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-[#111827] font-display">Welcome to #{room.name}</h4>
            <p className="text-xs text-[#4B5563] max-w-sm mt-1">
              This is the start of the #{room.name} channel stream. Send messages, drag and drop attachments, or start speaking.
            </p>
          </div>
        )}

        {messages.map((msg) => {
          const timestamp = new Date(msg.createdAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          });
          const reactions = messageReactions[msg.id] || {};
          const attachments = (msg.attachments as AttachmentMetaDTO[]) || [];

          const senderPresence = msg.sender?.id ? userStatuses[msg.sender.id] : undefined;
          const senderStatus = senderPresence?.status || msg.sender?.status || 'ONLINE';
          const senderCustomStatus = senderPresence?.customStatus !== undefined ? senderPresence.customStatus : msg.sender?.customStatus;

          const isHighlighted = highlightedMessageId === msg.id;

          return (
            <div
              key={msg.id}
              id={`msg-${msg.id}`}
              className={`flex items-start gap-2.5 sm:gap-3 group px-2 py-1.5 rounded-2xl transition-all duration-300 ${
                isHighlighted
                  ? 'ring-2 ring-emerald-500/70 bg-emerald-500/10 shadow-md'
                  : 'hover:bg-black/[0.02]'
              }`}
            >
              <div className="relative shrink-0">
                <Avatar
                  fallbackText={msg.sender?.displayName || msg.sender?.username || 'U'}
                  src={msg.sender?.avatarUrl || undefined}
                  status={senderStatus}
                  className="w-8 h-8 rounded-xl ring-1 ring-red-500/20 flex-shrink-0"
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-wrap">
                    <span className="text-xs font-bold text-[#111827] hover:underline cursor-pointer truncate">
                      {msg.sender?.displayName || msg.sender?.username}
                    </span>
                    {(msg.sender?.isGuest || msg.sender?.username?.startsWith('guest_')) && (
                      <span className="text-[9px] font-bold tracking-wider uppercase px-1.5 py-0.2 rounded-full bg-amber-500/15 text-amber-800 border border-amber-500/30">
                        Guest
                      </span>
                    )}
                    {senderCustomStatus && (
                      <span
                        className="text-[10px] text-[#DC2626] font-semibold bg-red-500/10 px-1.5 py-0.5 rounded-full border border-red-500/20 truncate max-w-[130px]"
                        title={senderCustomStatus}
                      >
                        {senderCustomStatus}
                      </span>
                    )}
                    <span className="text-[10px] text-[#71717A] font-mono flex-shrink-0">{timestamp}</span>
                    <span title="Delivered & Read" className="flex-shrink-0">
                      <CheckCheck className="w-3.5 h-3.5 text-red-600" />
                    </span>
                  </div>

                  {/* Quick Action Bar (WhatsApp Reply + Slack Thread + Reactions) */}
                  <div className="flex items-center gap-0.5 sm:gap-1 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity bg-[var(--bg-surface-0)] px-1.5 sm:px-2 py-0.5 rounded-[12px] border border-[var(--border-subtle)] shadow-lg backdrop-blur-xl flex-shrink-0">
                    {/* WhatsApp Reply Button */}
                    <button
                      onClick={() => setReplyingTo(msg)}
                      className="p-1 hover:scale-125 transition-transform cursor-pointer text-[#71717A] hover:text-emerald-600"
                      title="Reply quote"
                    >
                      <CornerUpLeft className="w-3.5 h-3.5" />
                    </button>

                    {/* Slack Reply in Thread Button */}
                    <button
                      onClick={() => setActiveThreadRoot(msg)}
                      className="p-1 hover:scale-125 transition-transform cursor-pointer text-[#71717A] hover:text-red-600"
                      title="Reply in thread"
                    >
                      <MessageSquareReply className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleAddReaction(msg.id, 'heart')}
                      className="p-1 hover:scale-125 transition-transform cursor-pointer"
                      title="Heart"
                    >
                      <GraphicalReaction name="heart" size="sm" />
                    </button>
                    <button
                      onClick={() => handleAddReaction(msg.id, 'thumbs_up')}
                      className="p-1 hover:scale-125 transition-transform cursor-pointer"
                      title="Thumbs Up"
                    >
                      <GraphicalReaction name="thumbs_up" size="sm" />
                    </button>
                    <button
                      onClick={() => handleAddReaction(msg.id, 'fire')}
                      className="p-1 hover:scale-125 transition-transform cursor-pointer"
                      title="Fire"
                    >
                      <GraphicalReaction name="fire" size="sm" />
                    </button>
                    <button
                      onClick={() => handleAddReaction(msg.id, 'party')}
                      className="p-1 hover:scale-125 transition-transform cursor-pointer"
                      title="Celebrate"
                    >
                      <GraphicalReaction name="party" size="sm" />
                    </button>

                    <div className="w-px h-3.5 bg-[var(--border-subtle)] mx-0.5" />

                    {/* Multilingual Instant Translate Button */}
                    <button
                      type="button"
                      onClick={() => handleTranslateMessage(msg.id, msg.content, targetLang)}
                      className={`p-1 hover:scale-125 transition-transform cursor-pointer ${
                        translatedMap[msg.id]
                          ? 'text-violet-600 dark:text-violet-400 font-bold'
                          : 'text-[#71717A] hover:text-violet-600'
                      }`}
                      title={`Instant Translate to ${SUPPORTED_LANGUAGES.find((l) => l.code === targetLang)?.name || 'Target Language'}`}
                    >
                      <Languages className="w-3.5 h-3.5" />
                    </button>

                    {/* Native Speech Synthesis (TTS) Button */}
                    <button
                      type="button"
                      onClick={() => handleSpeakText(msg.id, msg.content, 'en')}
                      className={`p-1 hover:scale-125 transition-transform cursor-pointer ${
                        speakingMsgId === msg.id
                          ? 'text-emerald-500 animate-pulse'
                          : 'text-[#71717A] hover:text-emerald-500'
                      }`}
                      title={speakingMsgId === msg.id ? 'Stop Speech Playback' : 'Listen with Native Speech TTS'}
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Slack-style "Replied to a thread" indicator */}
                {msg.isThreadBroadcast && (
                  <div
                    onClick={() => {
                      const root = messages.find((m) => m.id === msg.threadId) || msg;
                      setActiveThreadRoot(root);
                    }}
                    className="flex items-center gap-1.5 text-[11px] font-semibold text-red-600 hover:underline cursor-pointer mb-1 select-none"
                    title="View original thread"
                  >
                    <MessageSquareText className="w-3.5 h-3.5" />
                    <span>Replied to a thread</span>
                  </div>
                )}

                {/* WhatsApp-style Quoted Message Box */}
                {msg.replyTo && (
                  <div
                    onClick={() => handleJumpToMessage(msg.replyTo!.id)}
                    className="mb-1.5 p-2 px-3 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] border-l-[3.5px] border-emerald-500 hover:bg-black/[0.07] dark:hover:bg-white/[0.09] transition-all cursor-pointer group/quote max-w-lg select-none"
                    title="Click to jump to quoted message"
                  >
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mb-0.5">
                      <CornerUpLeft className="w-3 h-3 group-hover/quote:-translate-x-0.5 transition-transform" />
                      <span>{msg.replyTo.sender?.displayName || msg.replyTo.sender?.username || 'User'}</span>
                    </div>
                    <div className="text-xs text-[var(--text-muted)] line-clamp-2">
                      {msg.replyTo.content || (msg.replyTo.attachments?.length ? 'Shared attachment' : 'Message')}
                    </div>
                  </div>
                )}

                {/* Original Message Text + YouTube Link Previews */}
                {(() => {
                  const cleaned = sanitizeChatMessage(
                    msg.content || '',
                    attachments.some((a: any) => a.type === 'external-meeting')
                  );
                  if (!cleaned) return null;

                  return (
                    <div>
                      <div className="text-sm text-[#111827] leading-relaxed break-words select-text font-normal">
                        {cleaned}
                      </div>

                      {/* Multilingual AI Translated Sub-Card with Native Audio Playback */}
                      {translatedMap[msg.id] && (
                        <div className="mt-2.5 p-3 rounded-2xl bg-gradient-to-r from-violet-600/10 via-purple-600/5 to-transparent border border-violet-500/25 shadow-sm space-y-2 animate-fadeIn select-text">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded-md bg-violet-600/20 text-violet-400 font-mono font-bold text-[10px] uppercase border border-violet-500/30">
                                {translatedMap[msg.id].langCode.toUpperCase()}
                              </span>
                              <span className="text-[11px] font-bold text-violet-300">
                                {SUPPORTED_LANGUAGES.find((l) => l.code === translatedMap[msg.id].langCode)?.name || 'Translated'}
                              </span>
                              <span className="text-[10px] text-[var(--text-muted)] hidden sm:inline">• Mivo AI Translation</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {!translatedMap[msg.id].isLoading && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleSpeakText(
                                      `trans-${msg.id}`,
                                      translatedMap[msg.id].translatedText,
                                      translatedMap[msg.id].langCode
                                    )
                                  }
                                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                    speakingMsgId === `trans-${msg.id}`
                                      ? 'bg-emerald-600 text-white shadow-md animate-pulse'
                                      : 'bg-white/[0.06] hover:bg-white/[0.12] text-violet-300 hover:text-white border border-white/10'
                                  }`}
                                  title="Listen to translation with Native Speech (TTS)"
                                >
                                  <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                                  <span className="text-[10px]">
                                    {speakingMsgId === `trans-${msg.id}` ? 'Playing...' : 'Listen'}
                                  </span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleDismissTranslation(msg.id)}
                                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06] transition-colors cursor-pointer"
                                title="Dismiss translation"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                          {translatedMap[msg.id].isLoading ? (
                            <div className="flex items-center gap-2 text-xs text-violet-300 py-1">
                              <div className="w-3.5 h-3.5 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
                              <span>Translating with Mivo AI across 12+ languages...</span>
                            </div>
                          ) : (
                            <div className="text-sm text-[var(--text-primary)] leading-relaxed font-medium">
                              {translatedMap[msg.id].translatedText}
                            </div>
                          )}
                        </div>
                      )}

                      {/* AI Twin Out of Office Indicator & Quick Callback Scheduler */}
                      {((msg as any).isAiTwin || msg.content.includes('AI Twin')) && (
                        <div className="mt-2 p-2.5 rounded-xl bg-gradient-to-r from-[#BF5AF2]/15 to-[#5E5CE6]/15 border border-[#BF5AF2]/30 flex items-center justify-between text-xs animate-fadeIn">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-full bg-[#BF5AF2]/20 text-[#BF5AF2] text-[10px] font-bold flex items-center gap-1">
                              <Bot className="w-3 h-3" />
                              AI Twin • Out of Office
                            </span>
                            <span className="text-[11px] text-[#71717A] hidden sm:inline">
                              Auto-replied from indexed project notes
                            </span>
                          </div>
                          <button
                            onClick={() => {
                              api.post('/api/v1/ai/twin/schedule-callback', {
                                recipientUserId: msg.senderId,
                                requesterUserId: currentUser?.id,
                                slot: 'Tomorrow at 10:00 AM UTC',
                                communityId: room.channelId,
                              }).then((res) => {
                                if (res.success) {
                                  alert('Sync callback successfully scheduled!');
                                }
                              });
                            }}
                            className="px-2.5 py-1 rounded-lg bg-[#5E5CE6] hover:bg-[#5E5CE6]/90 text-white font-semibold text-[11px] transition-all shadow-sm cursor-pointer"
                          >
                            Schedule Callback
                          </button>
                        </div>
                      )}
                      {/* Auto-detected YouTube Videos inline in stream */}
                      {extractYouTubeUrls(cleaned).map((yt) => (
                        <YouTubeEmbedCard
                          key={yt.videoId}
                          url={yt.url}
                          onOpenViewer={(url) =>
                            setActiveViewerFile({
                              name: 'YouTube Video',
                              url,
                              type: 'video/youtube',
                            })
                          }
                        />
                      ))}
                    </div>
                  );
                })()}

                {/* Attachments Section (Supabase Storage / S3) */}
                {attachments.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {attachments.map((att: any, attIdx) => {
                      if (att.type === 'external-meeting' && att.meeting) {
                        return (
                          <ExternalMeetingCard
                            key={`${att.meeting.id}-${attIdx}`}
                            meeting={att.meeting}
                            roomId={room.id}
                          />
                        );
                      }

                      const fileUrl = resolveStorageUrl(att.url);
                      const isImg = storageClient.isImage(att.type);
                      const isVid = storageClient.isVideo(att.type);
                      const isAud = storageClient.isAudio(att.type);

                      if (isImg) {
                        return (
                          <div
                            key={`${att.url}-${attIdx}`}
                            onClick={() =>
                              setActiveViewerFile({
                                name: att.name,
                                url: fileUrl,
                                type: att.type,
                                size: att.size,
                              })
                            }
                            className="max-w-md max-h-80 rounded-2xl overflow-hidden border border-white/10 hover:border-[#5E5CE6] cursor-pointer group/img transition-all bg-black/40 shadow-md relative"
                          >
                            <img
                              src={fileUrl}
                              alt={att.name}
                              className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute top-2 right-2 px-2 py-1 rounded-md bg-black/70 backdrop-blur-md text-white opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center gap-1 text-[11px]">
                              <Eye className="w-3.5 h-3.5" />
                              <span>View</span>
                            </div>
                          </div>
                        );
                      }

                      if (isVid) {
                        return (
                          <div
                            key={`${att.url}-${attIdx}`}
                            className="max-w-lg rounded-2xl overflow-hidden border border-white/10 bg-black/50 shadow-md group relative"
                          >
                            <video controls src={fileUrl} className="w-full max-h-80" />
                            <button
                              type="button"
                              onClick={() =>
                                setActiveViewerFile({
                                  name: att.name,
                                  url: fileUrl,
                                  type: att.type,
                                  size: att.size,
                                })
                              }
                              className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-white hover:bg-black/80 transition-colors"
                              title="Expand in Video Viewer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      }

                      if (isAud) {
                        return (
                          <div
                            key={`${att.url}-${attIdx}`}
                            className="p-2 rounded-xl bg-white/[0.04] border border-white/10 max-w-sm flex items-center gap-2"
                          >
                            <audio controls src={fileUrl} className="w-full h-8 flex-1" />
                            <button
                              type="button"
                              onClick={() =>
                                setActiveViewerFile({
                                  name: att.name,
                                  url: fileUrl,
                                  type: att.type,
                                  size: att.size,
                                })
                              }
                              className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                              title="Open Audio Viewer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      }

                      // Universal File Attachment Card
                      return (
                        <div
                          key={`${att.url}-${attIdx}`}
                          onClick={() =>
                            setActiveViewerFile({
                              name: att.name,
                              url: fileUrl,
                              type: att.type,
                              size: att.size,
                            })
                          }
                          className="flex items-center gap-3 p-3 rounded-2xl bg-[var(--bg-surface-1)] hover:bg-[var(--bg-surface-2)] border border-[var(--border-subtle)] max-w-sm transition-all group/file shadow-sm cursor-pointer"
                        >
                          <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/25 flex items-center justify-center text-red-600 flex-shrink-0 group-hover/file:scale-110 transition-transform">
                            <FileText className="w-5 h-5 text-red-600" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-[#111827] truncate">{att.name}</p>
                            <p className="text-[10px] text-[#71717A]">{storageClient.formatBytes(att.size)}</p>
                          </div>
                          <div
                            className="flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() =>
                                setActiveViewerFile({
                                  name: att.name,
                                  url: fileUrl,
                                  type: att.type,
                                  size: att.size,
                                })
                              }
                              className="p-1.5 rounded-lg text-[#71717A] hover:text-red-600 hover:bg-black/[0.05] transition-colors"
                              title="View Document (Read-Only)"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <a
                              href={fileUrl}
                              download={att.name}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg text-[#71717A] hover:text-[#111827] hover:bg-black/[0.05] transition-colors"
                              title="Download File"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}


                {/* Reaction Badges List */}
                {Object.keys(reactions).length > 0 && (
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    {Object.entries(reactions).map(([emoji, count]) => (
                      <button
                        key={emoji}
                        onClick={() => handleAddReaction(msg.id, emoji)}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-[var(--border-subtle)] shadow-sm hover:border-red-400 hover:scale-105 transition-all cursor-pointer"
                      >
                        <GraphicalReaction name={emoji} size="xs" />
                        <span className="text-[11px] font-mono text-[#71717A] font-bold">{count}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Slack-style Thread Footer Button */}
                {msg.threadMeta && msg.threadMeta.replyCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveThreadRoot(msg)}
                    className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--bg-surface-2)] hover:bg-[var(--bg-surface-1)] border border-[var(--border-subtle)] hover:border-red-400 transition-all text-xs group/thread shadow-sm cursor-pointer"
                  >
                    {msg.threadMeta.participantAvatars && msg.threadMeta.participantAvatars.length > 0 && (
                      <div className="flex items-center -space-x-1.5 overflow-hidden">
                        {msg.threadMeta.participantAvatars.slice(0, 3).map((av, avIdx) => (
                          <Avatar
                            key={avIdx}
                            src={av || undefined}
                            fallbackText="U"
                            className="w-4 h-4 rounded-md ring-1 ring-white dark:ring-black"
                          />
                        ))}
                      </div>
                    )}
                    <span className="font-bold text-red-600 dark:text-red-400 group-hover/thread:underline">
                      {msg.threadMeta.replyCount} {msg.threadMeta.replyCount === 1 ? 'reply' : 'replies'}
                    </span>
                    {msg.threadMeta.lastReplyAt && (
                      <span className="text-[10px] text-[var(--text-muted)] font-mono">
                        Last reply{' '}
                        {new Date(msg.threadMeta.lastReplyAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    )}
                    <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover/thread:translate-x-0.5 transition-transform" />
                  </button>
                )}
              </div>
            </div>
          );
        })}

        <div ref={scrollBottomRef} className="h-4 flex-shrink-0" />
      </div>

      {/* Typing Indicator Bar */}
      {typingNames.length > 0 && (
        <div className="px-4 py-1 flex items-center gap-2 text-[11px] text-red-600 bg-[var(--bg-surface-0)] border-t border-[var(--border-subtle)] flex-shrink-0 animate-fade-in font-medium">
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-bounce" />
            <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-bounce [animation-delay:0.2s]" />
            <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-bounce [animation-delay:0.4s]" />
          </div>
          <span>
            {typingNames.length === 1
              ? `${typingNames[0]} is typing...`
              : `${typingNames.slice(0, 2).join(', ')} and others are typing...`}
          </span>
        </div>
      )}

      {/* Message Composer Input */}
      <MessageComposer
        roomId={room.id}
        roomName={room.name}
        onMessageSent={handleMessageSent}
        replyingTo={replyingTo}
        onCancelReply={() => setReplyingTo(null)}
      />

      {/* Universal Read-Only File Viewer Modal */}
      <UniversalFileViewerModal
        file={activeViewerFile}
        isOpen={!!activeViewerFile}
        onClose={() => setActiveViewerFile(null)}
      />
      </div>

      {/* Slack-style Thread Sidebar Drawer */}
      {activeThreadRoot && (
        <ThreadSidebar
          roomId={room.id}
          roomName={room.name}
          rootMessage={activeThreadRoot}
          onClose={() => setActiveThreadRoot(null)}
          onScrollToMessage={handleJumpToMessage}
          onReplyAdded={(reply) => {
            if (reply.isThreadBroadcast) {
              setMessages((prev) => (prev.some((m) => m.id === reply.id) ? prev : [...prev, reply as MessageDTO]));
            }
          }}
        />
      )}
    </div>
  );
};
