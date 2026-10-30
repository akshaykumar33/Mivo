'use client';

import * as React from 'react';
import {
  MessageDTO,
  DirectMessageDTO,
  AttachmentMetaDTO,
  REALTIME_EVENTS,
} from '@mivo/shared';
import { api } from '@/lib/api-client';
import { realtime } from '@/lib/socket-client';
import { useAuthStore } from '@/stores/authStore';
import { usePresenceStore } from '@/stores/presenceStore';
import { Avatar, Badge } from '@mivo/ui';
import {
  X,
  Send,
  CornerUpLeft,
  Paperclip,
  Smile,
  MessageSquareText,
  MessageSquareReply,
  Loader2,
  CheckCheck,
  Eye,
  Download,
  FileText,
  Bot,
  ExternalLink,
} from 'lucide-react';
import { storageClient } from '@/lib/storage-client';
import { GraphicalReaction, GRAPHICAL_REACTIONS } from '@/features/reactions';
import { UniversalFileViewerModal, FileViewerItem, YouTubeEmbedCard, extractYouTubeUrls, resolveStorageUrl } from '@/features/files';

export interface ThreadSidebarProps {
  roomId?: string;
  roomName?: string;
  conversationId?: string;
  conversationTitle?: string;
  rootMessage: MessageDTO | DirectMessageDTO;
  onClose: () => void;
  onScrollToMessage?: (messageId: string) => void;
  onReplyAdded?: (reply: MessageDTO | DirectMessageDTO) => void;
}

export const ThreadSidebar: React.FC<ThreadSidebarProps> = ({
  roomId,
  roomName,
  conversationId,
  conversationTitle,
  rootMessage,
  onClose,
  onScrollToMessage,
  onReplyAdded,
}) => {
  const { user: currentUser, isGuest, setUpgradeModalOpen } = useAuthStore();
  const userStatuses = usePresenceStore((s) => s.userStatuses);

  const [replies, setReplies] = React.useState<(MessageDTO | DirectMessageDTO)[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [content, setContent] = React.useState('');
  const [isSending, setIsSending] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const [stagedAttachments, setStagedAttachments] = React.useState<AttachmentMetaDTO[]>([]);
  const [alsoSendToChannel, setAlsoSendToChannel] = React.useState(false);
  const [replyingToInThread, setReplyingToInThread] = React.useState<
    (MessageDTO | DirectMessageDTO) | null
  >(null);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = React.useState(false);
  const [activeViewerFile, setActiveViewerFile] = React.useState<FileViewerItem | null>(null);

  const threadEndRef = React.useRef<HTMLDivElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const emojiPickerRef = React.useRef<HTMLDivElement>(null);

  // 1. Fetch thread replies
  React.useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    const endpoint = roomId
      ? `/api/v1/rooms/${roomId}/messages/${rootMessage.id}/thread`
      : `/api/v1/conversations/${conversationId}/messages/${rootMessage.id}/thread`;

    api.get<{ rootMessage: any; replies: (MessageDTO | DirectMessageDTO)[] }>(endpoint).then((res) => {
      if (isMounted && res.success && res.data) {
        setReplies(res.data.replies || []);
      }
      if (isMounted) {
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [roomId, conversationId, rootMessage.id]);

  // 2. Real-time subscription to thread replies
  React.useEffect(() => {
    const handleThreadMessage = (data: { roomId?: string; conversationId?: string; threadId: string; message: any }) => {
      if (data.threadId === rootMessage.id) {
        setReplies((prev) => {
          if (prev.some((r) => r.id === data.message.id)) return prev;
          return [...prev, data.message];
        });
        onReplyAdded?.(data.message);
      }
    };

    if (roomId) {
      realtime.on(REALTIME_EVENTS.CHAT_THREAD_NEW_MESSAGE, handleThreadMessage);
    }
    if (conversationId) {
      realtime.on(REALTIME_EVENTS.DM_THREAD_NEW_MESSAGE, handleThreadMessage);
    }

    return () => {
      if (roomId) {
        realtime.off(REALTIME_EVENTS.CHAT_THREAD_NEW_MESSAGE, handleThreadMessage);
      }
      if (conversationId) {
        realtime.off(REALTIME_EVENTS.DM_THREAD_NEW_MESSAGE, handleThreadMessage);
      }
    };
  }, [roomId, conversationId, rootMessage.id, onReplyAdded]);

  // 3. Auto-scroll on new replies
  React.useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [replies]);

  // 4. Click outside to close emoji picker
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

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (isGuest) {
      setUpgradeModalOpen(true);
      return;
    }

    setIsUploading(true);
    try {
      const uploadPromises = Array.from(files).map((file) =>
        storageClient.uploadFile(file, 'attachments')
      );
      const results = await Promise.all(uploadPromises);
      setStagedAttachments((prev) => [...prev, ...results]);
    } catch (err) {
      console.error('File upload failed in thread:', err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSendReply = async () => {
    if (isGuest) {
      setUpgradeModalOpen(true);
      return;
    }

    const text = content.trim();
    if ((!text && stagedAttachments.length === 0) || isSending || isUploading) return;

    setIsSending(true);
    const textToSend = text || (stagedAttachments.length > 0 ? 'Sent attachments' : '');
    const attachmentsToSend = [...stagedAttachments];
    const replyTargetId = replyingToInThread?.id || undefined;

    setContent('');
    setStagedAttachments([]);
    setReplyingToInThread(null);
    setIsEmojiPickerOpen(false);

    try {
      const endpoint = roomId
        ? `/api/v1/rooms/${roomId}/messages`
        : `/api/v1/conversations/${conversationId}/messages`;

      const payload = {
        content: textToSend,
        attachments: attachmentsToSend.length > 0 ? attachmentsToSend : undefined,
        threadId: rootMessage.id,
        replyToId: replyTargetId,
        isThreadBroadcast: alsoSendToChannel,
      };

      const res = await api.post<any>(endpoint, payload);
      if (res.success && res.data) {
        setReplies((prev) => {
          if (prev.some((r) => r.id === res.data.id)) return prev;
          return [...prev, res.data];
        });
        onReplyAdded?.(res.data);
      }
    } catch (err) {
      console.error('Failed to post thread reply:', err);
    } finally {
      setIsSending(false);
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendReply();
    }
  };

  const channelLabel = roomName ? `#${roomName}` : conversationTitle || 'Conversation';

  return (
    <aside className="w-80 md:w-96 lg:w-[420px] shrink-0 border-l border-[var(--border-subtle)] bg-[var(--bg-canvas)] flex flex-col h-full z-20 shadow-2xl relative select-none animate-slide-left">
      {/* Header (Slack Style) */}
      <div className="h-14 px-4 border-b border-[var(--border-subtle)] bg-[var(--bg-surface-0)] flex items-center justify-between shrink-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <MessageSquareReply className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
            <h3 className="text-sm font-bold text-[var(--text-primary)] dark:text-white font-display truncate">
              Thread
            </h3>
          </div>
          <p className="text-[11px] text-[var(--text-muted)] truncate">{channelLabel}</p>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
          title="Close Thread"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable Thread Content */}
      <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-4 custom-scrollbar">
        {/* Parent / Root Message Card */}
        <div className="p-3.5 rounded-2xl bg-[var(--bg-surface-0)] border border-[var(--border-subtle)] shadow-sm">
          <div className="flex items-start gap-2.5">
            <Avatar
              fallbackText={rootMessage.sender?.displayName || rootMessage.sender?.username || 'U'}
              src={rootMessage.sender?.avatarUrl || undefined}
              className="w-8 h-8 rounded-xl ring-1 ring-red-500/20 shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-xs font-bold text-[var(--text-primary)] dark:text-white truncate">
                  {rootMessage.sender?.displayName || rootMessage.sender?.username}
                </span>
                <span className="text-[10px] text-[var(--text-muted)] font-mono shrink-0">
                  {new Date(rootMessage.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>

              {/* Root Content */}
              <div className="text-xs text-[var(--text-primary)] dark:text-gray-100 leading-relaxed break-words select-text">
                {rootMessage.content}
              </div>

              {/* Attachments */}
              {rootMessage.attachments && rootMessage.attachments.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {(rootMessage.attachments as AttachmentMetaDTO[]).map((att, idx) => (
                    <div
                      key={idx}
                      onClick={() =>
                        setActiveViewerFile({
                          name: att.name,
                          url: resolveStorageUrl(att.url),
                          type: att.type,
                          size: att.size,
                        })
                      }
                      className="flex items-center gap-2 p-1.5 rounded-xl bg-black/[0.03] dark:bg-white/[0.05] border border-[var(--border-subtle)] hover:border-red-400 cursor-pointer text-[11px]"
                    >
                      <FileText className="w-3.5 h-3.5 text-red-500 shrink-0" />
                      <span className="truncate flex-1 font-medium">{att.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Slack-style Replies Divider */}
        <div className="flex items-center gap-3 my-2">
          <div className="flex-1 h-px bg-[var(--border-subtle)]" />
          <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider shrink-0 font-mono">
            {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
          </span>
          <div className="flex-1 h-px bg-[var(--border-subtle)]" />
        </div>

        {/* Loading Spinner */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-8 space-y-2 text-[var(--text-muted)]">
            <Loader2 className="w-5 h-5 animate-spin text-red-600" />
            <p className="text-xs">Loading thread replies...</p>
          </div>
        )}

        {/* Empty Thread State */}
        {!isLoading && replies.length === 0 && (
          <div className="py-8 text-center text-[var(--text-muted)] space-y-1">
            <MessageSquareText className="w-8 h-8 mx-auto text-red-500/40 mb-2" />
            <p className="text-xs font-semibold text-[var(--text-primary)] dark:text-white">No replies yet</p>
            <p className="text-[11px]">Start the conversation below.</p>
          </div>
        )}

        {/* Thread Replies List */}
        {replies.map((reply) => {
          const timestamp = new Date(reply.createdAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          });

          return (
            <div
              key={reply.id}
              className="flex items-start gap-2.5 group p-2 rounded-xl hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors relative"
            >
              <Avatar
                fallbackText={reply.sender?.displayName || reply.sender?.username || 'U'}
                src={reply.sender?.avatarUrl || undefined}
                className="w-7 h-7 rounded-xl ring-1 ring-red-500/20 shrink-0"
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-xs font-bold text-[var(--text-primary)] dark:text-white truncate">
                      {reply.sender?.displayName || reply.sender?.username}
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)] font-mono shrink-0">
                      {timestamp}
                    </span>
                  </div>

                  {/* Thread Message Hover Action (WhatsApp reply in thread) */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-[var(--bg-surface-0)] px-1 py-0.5 rounded-lg border border-[var(--border-subtle)] shadow-sm">
                    <button
                      type="button"
                      onClick={() => setReplyingToInThread(reply)}
                      className="p-1 hover:scale-110 transition-transform cursor-pointer text-[var(--text-muted)] hover:text-emerald-600"
                      title="Quote reply in thread"
                    >
                      <CornerUpLeft className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* WhatsApp-style Quoted Box if reply quotes another message */}
                {reply.replyTo && (
                  <div className="mb-1.5 p-1.5 px-2.5 rounded-lg bg-black/[0.04] dark:bg-white/[0.06] border-l-2 border-emerald-500 text-[11px] select-none">
                    <p className="font-bold text-emerald-600 dark:text-emerald-400 truncate">
                      {reply.replyTo.sender?.displayName || reply.replyTo.sender?.username || 'User'}
                    </p>
                    <p className="text-[var(--text-muted)] truncate line-clamp-1">
                      {reply.replyTo.content || 'Attachment'}
                    </p>
                  </div>
                )}

                {/* Reply Content */}
                <div className="text-xs text-[var(--text-primary)] dark:text-gray-200 leading-relaxed break-words select-text">
                  {reply.content}
                </div>

                {/* Attachments */}
                {reply.attachments && (reply.attachments as any[]).length > 0 && (
                  <div className="mt-2 space-y-1">
                    {(reply.attachments as AttachmentMetaDTO[]).map((att, idx) => (
                      <div
                        key={idx}
                        onClick={() =>
                          setActiveViewerFile({
                            name: att.name,
                            url: resolveStorageUrl(att.url),
                            type: att.type,
                            size: att.size,
                          })
                        }
                        className="flex items-center gap-2 p-1.5 rounded-lg bg-black/[0.03] dark:bg-white/[0.05] border border-[var(--border-subtle)] hover:border-red-400 cursor-pointer text-[11px]"
                      >
                        <FileText className="w-3.5 h-3.5 text-red-500 shrink-0" />
                        <span className="truncate flex-1 font-medium">{att.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        <div ref={threadEndRef} className="h-4 shrink-0" />
      </div>

      {/* Thread Composer Area (Slack Docked Composer) */}
      <div className="p-3 border-t border-[var(--border-subtle)] bg-[var(--bg-surface-0)] shrink-0 space-y-2">
        {/* WhatsApp Quote Banner if Replying to a specific message in thread */}
        {replyingToInThread && (
          <div className="flex items-center justify-between p-2 px-3 rounded-xl bg-black/[0.03] dark:bg-white/[0.05] border-l-4 border-emerald-500 border border-[var(--border-subtle)] border-l-emerald-500 animate-slide-down">
            <div className="flex items-center gap-2 min-w-0">
              <CornerUpLeft className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div className="min-w-0 text-xs">
                <p className="font-bold text-emerald-600 dark:text-emerald-400 truncate">
                  Replying to{' '}
                  <span className="text-[var(--text-primary)] dark:text-white">
                    {replyingToInThread.sender?.displayName || replyingToInThread.sender?.username}
                  </span>
                </p>
                <p className="text-[var(--text-muted)] truncate max-w-xs text-[11px]">
                  {replyingToInThread.content || 'Attachment'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setReplyingToInThread(null)}
              className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] dark:hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Staged attachments preview */}
        {stagedAttachments.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            {stagedAttachments.map((att, idx) => (
              <div
                key={idx}
                className="flex items-center gap-1.5 p-1 px-2 rounded-lg bg-[var(--bg-surface-2)] border border-[var(--border-subtle)] text-[11px] shrink-0"
              >
                <FileText className="w-3 h-3 text-red-500 shrink-0" />
                <span className="max-w-[90px] truncate">{att.name}</span>
                <button
                  type="button"
                  onClick={() => setStagedAttachments((prev) => prev.filter((_, i) => i !== idx))}
                  className="text-[var(--text-muted)] hover:text-red-500"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input box */}
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface-1)] focus-within:border-red-500/60 focus-within:ring-2 focus-within:ring-red-500/15 transition-all p-2">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Reply in thread..."
            rows={2}
            className="w-full bg-transparent resize-none border-none outline-none text-xs text-[var(--text-primary)] dark:text-gray-100 placeholder:text-[var(--text-muted)] custom-scrollbar"
          />

          <div className="flex items-center justify-between pt-1 border-t border-[var(--border-subtle)] mt-1">
            <div className="flex items-center gap-1">
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => handleFileUpload(e.target.files)}
                multiple
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                title="Attach file"
              >
                <Paperclip className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsEmojiPickerOpen((prev) => !prev)}
                className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                title="Insert emoji"
              >
                <Smile className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              type="button"
              onClick={handleSendReply}
              disabled={(!content.trim() && stagedAttachments.length === 0) || isSending || isUploading}
              className="px-3 py-1 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer disabled:cursor-not-allowed"
            >
              {isSending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
              <span>Reply</span>
            </button>
          </div>
        </div>

        {/* Slack-style "Also send to #channel" checkbox */}
        <label className="flex items-center gap-2 cursor-pointer select-none text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] dark:hover:text-gray-200 transition-colors pt-0.5">
          <input
            type="checkbox"
            checked={alsoSendToChannel}
            onChange={(e) => setAlsoSendToChannel(e.target.checked)}
            className="w-3.5 h-3.5 rounded border-[var(--border-subtle)] text-red-600 focus:ring-red-500 cursor-pointer"
          />
          <span>Also send to {channelLabel}</span>
        </label>
      </div>

      {/* Emoji Picker Popover */}
      {isEmojiPickerOpen && (
        <div
          ref={emojiPickerRef}
          className="absolute bottom-24 right-4 p-2.5 rounded-2xl bg-[var(--bg-surface-0)] border border-[var(--border-subtle)] backdrop-blur-3xl shadow-xl z-50 animate-slide-up w-64 ring-1 ring-black/[0.06]"
        >
          <div className="grid grid-cols-4 gap-2 place-items-center py-1">
            {GRAPHICAL_REACTIONS.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  setContent((prev) => prev + `:${r.id}: `);
                  setIsEmojiPickerOpen(false);
                  textareaRef.current?.focus();
                }}
                className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 hover:scale-125 transition-transform cursor-pointer"
                title={r.label}
              >
                <GraphicalReaction name={r.id} size="sm" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Universal File Viewer Modal */}
      <UniversalFileViewerModal
        file={activeViewerFile}
        isOpen={!!activeViewerFile}
        onClose={() => setActiveViewerFile(null)}
      />
    </aside>
  );
};
