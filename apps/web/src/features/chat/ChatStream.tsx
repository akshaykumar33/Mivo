'use client';

import * as React from 'react';
import { MessageDTO, RoomDTO } from '@mivo/shared';
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
} from 'lucide-react';
import { translationManager, SUPPORTED_LANGUAGES } from '@/lib/translation-manager';

import { LanguageSelectorPopover } from './LanguageSelectorPopover';

export interface ChatStreamProps {
  room: RoomDTO;
}

export const ChatStream: React.FC<ChatStreamProps> = ({ room }) => {
  const [messages, setMessages] = React.useState<MessageDTO[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [chatTargetLang, setChatTargetLang] = React.useState('es');
  const [translatedMessages, setTranslatedMessages] = React.useState<Record<string, string>>({});
  const [messageReactions, setMessageReactions] = React.useState<Record<string, Record<string, number>>>({});
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

  // 2. Real-time message subscription
  React.useEffect(() => {
    const handleNewMessage = (newMsg: MessageDTO) => {
      if (newMsg.roomId === room.id) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
      }
    };

    realtime.on('chat:new_message', handleNewMessage);

    return () => {
      realtime.off('chat:new_message', handleNewMessage);
    };
  }, [room.id]);

  // 3. Auto-scroll on new messages
  React.useEffect(() => {
    scrollBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
      const msgReactions = prev[msgId] || {};
      const currentCount = msgReactions[emoji] || 0;
      return {
        ...prev,
        [msgId]: {
          ...msgReactions,
          [emoji]: currentCount + 1,
        },
      };
    });
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[var(--bg-canvas)]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#5E5CE6] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-[var(--text-muted)] font-semibold font-display">Loading message stream...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--bg-canvas)] overflow-hidden">
      {/* Apple Translucent Chat Header Bar */}
      <div className="h-11 px-6 bg-[var(--bg-surface-0)] border-b border-[var(--border-subtle)] backdrop-blur-xl flex items-center justify-between text-xs select-none">
        <div className="flex items-center gap-2 text-[var(--text-secondary)]">
          <Globe className="w-3.5 h-3.5 text-[#5E5CE6]" />
          <span className="font-semibold text-[11px]">Instant Message Translation:</span>
        </div>
        <LanguageSelectorPopover
          value={chatTargetLang}
          onChange={(code) => setChatTargetLang(code)}
          label="Select Target Language"
        />
      </div>

      {/* Scrollable Message List */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-2.5 sm:space-y-3 scrollbar-thin">
        {/* Welcome Hero at top of stream */}
        <div className="pt-4 sm:pt-6 pb-4 sm:pb-6 mb-3 sm:mb-4 border-b border-white/[0.06] text-left">
          <div className="w-12 sm:w-14 h-12 sm:h-14 rounded-[20px] bg-gradient-to-tr from-[#5E5CE6]/20 to-[#0A84FF]/20 border border-[#5E5CE6]/30 flex items-center justify-center text-[#5E5CE6] mb-3 shadow-[0_8px_24px_rgba(94,92,230,0.2)]">
            <Hash className="w-6 sm:w-7 h-6 sm:h-7 stroke-[2.5]" />
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-white font-display tracking-tight">
            Welcome to #{room.name}!
          </h3>
          <p className="text-xs text-white/50 mt-1 max-w-xl leading-relaxed">
            This is the start of the <span className="font-semibold text-[#64D2FF]">#{room.name}</span> unified stage. Send messages, collaborate with instant AI translation, or hop onto Voice and Video in 1-click.
          </p>
        </div>

        {/* Message Items */}
        {messages.map((msg) => {
          const timestamp = new Date(msg.createdAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          });
          const translatedText = translatedMessages[msg.id];
          const reactions = messageReactions[msg.id] || {};

          return (
            <div
              key={msg.id}
              className="flex items-start gap-2.5 sm:gap-3 group hover:bg-white/[0.03] p-2 sm:p-3 -mx-2 sm:-mx-3 rounded-[18px] transition-all duration-150 relative"
            >
              <Avatar
                size="md"
                src={msg.sender?.avatarUrl}
                fallbackText={msg.sender?.displayName || msg.sender?.username}
                status={msg.sender?.status || 'ONLINE'}
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1 gap-2">
                  <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                    <span className="text-xs font-bold text-white hover:underline cursor-pointer truncate">
                      {msg.sender?.displayName || msg.sender?.username}
                    </span>
                    <span className="text-[10px] text-white/40 font-mono flex-shrink-0">{timestamp}</span>
                    <span title="Delivered & Read" className="flex-shrink-0">
                      <CheckCheck className="w-3.5 h-3.5 text-[#0A84FF]" />
                    </span>
                  </div>

                  {/* Telegram / Slack Style Quick Hover/Touch Action Bar */}
                  <div className="flex items-center gap-0.5 sm:gap-1 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity bg-[#0F1220]/95 px-1.5 sm:px-2 py-0.5 rounded-[12px] border border-white/[0.12] shadow-lg backdrop-blur-xl flex-shrink-0">
                    <button
                      onClick={() => handleAddReaction(msg.id, '❤️')}
                      className="p-1 hover:scale-125 transition-transform text-xs"
                      title="Heart"
                    >
                      ❤️
                    </button>
                    <button
                      onClick={() => handleAddReaction(msg.id, '👍')}
                      className="p-1 hover:scale-125 transition-transform text-xs"
                      title="Thumbs Up"
                    >
                      👍
                    </button>
                    <button
                      onClick={() => handleAddReaction(msg.id, '🔥')}
                      className="p-1 hover:scale-125 transition-transform text-xs"
                      title="Fire"
                    >
                      🔥
                    </button>
                    <button
                      onClick={() => handleAddReaction(msg.id, '🎉')}
                      className="p-1 hover:scale-125 transition-transform text-xs"
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
                <div className="text-sm text-white/90 leading-relaxed break-words select-text font-normal">
                  {msg.content}
                </div>

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

      {/* Message Composer Input */}
      <MessageComposer
        roomId={room.id}
        roomName={room.name}
        onMessageSent={handleMessageSent}
      />
    </div>
  );
};
