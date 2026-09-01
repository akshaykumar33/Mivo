'use client';

import * as React from 'react';
import { Send, Smile, Paperclip, X } from 'lucide-react';
import { api } from '@/lib/api-client';
import { MessageDTO } from '@mivo/shared';

export interface MessageComposerProps {
  roomId: string;
  roomName: string;
  onMessageSent?: (msg: MessageDTO) => void;
}

const EMOJI_PALETTE = [
  '😀', '😂', '😍', '🥳', '😎', '🤩', '🔥', '🚀',
  '❤️', '👍', '👏', '🙌', '💯', '✨', '💡', '🎯',
  '🦾', '🧠', '☕', '⚡', '🎉', '🤝', '💻', '🌟',
  '🏆', '👀', '🤙', '🫡', '🙏', '🌈', '🍕', '🍻'
];

export const MessageComposer: React.FC<MessageComposerProps> = ({
  roomId,
  roomName,
  onMessageSent,
}) => {
  const [content, setContent] = React.useState('');
  const [isSending, setIsSending] = React.useState(false);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = React.useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const emojiPickerRef = React.useRef<HTMLDivElement>(null);

  // Click outside to close emoji picker
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setIsEmojiPickerOpen(false);
      }
    };
    if (isEmojiPickerOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isEmojiPickerOpen]);

  const handleSend = async () => {
    const text = content.trim();
    if (!text || isSending) return;

    setIsSending(true);
    setContent('');
    setIsEmojiPickerOpen(false);

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

  const handleInsertEmoji = (emoji: string) => {
    setContent((prev) => prev + emoji);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="p-3 sm:p-4 pb-20 sm:pb-24 bg-[var(--bg-surface-0)] border-t border-[var(--border-subtle)] backdrop-blur-2xl select-none z-10 relative">
      {/* Interactive Emoji Picker Popover */}
      {isEmojiPickerOpen && (
        <div
          ref={emojiPickerRef}
          className="absolute bottom-24 right-6 p-3 rounded-2xl bg-[var(--bg-surface-1)] border border-[var(--border-subtle)] backdrop-blur-3xl shadow-[0_16px_40px_rgba(0,0,0,0.85)] z-50 animate-slide-up w-64 ring-1 ring-white/[0.08]"
        >
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[var(--border-subtle)] text-xs font-bold text-[var(--text-primary)] font-display">
            <span>Quick Emojis</span>
            <button
              onClick={() => setIsEmojiPickerOpen(false)}
              className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/[0.08] transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-8 gap-1.5 place-items-center">
            {EMOJI_PALETTE.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => handleInsertEmoji(emoji)}
                className="p-1.5 rounded-lg hover:bg-white/[0.1] hover:scale-125 transition-all text-base cursor-pointer"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto">
        {/* Apple Luxury Frosted Glass Input Chassis */}
        <div className="relative flex items-center gap-2 p-1.5 rounded-[18px] bg-[var(--bg-surface-1)] border border-[var(--border-subtle)] focus-within:border-[#5E5CE6] focus-within:bg-[var(--bg-surface-2)] transition-all duration-200 shadow-sm">
          {/* Action Tools Left */}
          <button
            type="button"
            className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/[0.08] transition-colors cursor-pointer"
            title="Attach file (Drag & Drop supported)"
          >
            <Paperclip className="w-4 h-4 stroke-[2.2]" />
          </button>

          {/* Expandable Textarea */}
          <textarea
            ref={textareaRef}
            rows={1}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message #${roomName}... (Press Enter to send)`}
            className="flex-1 bg-transparent border-0 text-xs sm:text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none resize-none py-1.5 max-h-32 font-medium"
          />

          <button
            type="button"
            onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}
            className={`p-1.5 rounded-[10px] transition-colors cursor-pointer ${
              isEmojiPickerOpen
                ? 'text-[#FFD60A] bg-[#FFD60A]/15 border border-[#FFD60A]/30'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/[0.06]'
            }`}
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
    </div>
  );
};

