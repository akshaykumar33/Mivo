'use client';

import * as React from 'react';
import { MessageDTO, RoomDTO, AttachmentMetaDTO, REALTIME_EVENTS } from '@mivo/shared';
import { api } from '@/lib/api-client';
import { realtime } from '@/lib/socket-client';
import { Avatar, Badge } from '@mivo/ui';
import { MessageComposer } from './MessageComposer';
import {
  MessageSquare,
  Sparkles,
  Hash,
  Languages,
  Volume2,
  Globe,
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
} from 'lucide-react';
import { translationManager } from '@/lib/translation-manager';
import { storageClient } from '@/lib/storage-client';
import { LanguageSelectorPopover } from './LanguageSelectorPopover';
import { ExternalMeetingCard } from '@/features/meetings/ExternalMeetingCard';

export interface ChatStreamProps {
  room: RoomDTO;
}

export const ChatStream: React.FC<ChatStreamProps> = ({ room }) => {
  const [messages, setMessages] = React.useState<MessageDTO[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [chatTargetLang, setChatTargetLang] = React.useState('es');
  const [translatedMessages, setTranslatedMessages] = React.useState<Record<string, string>>({});
  const [messageReactions, setMessageReactions] = React.useState<Record<string, Record<string, number>>>({});
  const [typingUsers, setTypingUsers] = React.useState<Record<string, string>>({});
  const [previewImage, setPreviewImage] = React.useState<string | null>(null);
  const scrollBottomRef = React.useRef<HTMLDivElement>(null);

  // 1. Fetch historical messages for the room
  React.useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    api.get<MessageDTO[]>(`/api/v1/rooms/${room.id}/messages`).then((res) => {
      if (isMounted && res.success && res.data) {
        setMessages(res.data);
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

    realtime.on(REALTIME_EVENTS.CHAT_NEW_MESSAGE, handleNewMessage);
    realtime.on(REALTIME_EVENTS.CHAT_TYPING, handleTyping);
    realtime.on(REALTIME_EVENTS.CHAT_STOP_TYPING, handleStopTyping);
    realtime.on(REALTIME_EVENTS.CHAT_REACTION_ADDED, handleReactionAdded);

    return () => {
      realtime.off(REALTIME_EVENTS.CHAT_NEW_MESSAGE, handleNewMessage);
      realtime.off(REALTIME_EVENTS.CHAT_TYPING, handleTyping);
      realtime.off(REALTIME_EVENTS.CHAT_STOP_TYPING, handleStopTyping);
      realtime.off(REALTIME_EVENTS.CHAT_REACTION_ADDED, handleReactionAdded);
    };
  }, [room.id]);

  // 3. Auto-scroll on new messages
  React.useEffect(() => {
    scrollBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  const handleMessageSent = (sentMsg: MessageDTO) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === sentMsg.id)) return prev;
      return [...prev, sentMsg];
    });
  };

  const handleTranslateMessage = async (msgId: string, content: string) => {
    if (translatedMessages[msgId]) {
      setTranslatedMessages((prev) => {
        const copy = { ...prev };
        delete copy[msgId];
        return copy;
      });
    } else {
      const translated = await translationManager.translateText(content, chatTargetLang);
      setTranslatedMessages((prev) => ({ ...prev, [msgId]: translated }));
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
    <div className="flex-1 flex flex-col h-full bg-[var(--bg-canvas)] relative overflow-hidden select-none">
      {/* Lightbox Modal for Attachment Images */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out animate-fade-in"
        >
          <div className="relative max-w-4xl max-h-[85vh] rounded-2xl overflow-hidden ring-1 ring-white/20 shadow-2xl">
            <img src={previewImage} alt="Attachment Full View" className="w-full h-full object-contain" />
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-3 right-3 p-2 rounded-full bg-black/60 text-white hover:bg-black/90 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Modern Room Header */}
      <div className="h-12 border-b border-[var(--border-subtle)] px-3 sm:px-6 flex items-center justify-between bg-[var(--bg-surface-0)] backdrop-blur-xl z-20 flex-shrink-0">
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-[#5E5CE6]/15 border border-[#5E5CE6]/30 flex items-center justify-center text-[#64D2FF] flex-shrink-0">
            <Hash className="w-3.5 h-3.5 stroke-[2.5]" />
          </div>
          <span className="font-bold text-xs sm:text-sm text-[var(--text-primary)] font-display tracking-tight truncate">
            {room.name}
          </span>
          {room.description && (
            <span className="text-[11px] text-[var(--text-muted)] truncate max-w-[120px] sm:max-w-xs hidden sm:inline">
              — {room.description}
            </span>
          )}
        </div>

        {/* Global Translation Language Selector */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          <LanguageSelectorPopover
            value={chatTargetLang}
            onChange={setChatTargetLang}
          />
        </div>
      </div>

      {/* Message History Scroller */}
      <div className="flex-1 overflow-y-auto px-2 sm:px-6 py-4 space-y-3 sm:space-y-4 custom-scrollbar">
        {isLoading && (
          <div className="flex flex-col items-center justify-center h-48 space-y-3 text-[var(--text-muted)]">
            <div className="w-6 h-6 border-2 border-[#5E5CE6] border-t-transparent rounded-full animate-spin" />
            <p className="text-xs">Loading secure message history...</p>
          </div>
        )}

        {!isLoading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-center px-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#5E5CE6]/20 to-[#0A84FF]/20 border border-white/[0.08] flex items-center justify-center text-[#64D2FF] mb-3">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-[var(--text-primary)] font-display">Welcome to #{room.name}</h4>
            <p className="text-xs text-[var(--text-muted)] max-w-sm mt-1">
              This is the start of the #{room.name} channel stream. Send messages, drag and drop attachments, or start speaking.
            </p>
          </div>
        )}

        {messages.map((msg) => {
          const timestamp = new Date(msg.createdAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          });
          const translatedText = translatedMessages[msg.id];
          const reactions = messageReactions[msg.id] || {};
          const attachments = (msg.attachments as AttachmentMetaDTO[]) || [];

          return (
            <div
              key={msg.id}
              className="flex items-start gap-2.5 sm:gap-3 group px-2 py-1.5 rounded-2xl hover:bg-white/[0.03] transition-colors"
            >
              <Avatar
                fallbackText={msg.sender?.displayName || msg.sender?.username || 'U'}
                src={msg.sender?.avatarUrl || undefined}
                className="w-8 h-8 rounded-xl ring-1 ring-white/[0.1] flex-shrink-0"
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                    <span className="text-xs font-bold text-white hover:underline cursor-pointer truncate">
                      {msg.sender?.displayName || msg.sender?.username}
                    </span>
                    <span className="text-[10px] text-white/40 font-mono flex-shrink-0">{timestamp}</span>
                    <span title="Delivered & Read" className="flex-shrink-0">
                      <CheckCheck className="w-3.5 h-3.5 text-[#0A84FF]" />
                    </span>
                  </div>

                  {/* Quick Action Bar */}
                  <div className="flex items-center gap-0.5 sm:gap-1 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity bg-[#0F1220]/95 px-1.5 sm:px-2 py-0.5 rounded-[12px] border border-white/[0.12] shadow-lg backdrop-blur-xl flex-shrink-0">
                    <button
                      onClick={() => handleAddReaction(msg.id, '❤️')}
                      className="p-1 hover:scale-125 transition-transform text-xs cursor-pointer"
                      title="Heart"
                    >
                      ❤️
                    </button>
                    <button
                      onClick={() => handleAddReaction(msg.id, '👍')}
                      className="p-1 hover:scale-125 transition-transform text-xs cursor-pointer"
                      title="Thumbs Up"
                    >
                      👍
                    </button>
                    <button
                      onClick={() => handleAddReaction(msg.id, '🔥')}
                      className="p-1 hover:scale-125 transition-transform text-xs cursor-pointer"
                      title="Fire"
                    >
                      🔥
                    </button>
                    <button
                      onClick={() => handleAddReaction(msg.id, '🎉')}
                      className="p-1 hover:scale-125 transition-transform text-xs cursor-pointer"
                      title="Celebrate"
                    >
                      🎉
                    </button>

                    <div className="w-[1px] h-3.5 bg-white/[0.1] mx-0.5" />

                    <button
                      onClick={() => handleTranslateMessage(msg.id, msg.content)}
                      className={`px-2 py-0.5 rounded-[8px] text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                        translatedText
                          ? 'bg-[#5E5CE6] text-white'
                          : 'text-white/60 hover:text-white hover:bg-white/[0.08]'
                      }`}
                      title="Translate message"
                    >
                      <Languages className="w-3 h-3" />
                      <span>{translatedText ? 'Hide' : 'Translate'}</span>
                    </button>

                    {translatedText && (
                      <button
                        onClick={() => translationManager.speakText(translatedText, chatTargetLang)}
                        className="p-1 rounded-md text-white/60 hover:text-[#64D2FF] transition-colors cursor-pointer"
                        title="Listen to audio speech (TTS)"
                      >
                        <Volume2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Original Message Text */}
                {msg.content && msg.content !== 'Sent attachments' && (
                  <div className="text-sm text-white/90 leading-relaxed break-words select-text font-normal">
                    {msg.content}
                  </div>
                )}

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

                      const isImg = storageClient.isImage(att.type);
                      const isVid = storageClient.isVideo(att.type);
                      const isAud = storageClient.isAudio(att.type);

                      if (isImg) {
                        return (
                          <div
                            key={`${att.url}-${attIdx}`}
                            onClick={() => setPreviewImage(att.url)}
                            className="max-w-md max-h-80 rounded-2xl overflow-hidden border border-white/10 hover:border-[#5E5CE6] cursor-zoom-in group/img transition-all bg-black/40 shadow-md"
                          >
                            <img
                              src={att.url}
                              alt={att.name}
                              className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300"
                            />
                          </div>
                        );
                      }

                      if (isVid) {
                        return (
                          <div key={`${att.url}-${attIdx}`} className="max-w-lg rounded-2xl overflow-hidden border border-white/10 bg-black/50 shadow-md">
                            <video controls src={att.url} className="w-full max-h-80" />
                          </div>
                        );
                      }

                      if (isAud) {
                        return (
                          <div key={`${att.url}-${attIdx}`} className="p-2 rounded-xl bg-white/[0.04] border border-white/10 max-w-sm">
                            <audio controls src={att.url} className="w-full h-8" />
                          </div>
                        );
                      }

                      // Generic File Attachment Card
                      return (
                        <a
                          key={`${att.url}-${attIdx}`}
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          download={att.name}
                          className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 max-w-sm transition-all group/file shadow-sm"
                        >
                          <div className="w-10 h-10 rounded-xl bg-[#5E5CE6]/20 border border-[#5E5CE6]/30 flex items-center justify-center text-[#64D2FF] flex-shrink-0 group-hover/file:scale-110 transition-transform">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-white truncate">{att.name}</p>
                            <p className="text-[10px] text-white/50">{storageClient.formatBytes(att.size)}</p>
                          </div>
                          <div className="p-1.5 rounded-lg text-white/40 group-hover/file:text-white group-hover/file:bg-white/10 transition-colors">
                            <Download className="w-4 h-4" />
                          </div>
                        </a>
                      );
                    })}
                  </div>
                )}

                {/* Translated Text Sub-Card with Native Badge */}
                {translatedText && (
                  <div className="mt-2 p-2.5 rounded-[14px] bg-[#5E5CE6]/15 border border-[#5E5CE6]/30 text-xs text-[#64D2FF] font-semibold flex items-center justify-between gap-2 shadow-sm">
                    <span className="leading-relaxed">🌐 {translatedText}</span>
                    <button
                      onClick={() => translationManager.speakText(translatedText, chatTargetLang)}
                      className="p-1 rounded-md text-white/60 hover:text-[#64D2FF] hover:bg-white/[0.08] flex-shrink-0 cursor-pointer"
                      title="Listen to Speech"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Reaction Badges List */}
                {Object.keys(reactions).length > 0 && (
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    {Object.entries(reactions).map(([emoji, count]) => (
                      <button
                        key={emoji}
                        onClick={() => handleAddReaction(msg.id, emoji)}
                        className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-xs transition-all cursor-pointer"
                      >
                        <span>{emoji}</span>
                        <span className="text-[10px] font-mono text-white/60 font-bold">{count}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        <div ref={scrollBottomRef} />
      </div>

      {/* Typing Indicator Bar */}
      {typingNames.length > 0 && (
        <div className="px-4 py-1 flex items-center gap-2 text-[11px] text-[#64D2FF] bg-[var(--bg-surface-0)] border-t border-[var(--border-subtle)] flex-shrink-0 animate-fade-in">
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#64D2FF] animate-bounce" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#64D2FF] animate-bounce [animation-delay:0.2s]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#64D2FF] animate-bounce [animation-delay:0.4s]" />
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
      />
    </div>
  );
};
