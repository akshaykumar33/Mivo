'use client';

import * as React from 'react';
import { Send, Smile, Paperclip } from 'lucide-react';
import { api } from '@/lib/api-client';
import { MessageDTO } from '@mivo/shared';

export interface MessageComposerProps {
  roomId: string;
  roomName: string;
  onMessageSent?: (msg: MessageDTO) => void;
}

export const MessageComposer: React.FC<MessageComposerProps> = ({
  roomId,
  roomName,
  onMessageSent,
}) => {
  const [content, setContent] = React.useState('');
  const [isSending, setIsSending] = React.useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const handleSend = async () => {
    const text = content.trim();
    if (!text || isSending) return;

    setIsSending(true);
    setContent('');

    try {
      const res = await api.post<MessageDTO>(`/api/v1/rooms/${roomId}/messages`, {
        content: text,
      });

      if (res.success && res.data) {
        onMessageSent?.(res.data);
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setIsSending(false);
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="p-3 sm:p-4 pb-20 sm:pb-24 bg-[#080A12]/90 border-t border-white/[0.07] backdrop-blur-2xl select-none z-10">
      <div className="flex items-center gap-2 px-4 py-2 rounded-[18px] bg-white/[0.03] border border-white/[0.08] focus-within:border-[#5E5CE6] focus-within:ring-2 focus-within:ring-[#5E5CE6]/20 transition-all shadow-inner">
        <button
          type="button"
          className="p-1.5 rounded-[10px] text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
          title="Add Attachment"
        >
          <Paperclip className="w-4 h-4" />
        </button>

        <textarea
          ref={textareaRef}
          rows={1}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Message #${roomName}... (Press Enter to send)`}
          className="flex-1 bg-transparent text-xs sm:text-sm text-white placeholder-white/40 focus:outline-none resize-none max-h-32 min-h-[24px] leading-relaxed"
        />

        <button
          type="button"
          className="p-1.5 rounded-[10px] text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
          title="Insert Emoji"
        >
          <Smile className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={handleSend}
          disabled={!content.trim() || isSending}
          className={`p-2 rounded-[12px] transition-all duration-200 cursor-pointer ${
            content.trim() && !isSending
              ? 'bg-gradient-to-tr from-[#5E5CE6] to-[#0A84FF] hover:scale-105 text-white shadow-md shadow-[#5E5CE6]/30'
              : 'bg-white/[0.04] text-white/20 cursor-not-allowed'
          }`}
          title="Send Message"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
