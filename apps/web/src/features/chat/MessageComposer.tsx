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
    <div className="p-4 bg-[#121824]/90 border-t border-slate-800/80 backdrop-blur-md">
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-900/80 border border-slate-700/60 focus-within:border-violet-500/60 focus-within:ring-2 focus-within:ring-violet-500/20 transition-all">
        <button
          type="button"
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
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
          className="flex-1 bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none resize-none max-h-32 min-h-[24px] leading-relaxed"
        />

        <button
          type="button"
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
          title="Insert Emoji"
        >
          <Smile className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={handleSend}
          disabled={!content.trim() || isSending}
          className={`p-2 rounded-xl transition-all duration-150 ${
            content.trim() && !isSending
              ? 'bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-600/30'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
          }`}
          title="Send Message"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
