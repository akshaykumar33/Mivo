'use client';

import * as React from 'react';
import { MessageDTO, RoomDTO } from '@mivo/shared';
import { api } from '@/lib/api-client';
import { realtime } from '@/lib/socket-client';
import { Avatar, Badge } from '@mivo/ui';
import { MessageComposer } from './MessageComposer';
import { MessageSquare, Sparkles, Hash } from 'lucide-react';

export interface ChatStreamProps {
  room: RoomDTO;
}

export const ChatStream: React.FC<ChatStreamProps> = ({ room }) => {
  const [messages, setMessages] = React.useState<MessageDTO[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
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
      {/* Scrollable Message List */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* Welcome Hero at top of stream */}
        <div className="pt-10 pb-6 mb-6 border-b border-white/[0.06] text-left">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-violet-600/20 to-indigo-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400 mb-4 shadow-xl shadow-violet-600/10">
            <Hash className="w-8 h-8" />
          </div>
          <h3 className="text-2xl font-extrabold text-white font-display tracking-tight">
            Welcome to #{room.name}!
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-xl leading-relaxed">
            This is the start of the <span className="font-bold text-violet-300">#{room.name}</span> unified communication room. Send messages, collaborate, or switch to Voice, Video, and Screen Share at any moment.
          </p>
        </div>

        {/* Message Items */}
        {messages.map((msg) => {
          const timestamp = new Date(msg.createdAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          });

          return (
            <div
              key={msg.id}
              className="flex items-start gap-3.5 group hover:bg-white/[0.02] p-3 -mx-3 rounded-2xl transition-all duration-150"
            >
              <Avatar
                size="md"
                src={msg.sender?.avatarUrl}
                fallbackText={msg.sender?.displayName || msg.sender?.username}
                status={msg.sender?.status || 'ONLINE'}
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-white hover:underline cursor-pointer">
                    {msg.sender?.displayName || msg.sender?.username}
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium">{timestamp}</span>
                </div>

                <div className="text-sm text-slate-200 leading-relaxed break-words select-text font-normal">
                  {msg.content}
                </div>
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
