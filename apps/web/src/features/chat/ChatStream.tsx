'use client';

import * as React from 'react';
import { MessageDTO, RoomDTO } from '@mivo/shared';
import { api } from '@/lib/api-client';
import { realtime } from '@/lib/socket-client';
import { Avatar, Badge } from '@mivo/ui';
import { MessageComposer } from './MessageComposer';
import { MessageSquare, Sparkles, Hash, Languages, Volume2, Globe } from 'lucide-react';
import { translationManager, SUPPORTED_LANGUAGES } from '@/lib/translation-manager';

export interface ChatStreamProps {
  room: RoomDTO;
}

export const ChatStream: React.FC<ChatStreamProps> = ({ room }) => {
  const [messages, setMessages] = React.useState<MessageDTO[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [chatTargetLang, setChatTargetLang] = React.useState('es');
  const [translatedMessages, setTranslatedMessages] = React.useState<Record<string, string>>({});
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
      // Toggle off
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

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#0E1017]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-violet-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-slate-400 font-semibold font-display">Loading message stream...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0E1017] overflow-hidden">
      {/* Multilingual Chat Header Bar */}
      <div className="h-10 px-6 bg-[#0B0D14] border-b border-white/[0.06] flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-slate-400">
          <Globe className="w-3.5 h-3.5 text-violet-400" />
          <span className="font-semibold text-[11px]">Chat Translation Target:</span>
        </div>
        <select
          value={chatTargetLang}
          onChange={(e) => setChatTargetLang(e.target.value)}
          className="bg-[#0E1017] border border-white/[0.08] rounded-xl px-2 py-0.5 text-xs text-white focus:outline-none focus:border-violet-500 font-semibold"
        >
          {SUPPORTED_LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.flag} {l.name}
            </option>
          ))}
        </select>
      </div>

      {/* Scrollable Message List */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* Welcome Hero at top of stream */}
        <div className="pt-8 pb-6 mb-6 border-b border-white/[0.06] text-left">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-violet-600/20 to-indigo-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400 mb-4 shadow-xl shadow-violet-600/10">
            <Hash className="w-8 h-8" />
          </div>
          <h3 className="text-2xl font-extrabold text-white font-display tracking-tight">
            Welcome to #{room.name}!
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-xl leading-relaxed">
            This is the start of the <span className="font-bold text-violet-300">#{room.name}</span> unified communication room. Send messages, collaborate across languages, or switch to Voice, Video, and Screen Share at any moment.
          </p>
        </div>

        {/* Message Items */}
        {messages.map((msg) => {
          const timestamp = new Date(msg.createdAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          });
          const translatedText = translatedMessages[msg.id];

          return (
            <div
              key={msg.id}
              className="flex items-start gap-3.5 group hover:bg-white/[0.02] p-3 -mx-3 rounded-2xl transition-all duration-150 relative"
            >
              <Avatar
                size="md"
                src={msg.sender?.avatarUrl}
                fallbackText={msg.sender?.displayName || msg.sender?.username}
                status={msg.sender?.status || 'ONLINE'}
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white hover:underline cursor-pointer">
                      {msg.sender?.displayName || msg.sender?.username}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">{timestamp}</span>
                  </div>

                  {/* Hover Quick Translation & Audio Buttons */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleTranslateMessage(msg.id, msg.content)}
                      className={`p-1 rounded-lg border text-[10px] font-bold flex items-center gap-1 transition-colors ${
                        translatedText
                          ? 'bg-violet-600 text-white border-violet-400'
                          : 'bg-[#090B10] border-white/[0.08] text-slate-300 hover:text-white hover:bg-white/[0.08]'
                      }`}
                      title="Translate message"
                    >
                      <Languages className="w-3 h-3" />
                      <span>{translatedText ? 'Hide' : 'Translate'}</span>
                    </button>
                    {translatedText && (
                      <button
                        onClick={() => translationManager.speakText(translatedText, chatTargetLang)}
                        className="p-1 rounded-lg bg-[#090B10] border border-white/[0.08] text-slate-300 hover:text-cyan-400 transition-colors"
                        title="Listen to audio translation (TTS)"
                      >
                        <Volume2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Original Message Text */}
                <div className="text-sm text-slate-200 leading-relaxed break-words select-text font-normal">
                  {msg.content}
                </div>

                {/* Translated Text Sub-Card */}
                {translatedText && (
                  <div className="mt-2 p-2.5 rounded-xl bg-violet-950/40 border border-violet-500/30 text-xs text-cyan-200 italic font-semibold flex items-center justify-between gap-2 shadow-md">
                    <span>{translatedText}</span>
                    <button
                      onClick={() => translationManager.speakText(translatedText, chatTargetLang)}
                      className="p-1 rounded-md text-slate-400 hover:text-cyan-400 hover:bg-white/[0.06] flex-shrink-0"
                      title="Play Translated Speech"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
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
