'use client';

import * as React from 'react';
import { MessageDTO, RoomDTO } from '@mivo/shared';
import { api } from '@/lib/api-client';
import { realtime } from '@/lib/socket-client';
import { Avatar, Badge } from '@mivo/ui';
import { MessageComposer } from './MessageComposer';
import { MessageSquare, Sparkles } from 'lucide-react';

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
      <div className="flex-1 flex items-center justify-center bg-[#1A2232]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-violet-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-slate-400 font-medium font-display">Loading message stream...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#1A2232] overflow-hidden">
      {/* Scrollable Message List */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {/* Welcome Header at top of stream */}
        <div className="pt-8 pb-4 mb-4 border-b border-slate-800/80 text-left">
          <div className="w-14 h-14 rounded-2xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400 mb-3 shadow-lg shadow-violet-600/10">
            <MessageSquare className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-bold text-white font-display">Welcome to #{room.name}!</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-lg">
            This is the start of the <span className="font-semibold text-violet-300">#{room.name}</span> unified communication room. Send messages, share ideas, or switch modes to voice or video at any time.
          </p>
        </div>

        {/* Message Items */}
        {messages.map((msg) => {
          const timestamp = new Date(msg.createdAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          });

          return (
            <div key={msg.id} className="flex items-start gap-3.5 group hover:bg-slate-800/20 p-2 -mx-2 rounded-xl transition-colors">
              <Avatar
                size="md"
                src={msg.sender?.avatarUrl}
                fallbackText={msg.sender?.displayName || msg.sender?.username}
                status={msg.sender?.status || 'ONLINE'}
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-slate-100 hover:underline cursor-pointer">
                    {msg.sender?.displayName || msg.sender?.username}
                  </span>
                  <span className="text-[10px] text-slate-500">{timestamp}</span>
                </div>

                <div className="text-sm text-slate-200 leading-relaxed break-words select-text">
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
