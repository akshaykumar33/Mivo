'use client';

import * as React from 'react';
import { Send, Smile, Paperclip, X, FileText, FilePlus, Image as ImageIcon, Loader2, Video, Sparkles, Eye } from 'lucide-react';
import { api } from '@/lib/api-client';
import { realtime } from '@/lib/socket-client';
import { storageClient } from '@/lib/storage-client';
import { MessageDTO, AttachmentMetaDTO } from '@mivo/shared';
import { GoogleMeetIcon, MicrosoftTeamsIcon } from '../meetings/ExternalMeetingIcons';
import { ExternalMeetingHubModal } from '../meetings/ExternalMeetingHubModal';
import { UniversalFileViewerModal, FileViewerItem } from '@/features/files';

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
  const [stagedAttachments, setStagedAttachments] = React.useState<AttachmentMetaDTO[]>([]);
  const [previewFile, setPreviewFile] = React.useState<FileViewerItem | null>(null);
  const [isSending, setIsSending] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = React.useState(false);
  const [isMeetingMenuOpen, setIsMeetingMenuOpen] = React.useState(false);
  const [isMeetingModalOpen, setIsMeetingModalOpen] = React.useState(false);
  const [isCreatingQuickMeeting, setIsCreatingQuickMeeting] = React.useState(false);
  const [isDragging, setIsDragging] = React.useState(false);

  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const emojiPickerRef = React.useRef<HTMLDivElement>(null);
  const meetingMenuRef = React.useRef<HTMLDivElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const docInputRef = React.useRef<HTMLInputElement>(null);
  const typingTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Click outside to close emoji picker or meeting menu
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setIsEmojiPickerOpen(false);
      }
      if (meetingMenuRef.current && !meetingMenuRef.current.contains(e.target as Node)) {
        setIsMeetingMenuOpen(false);
      }
    };
    if (isEmojiPickerOpen || isMeetingMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isEmojiPickerOpen, isMeetingMenuOpen]);

  const handleQuickMeeting = async (provider: 'GOOGLE_MEET' | 'MS_TEAMS') => {
    setIsMeetingMenuOpen(false);
    setIsCreatingQuickMeeting(true);
    try {
      await api.post('/api/v1/meetings/generate', {
        provider,
        title: `${roomName} Sync`,
        roomId,
        shareToChat: true,
        bridgeToRoom: false,
      });
    } catch (err) {
      console.error('Failed to generate quick meeting:', err);
    } finally {
      setIsCreatingQuickMeeting(false);
    }
  };

  // Emit typing indicator
  const handleTyping = () => {
    realtime.emit('chat:typing', { roomId });
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      realtime.emit('chat:stop_typing', { roomId });
    }, 2500);
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);

    try {
      const uploadPromises = Array.from(files).map((file) =>
        storageClient.uploadFile(file, 'attachments')
      );
      const results = await Promise.all(uploadPromises);
      setStagedAttachments((prev) => [...prev, ...results]);
    } catch (err: any) {
      console.error('File upload failed:', err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveAttachment = (indexToRemove: number) => {
    setStagedAttachments((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSend = async () => {
    const text = content.trim();
    if ((!text && stagedAttachments.length === 0) || isSending || isUploading) return;

    setIsSending(true);
    const textToSend = text || (stagedAttachments.length > 0 ? 'Sent attachments' : '');
    const attachmentsToSend = [...stagedAttachments];

    setContent('');
    setStagedAttachments([]);
    setIsEmojiPickerOpen(false);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    realtime.emit('chat:stop_typing', { roomId });

    try {
      const res = await api.post<MessageDTO>(`/api/v1/rooms/${roomId}/messages`, {
        content: textToSend,
        attachments: attachmentsToSend.length > 0 ? attachmentsToSend : undefined,
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
    handleTyping();
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`p-2 sm:p-4 pb-20 sm:pb-24 bg-[var(--bg-surface-0)] border-t border-[var(--border-subtle)] backdrop-blur-2xl select-none z-10 relative transition-colors ${
        isDragging ? 'bg-[#5E5CE6]/10 border-[#5E5CE6]' : ''
      }`}
    >
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => handleFileUpload(e.target.files)}
        multiple
        className="hidden"
      />

      {/* Interactive Emoji Picker Popover */}
      {isEmojiPickerOpen && (
        <div
          ref={emojiPickerRef}
          className="absolute bottom-20 sm:bottom-24 right-2 sm:right-6 p-3 rounded-2xl bg-[var(--bg-surface-1)] border border-[var(--border-subtle)] backdrop-blur-3xl shadow-[0_16px_40px_rgba(0,0,0,0.85)] z-50 animate-slide-up w-64 max-w-[90vw] ring-1 ring-white/[0.08]"
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

      <div className="max-w-5xl mx-auto space-y-2">
        {/* Staged Attachments Preview Bar */}
        {(stagedAttachments.length > 0 || isUploading) && (
          <div className="flex items-center gap-2 overflow-x-auto py-1 px-1">
            {stagedAttachments.map((att, idx) => {
              const isImg = storageClient.isImage(att.type);
              return (
                <div
                  key={`${att.url}-${idx}`}
                  className="flex items-center gap-2 p-1.5 pr-2.5 rounded-xl bg-[var(--bg-surface-2)] border border-[var(--border-subtle)] text-xs shadow-sm flex-shrink-0 animate-fade-in group relative"
                >
                  {isImg ? (
                    <div className="w-8 h-8 rounded-lg overflow-hidden bg-black/40 flex-shrink-0">
                      <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-[#5E5CE6]/20 flex items-center justify-center text-[#64D2FF] flex-shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                  )}

                  <div className="max-w-[140px] truncate text-[11px] leading-tight">
                    <p className="font-semibold text-[var(--text-primary)] truncate">{att.name}</p>
                    <p className="text-[10px] text-[var(--text-muted)]">{storageClient.formatBytes(att.size)}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setPreviewFile({
                        name: att.name,
                        url: att.url,
                        type: att.type,
                        size: att.size,
                      })
                    }
                    className="p-1 rounded-md text-[var(--text-muted)] hover:text-white hover:bg-white/10 transition-colors ml-1"
                    title="Preview attachment (Read-Only)"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRemoveAttachment(idx)}
                    className="p-1 rounded-md text-[var(--text-muted)] hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    title="Remove attachment"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}

            {isUploading && (
              <div className="flex items-center gap-2 p-2 rounded-xl bg-[#5E5CE6]/15 border border-[#5E5CE6]/30 text-xs text-[#64D2FF] flex-shrink-0 animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Uploading to Storage...</span>
              </div>
            )}
          </div>
        )}

        {/* Apple Luxury Frosted Glass Input Chassis */}
        <div className="relative flex items-center gap-2 p-1.5 rounded-[18px] bg-[var(--bg-surface-1)] border border-[var(--border-subtle)] focus-within:border-[#5E5CE6] focus-within:bg-[var(--bg-surface-2)] transition-all duration-200 shadow-sm">
          {/* Hidden Document Upload Input */}
          <input
            ref={docInputRef}
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt,.md,.json,.zip,.tar,.gz,.rar,.7z"
            className="hidden"
            onChange={(e) => handleFileUpload(e.target.files)}
          />

          {/* Action Tools Left */}
          <button
            type="button"
            onClick={() => docInputRef.current?.click()}
            disabled={isUploading}
            className="p-2 rounded-xl text-[var(--text-muted)] hover:text-violet-400 hover:bg-white/[0.08] transition-colors cursor-pointer disabled:opacity-50"
            title="Send Document (PDF, Word, Excel, Zip...)"
          >
            <FilePlus className="w-4 h-4 stroke-[2.2]" />
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/[0.08] transition-colors cursor-pointer disabled:opacity-50"
            title="Attach Media / Images"
          >
            <Paperclip className="w-4 h-4 stroke-[2.2]" />
          </button>

          {/* External Meeting Button & Popover */}
          <div className="relative" ref={meetingMenuRef}>
            <button
              type="button"
              onClick={() => setIsMeetingMenuOpen(!isMeetingMenuOpen)}
              disabled={isCreatingQuickMeeting}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                isMeetingMenuOpen
                  ? 'text-white bg-[#5E5CE6] shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[#64D2FF] hover:bg-white/[0.08]'
              }`}
              title="Google Meet & Microsoft Teams"
            >
              {isCreatingQuickMeeting ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#64D2FF]" />
              ) : (
                <Video className="w-4 h-4 stroke-[2.2]" />
              )}
            </button>

            {isMeetingMenuOpen && (
              <div className="absolute bottom-full left-0 mb-2 w-64 p-2 rounded-2xl bg-[#0F1220]/95 border border-white/[0.12] shadow-2xl backdrop-blur-xl z-50 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-2 py-1.5 text-[10px] font-bold text-white/40 uppercase tracking-wider">
                  External Meeting Hub
                </div>

                <button
                  type="button"
                  onClick={() => handleQuickMeeting('GOOGLE_MEET')}
                  className="w-full p-2 rounded-xl hover:bg-[#00AC47]/15 text-left flex items-center gap-2.5 transition-colors cursor-pointer group"
                >
                  <div className="w-7 h-7 rounded-lg bg-[#00AC47]/20 flex items-center justify-center p-1.5 flex-shrink-0">
                    <GoogleMeetIcon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white group-hover:text-[#34D399]">Google Meet</div>
                    <div className="text-[10px] text-white/40">1-click create & share</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickMeeting('MS_TEAMS')}
                  className="w-full p-2 rounded-xl hover:bg-[#505AC9]/20 text-left flex items-center gap-2.5 transition-colors cursor-pointer group"
                >
                  <div className="w-7 h-7 rounded-lg bg-[#505AC9]/25 flex items-center justify-center p-1.5 flex-shrink-0">
                    <MicrosoftTeamsIcon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white group-hover:text-[#A5B4FC]">Microsoft Teams</div>
                    <div className="text-[10px] text-white/40">1-click create & share</div>
                  </div>
                </button>

                <div className="pt-1 mt-1 border-t border-white/[0.08]">
                  <button
                    type="button"
                    onClick={() => {
                      setIsMeetingMenuOpen(false);
                      setIsMeetingModalOpen(true);
                    }}
                    className="w-full p-2 rounded-xl hover:bg-white/[0.08] text-left flex items-center gap-2 text-xs font-semibold text-[#64D2FF] transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Meeting Hub & Bridge...</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Expandable Textarea */}
          <textarea
            ref={textareaRef}
            rows={1}
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              handleTyping();
            }}
            onKeyDown={handleKeyDown}
            placeholder={
              isDragging
                ? 'Drop files to upload to Supabase Storage...'
                : `Message #${roomName}... (Press Enter to send)`
            }
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
            disabled={(!content.trim() && stagedAttachments.length === 0) || isSending || isUploading}
            className={`p-2 rounded-[12px] transition-all duration-200 cursor-pointer ${
              (content.trim() || stagedAttachments.length > 0) && !isSending && !isUploading
                ? 'bg-gradient-to-tr from-[#5E5CE6] to-[#0A84FF] hover:scale-105 text-white shadow-md shadow-[#5E5CE6]/30'
                : 'bg-white/[0.04] text-white/20 cursor-not-allowed'
            }`}
            title="Send Message"
          >
            {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <ExternalMeetingHubModal
        isOpen={isMeetingModalOpen}
        onClose={() => setIsMeetingModalOpen(false)}
        roomId={roomId}
        roomName={roomName}
      />

      {/* Universal Read-Only File Viewer Modal */}
      <UniversalFileViewerModal
        file={previewFile}
        isOpen={!!previewFile}
        onClose={() => setPreviewFile(null)}
      />
    </div>
  );
};
