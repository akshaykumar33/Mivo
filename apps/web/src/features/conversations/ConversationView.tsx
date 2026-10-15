'use client';

import * as React from 'react';
import { useConversationStore } from '@/stores/conversationStore';
import { useAuthStore } from '@/stores/authStore';
import { ConversationDTO, DirectMessageDTO, AttachmentMetaDTO } from '@mivo/shared';
import { Avatar, Button } from '@mivo/ui';
import {
  Phone,
  Paperclip,
  Send,
  Smile,
  Users,
  FileText,
  X,
  Download,
  Sparkles,
  Radio,
} from 'lucide-react';
import { api } from '@/lib/api-client';

const EMOJI_OPTIONS = ['👍', '❤️', '🔥', '😂', '🎉', '🚀'];

export const ConversationView: React.FC = () => {
  const { user } = useAuthStore();
  const {
    conversations,
    activeConversationId,
    messages,
    typingUsers,
    sendMessage,
    sendTyping,
    sendStopTyping,
    addReaction,
    initiateCall,
    activeCall,
  } = useConversationStore();

  const [inputContent, setInputContent] = React.useState('');
  const [pendingAttachments, setPendingAttachments] = React.useState<AttachmentMetaDTO[]>([]);
  const [isUploading, setIsUploading] = React.useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = React.useState(false);

  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const typingTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const activeConv = conversations.find((c) => c.id === activeConversationId);
  const convMessages = (activeConversationId && messages[activeConversationId]) || [];
  const currentTyping = (activeConversationId && typingUsers[activeConversationId]) || [];

  // Determine other user for direct conversations
  const otherMember =
    activeConv?.type === 'DIRECT'
      ? activeConv.members.find((m) => m.userId !== user?.id)?.user
      : null;

  const title =
    activeConv?.type === 'GROUP'
      ? activeConv.name || 'Custom Group'
      : otherMember?.displayName || otherMember?.username || 'Direct Message';

  // Scroll to bottom on new messages
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [convMessages, currentTyping]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputContent(e.target.value);
    if (!activeConversationId) return;

    sendTyping(activeConversationId);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      sendStopTyping(activeConversationId);
    }, 2000);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', file);

      const token = api.getAccessToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/v1/storage/upload`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      const data = await res.json();
      if (data.success && data.data) {
        setPendingAttachments((prev) => [...prev, data.data]);
      }
    } catch (err) {
      console.error('File upload failed:', err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!activeConversationId) return;
    const trimmed = inputContent.trim();
    if (!trimmed && pendingAttachments.length === 0) return;

    const attachmentsToSend = pendingAttachments.length > 0 ? pendingAttachments : undefined;
    setInputContent('');
    setPendingAttachments([]);
    sendStopTyping(activeConversationId);

    await sendMessage(activeConversationId, trimmed, attachmentsToSend);
  };

  const handleStartCall = () => {
    if (!activeConv || !user) return;
    initiateCall(activeConv, user.id);
  };

  if (!activeConv) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[var(--bg-canvas)] text-center select-none">
        <div className="w-16 h-16 rounded-2xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center text-violet-400 mb-4 shadow-inner">
          <Users className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-white font-display mb-1">
          Select or Create a Conversation
        </h3>
        <p className="text-xs text-[var(--text-muted)] max-w-sm">
          Pick a direct chat from the sidebar or start a new custom group to exchange instant messages, share attachments, and launch audio calls.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[var(--bg-canvas)] h-full overflow-hidden">
      {/* Top Header */}
      <header className="h-16 border-b border-[var(--border-subtle)] px-6 flex items-center justify-between bg-[var(--bg-surface-0)]/60 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar
              fallbackText={title}
              src={activeConv.iconUrl || otherMember?.avatarUrl || undefined}
              size="sm"
            />
            {activeConv.type === 'DIRECT' && otherMember && (
              <span
                className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[var(--bg-surface-0)] ${
                  otherMember.status === 'ONLINE'
                    ? 'bg-emerald-500'
                    : otherMember.status === 'DND'
                    ? 'bg-rose-500'
                    : otherMember.status === 'IDLE'
                    ? 'bg-amber-500'
                    : 'bg-slate-500'
                }`}
              />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white font-display">{title}</h2>
              {activeConv.type === 'GROUP' ? (
                <span className="px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20 text-[10px] font-semibold">
                  Group • {activeConv.members.length} members
                </span>
              ) : (
                otherMember && (
                  <span className="text-[11px] text-[var(--text-muted)]">@{otherMember.username}</span>
                )
              )}
            </div>
            <div className="text-[11px] text-[var(--text-muted)]">
              {activeConv.type === 'DIRECT'
                ? otherMember?.status === 'ONLINE'
                  ? 'Active now'
                  : 'Offline'
                : `${activeConv.members.map((m) => m.user.displayName || m.user.username).join(', ')}`}
            </div>
          </div>
        </div>

        {/* Header Action: Start Audio Call */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={handleStartCall}
            disabled={activeCall?.conversationId === activeConv.id}
            className="gap-2 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border-emerald-500/30"
          >
            <Phone className="w-4 h-4" />
            <span className="hidden sm:inline">
              {activeCall?.conversationId === activeConv.id ? 'Call Active' : 'Audio Call'}
            </span>
          </Button>
        </div>
      </header>

      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
        {convMessages.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-violet-600/20 to-indigo-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400 mb-3">
              <Sparkles className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-white mb-1">No messages yet</h4>
            <p className="text-xs text-[var(--text-muted)] max-w-xs">
              This is the beginning of your conversation with{' '}
              <span className="text-violet-300 font-semibold">{title}</span>. Send a greeting or attachment!
            </p>
          </div>
        ) : (
          convMessages.map((msg: DirectMessageDTO) => {
            const isMe = msg.senderId === user?.id;
            const senderName = msg.sender?.displayName || msg.sender?.username || 'User';
            const formattedTime = new Date(msg.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={msg.id}
                className={`flex gap-3 group relative ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                {!isMe && (
                  <Avatar
                    fallbackText={senderName}
                    src={msg.sender?.avatarUrl || undefined}
                    size="sm"
                    className="mt-0.5"
                  />
                )}

                <div className={`max-w-[75%] space-y-1.5 ${isMe ? 'items-end' : 'items-start'}`}>
                  {/* Sender & Timestamp */}
                  <div
                    className={`flex items-center gap-2 text-[11px] text-[var(--text-muted)] ${
                      isMe ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {!isMe && <span className="font-semibold text-slate-300">{senderName}</span>}
                    <span>{formattedTime}</span>
                  </div>

                  {/* Message Bubble */}
                  <div
                    className={`rounded-2xl p-3 text-xs leading-relaxed transition-all shadow-md ${
                      isMe
                        ? 'bg-violet-600 text-white rounded-tr-xs'
                        : 'bg-[var(--bg-surface-1)] text-slate-200 border border-[var(--border-subtle)] rounded-tl-xs'
                    }`}
                  >
                    {msg.content && <p className="whitespace-pre-wrap">{msg.content}</p>}

                    {/* Attachments Display */}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="mt-2 space-y-1.5">
                        {msg.attachments.map((att: AttachmentMetaDTO) => {
                          const isImage = att.type?.startsWith('image/') || att.url?.match(/\.(jpeg|jpg|gif|png|webp|svg)$/i);
                          return (
                            <div key={att.url || att.name} className="rounded-xl overflow-hidden">
                              {isImage ? (
                                <a
                                  href={att.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block group/img relative"
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={att.url}
                                    alt={att.name}
                                    className="max-h-60 rounded-xl object-cover hover:opacity-95 transition-opacity"
                                  />
                                </a>
                              ) : (
                                <a
                                  href={att.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2.5 p-2.5 rounded-xl bg-black/20 hover:bg-black/30 border border-white/10 text-white transition-colors"
                                >
                                  <FileText className="w-4 h-4 text-violet-300 shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <div className="truncate text-xs font-medium">{att.name}</div>
                                    <div className="text-[10px] text-white/60">
                                      {(att.size / 1024).toFixed(1)} KB
                                    </div>
                                  </div>
                                  <Download className="w-3.5 h-3.5 text-white/70" />
                                </a>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Reaction Pill Hover Bar */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 mt-1">
                    {EMOJI_OPTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => addReaction(activeConv.id, msg.id, emoji)}
                        className="p-1 rounded-md hover:bg-white/[0.08] text-xs transition-colors"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing Indicator */}
      {currentTyping.length > 0 && (
        <div className="px-6 py-1 text-[11px] text-violet-400 font-medium flex items-center gap-2">
          <span className="flex gap-1 items-center">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" />
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce [animation-delay:0.2s]" />
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce [animation-delay:0.4s]" />
          </span>
          <span>{currentTyping.join(', ')} is typing...</span>
        </div>
      )}

      {/* Pending Attachments Strip */}
      {pendingAttachments.length > 0 && (
        <div className="px-6 py-2 flex flex-wrap gap-2 border-t border-[var(--border-subtle)] bg-[var(--bg-surface-0)]">
          {pendingAttachments.map((att) => (
            <div
              key={att.url || att.name}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-violet-600/20 border border-violet-500/30 text-white text-xs"
            >
              <FileText className="w-3.5 h-3.5 text-violet-300" />
              <span className="max-w-[140px] truncate">{att.name}</span>
              <button
                type="button"
                onClick={() => setPendingAttachments((prev) => prev.filter((p) => p.url !== att.url))}
                className="text-violet-300 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input Box Footer */}
      <footer className="p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-surface-0)]/90 backdrop-blur-md">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          {/* File Upload Hidden Input & Trigger */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            id="dm-file-upload"
          />
          <button
            type="button"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-[var(--text-secondary)] hover:text-white transition-colors"
            title="Attach file or image"
          >
            <Paperclip className={`w-4 h-4 ${isUploading ? 'animate-spin' : ''}`} />
          </button>

          {/* Quick Emoji Trigger */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-[var(--text-secondary)] hover:text-white transition-colors"
              title="Add emoji"
            >
              <Smile className="w-4 h-4" />
            </button>
            {showEmojiPicker && (
              <div className="absolute bottom-12 left-0 p-2 rounded-2xl bg-[var(--bg-surface-1)] border border-[var(--border-subtle)] shadow-xl flex gap-1 z-20">
                {EMOJI_OPTIONS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => {
                      setInputContent((prev) => prev + e);
                      setShowEmojiPicker(false);
                    }}
                    className="p-1.5 hover:bg-white/[0.1] rounded-lg text-sm"
                  >
                    {e}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Message Input */}
          <input
            type="text"
            placeholder={`Message ${title}...`}
            value={inputContent}
            onChange={handleInputChange}
            className="flex-1 bg-[var(--bg-surface-1)] border border-[var(--border-subtle)] rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:border-violet-500 transition-colors"
          />

          {/* Send Button */}
          <Button
            type="submit"
            size="sm"
            disabled={!inputContent.trim() && pendingAttachments.length === 0}
            className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white shadow-md shadow-violet-600/30"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </footer>
    </div>
  );
};
