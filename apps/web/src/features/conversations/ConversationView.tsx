'use client';

import * as React from 'react';
import { useConversationStore } from '@/stores/conversationStore';
import { useAuthStore } from '@/stores/authStore';
import { ConversationDTO, DirectMessageDTO, AttachmentMetaDTO, ExternalMeetingBridgeDTO, REALTIME_EVENTS, MeetingBridgeActivatedBroadcast, MeetingBridgeRemovedBroadcast } from '@mivo/shared';
import { Avatar, Button } from '@mivo/ui';
import {
  Phone,
  Video,
  Paperclip,
  Send,
  Smile,
  Users,
  FileText,
  FileSpreadsheet,
  FileCode,
  FolderArchive,
  FilePlus,
  File,
  X,
  Download,
  ExternalLink,
  Sparkles,
  Image as ImageIcon,
  Loader2,
  ZoomIn,
} from 'lucide-react';
import { storageClient } from '@/lib/storage-client';
import { api } from '@/lib/api-client';
import { realtime } from '@/lib/socket-client';
import { ExternalMeetingCard } from '@/features/meetings/ExternalMeetingCard';
import { RoomMeetingBridgeBanner } from '@/features/meetings/RoomMeetingBridgeBanner';
import { ExternalMeetingHubModal } from '@/features/meetings/ExternalMeetingHubModal';
import { GoogleMeetIcon, MicrosoftTeamsIcon } from '@/features/meetings/ExternalMeetingIcons';

const EMOJI_OPTIONS = ['👍', '❤️', '🔥', '😂', '🎉', '🚀', '💯', '✨'];

function getDocTypeInfo(filename: string, mimeType?: string) {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  if (ext === 'pdf' || mimeType?.includes('pdf')) {
    return {
      label: 'PDF Document',
      badge: 'PDF',
      color: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
      type: 'pdf',
    };
  }
  if (['doc', 'docx'].includes(ext) || mimeType?.includes('word')) {
    return {
      label: 'Word Document',
      badge: 'DOCX',
      color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      type: 'word',
    };
  }
  if (['xls', 'xlsx', 'csv'].includes(ext) || mimeType?.includes('sheet') || mimeType?.includes('excel')) {
    return {
      label: 'Spreadsheet',
      badge: 'EXCEL',
      color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      type: 'sheet',
    };
  }
  if (['ppt', 'pptx'].includes(ext) || mimeType?.includes('presentation') || mimeType?.includes('powerpoint')) {
    return {
      label: 'Presentation',
      badge: 'SLIDES',
      color: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      type: 'slides',
    };
  }
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext) || mimeType?.includes('zip') || mimeType?.includes('archive')) {
    return {
      label: 'Compressed Archive',
      badge: 'ARCHIVE',
      color: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      type: 'archive',
    };
  }
  if (['js', 'ts', 'tsx', 'jsx', 'py', 'json', 'html', 'css', 'go', 'rs', 'sql', 'sh'].includes(ext)) {
    return {
      label: 'Source Code',
      badge: ext.toUpperCase(),
      color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
      type: 'code',
    };
  }
  return {
    label: 'Document',
    badge: ext ? ext.toUpperCase() : 'FILE',
    color: 'bg-slate-600/20 text-slate-300 border-slate-500/30',
    type: 'general',
  };
}

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
  const [uploadStatus, setUploadStatus] = React.useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = React.useState(false);
  const [previewImageUrl, setPreviewImageUrl] = React.useState<string | null>(null);
  const [isDragOver, setIsDragOver] = React.useState(false);
  const [isMeetingHubOpen, setIsMeetingHubOpen] = React.useState(false);
  const [activeBridge, setActiveBridge] = React.useState<ExternalMeetingBridgeDTO | null>(null);

  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const docInputRef = React.useRef<HTMLInputElement>(null);
  const mediaInputRef = React.useRef<HTMLInputElement>(null);
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

  // Fetch active external meeting bridge for this conversation
  const fetchBridge = React.useCallback(async (conversationId: string) => {
    try {
      const res = await api.get<{ bridge: ExternalMeetingBridgeDTO | null }>(
        `/api/v1/meetings/conversation/${conversationId}/bridge`
      );
      if (res.success && res.data) {
        setActiveBridge(res.data.bridge);
      }
    } catch (err) {
      console.error('Failed to load conversation meeting bridge:', err);
    }
  }, []);

  React.useEffect(() => {
    if (!activeConversationId) {
      setActiveBridge(null);
      return;
    }

    fetchBridge(activeConversationId);

    const socket = realtime.getSocket();
    if (!socket) return;

    const handleBridgeActivated = (payload: MeetingBridgeActivatedBroadcast) => {
      if (payload.conversationId === activeConversationId) {
        setActiveBridge({
          conversationId: payload.conversationId,
          meeting: payload.meeting,
          activatedAt: payload.activatedAt,
          activatedBy: payload.activatedBy,
        });
      }
    };

    const handleBridgeRemoved = (payload: MeetingBridgeRemovedBroadcast) => {
      if (payload.conversationId === activeConversationId) {
        setActiveBridge(null);
      }
    };

    socket.on(REALTIME_EVENTS.DM_MEETING_BRIDGE_ACTIVATED, handleBridgeActivated);
    socket.on(REALTIME_EVENTS.DM_MEETING_BRIDGE_REMOVED, handleBridgeRemoved);

    return () => {
      socket.off(REALTIME_EVENTS.DM_MEETING_BRIDGE_ACTIVATED, handleBridgeActivated);
      socket.off(REALTIME_EVENTS.DM_MEETING_BRIDGE_REMOVED, handleBridgeRemoved);
    };
  }, [activeConversationId, fetchBridge]);

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

  const handleFilesSelected = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);

    try {
      setIsUploading(true);
      setUploadStatus(`Uploading ${files.length} file${files.length === 1 ? '' : 's'}...`);

      const uploaded: AttachmentMetaDTO[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadStatus(`Uploading ${file.name} (${i + 1}/${files.length})...`);
        const result = await storageClient.uploadFile(file, 'attachments');
        uploaded.push(result);
      }

      setPendingAttachments((prev) => [...prev, ...uploaded]);
    } catch (err: any) {
      console.error('File upload failed:', err);
    } finally {
      setIsUploading(false);
      setUploadStatus(null);
      if (docInputRef.current) docInputRef.current.value = '';
      if (mediaInputRef.current) mediaInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await handleFilesSelected(e.dataTransfer.files);
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
          Pick a direct chat from the sidebar or start a new custom group to exchange instant messages, share documents, and launch crystal-clear HD audio calls.
        </p>
      </div>
    );
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex-1 flex flex-col bg-[var(--bg-canvas)] h-full overflow-hidden relative transition-colors ${
        isDragOver ? 'ring-2 ring-violet-500 ring-inset bg-violet-950/10' : ''
      }`}
    >
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

        {/* Header Actions: Meet & Teams and HD Audio Call */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setIsMeetingHubOpen(true)}
            className={`gap-2 transition-all duration-200 ${
              activeBridge
                ? 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border-emerald-500/40 shadow-[0_0_15px_rgba(48,209,88,0.25)]'
                : 'bg-white/[0.05] hover:bg-white/[0.1] text-white/90 border-white/[0.1]'
            }`}
            title="Start or manage Google Meet / Microsoft Teams meeting"
          >
            <div className="flex items-center -space-x-1">
              <GoogleMeetIcon className="w-3.5 h-3.5" />
              <MicrosoftTeamsIcon className="w-3.5 h-3.5" />
            </div>
            <span className="hidden sm:inline font-bold">
              {activeBridge ? 'Meeting Live' : 'Meet & Teams'}
            </span>
            {activeBridge && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
            )}
          </Button>

          <Button
            size="sm"
            variant="secondary"
            onClick={handleStartCall}
            disabled={activeCall?.conversationId === activeConv.id}
            className="gap-2 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border-emerald-500/30"
          >
            <Phone className="w-4 h-4" />
            <span className="hidden sm:inline">
              {activeCall?.conversationId === activeConv.id ? 'Call Active' : 'HD Audio Call'}
            </span>
          </Button>
        </div>
      </header>

      {/* Active External Meeting Bridge Banner */}
      {activeBridge && activeConv && (
        <RoomMeetingBridgeBanner
          bridge={activeBridge}
          conversationId={activeConv.id}
          isHost={activeConv.createdById === user?.id || activeBridge.activatedBy.id === user?.id}
          onBridgeRemoved={() => setActiveBridge(null)}
        />
      )}

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
              <span className="text-violet-300 font-semibold">{title}</span>. Share messages, attachments, and documents!
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

                    {/* Attachments & Documents Display */}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="mt-2.5 space-y-2">
                        {msg.attachments.map((att: any) => {
                          if (att.type === 'external-meeting' && att.meeting) {
                            return (
                              <ExternalMeetingCard
                                key={att.meeting.id || msg.id}
                                meeting={att.meeting}
                                conversationId={activeConv.id}
                                isCurrentlyBridged={activeBridge?.meeting.id === att.meeting.id}
                                onBridgeActivated={() => {
                                  setActiveBridge({
                                    conversationId: activeConv.id,
                                    meeting: att.meeting,
                                    activatedAt: new Date().toISOString(),
                                    activatedBy: {
                                      id: user?.id || '',
                                      username: user?.username || '',
                                      displayName: user?.displayName || user?.username || 'User',
                                      avatarUrl: user?.avatarUrl || null,
                                      status: user?.status || 'ONLINE',
                                      customStatus: user?.customStatus || null,
                                    },
                                  });
                                }}
                              />
                            );
                          }

                          const isImage =
                            att.type?.startsWith('image/') ||
                            att.url?.match(/\.(jpeg|jpg|gif|png|webp|svg)$/i);

                          if (isImage) {
                            return (
                              <div
                                key={att.url || att.name}
                                onClick={() => setPreviewImageUrl(att.url)}
                                className="max-w-md max-h-72 rounded-xl overflow-hidden border border-white/10 hover:border-violet-500/50 cursor-pointer group/img transition-all bg-black/40 shadow-sm relative"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={att.url}
                                  alt={att.name}
                                  className="w-full h-full object-cover group-hover/img:scale-102 transition-transform duration-200"
                                />
                                <div className="absolute top-2 right-2 p-1 rounded-md bg-black/60 text-white opacity-0 group-hover/img:opacity-100 transition-opacity">
                                  <ZoomIn className="w-3.5 h-3.5" />
                                </div>
                              </div>
                            );
                          }

                          // High-Fidelity Document Card
                          const docInfo = getDocTypeInfo(att.name, att.type);

                          return (
                            <div
                              key={att.url || att.name}
                              className="flex items-center gap-3 p-3 rounded-2xl bg-black/25 hover:bg-black/40 border border-white/10 hover:border-violet-500/40 transition-all max-w-sm group/doc shadow-sm"
                            >
                              <div
                                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${docInfo.color} group-hover/doc:scale-105 transition-transform`}
                              >
                                {docInfo.type === 'sheet' ? (
                                  <FileSpreadsheet className="w-5 h-5" />
                                ) : docInfo.type === 'code' ? (
                                  <FileCode className="w-5 h-5" />
                                ) : docInfo.type === 'archive' ? (
                                  <FolderArchive className="w-5 h-5" />
                                ) : (
                                  <FileText className="w-5 h-5" />
                                )}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className="text-xs font-semibold text-white truncate max-w-[170px]"
                                    title={att.name}
                                  >
                                    {att.name}
                                  </span>
                                  <span
                                    className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${docInfo.color}`}
                                  >
                                    {docInfo.badge}
                                  </span>
                                </div>
                                <div className="text-[10px] text-white/50 flex items-center gap-1.5 mt-0.5">
                                  <span>{storageClient.formatBytes(att.size)}</span>
                                  <span>•</span>
                                  <span>{docInfo.label}</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <a
                                  href={att.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="Open in new tab"
                                  className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                                <a
                                  href={att.url}
                                  download={att.name}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="Download Document"
                                  className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </a>
                              </div>
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

      {/* Uploading Status Banner */}
      {isUploading && (
        <div className="px-6 py-2 bg-violet-600/10 border-t border-violet-500/20 text-xs text-violet-300 flex items-center gap-2 animate-pulse">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-400" />
          <span>{uploadStatus || 'Uploading to Supabase S3...'}</span>
        </div>
      )}

      {/* Staged Attachments / Documents Strip */}
      {pendingAttachments.length > 0 && (
        <div className="px-6 py-2.5 flex flex-wrap gap-2 border-t border-[var(--border-subtle)] bg-[var(--bg-surface-0)]">
          {pendingAttachments.map((att) => {
            const docInfo = getDocTypeInfo(att.name, att.type);
            return (
              <div
                key={att.url || att.name}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-violet-600/20 border border-violet-500/30 text-white text-xs shadow-sm"
              >
                <div className={`p-1 rounded-lg border ${docInfo.color}`}>
                  <FileText className="w-3 h-3" />
                </div>
                <span className="max-w-[140px] truncate font-medium">{att.name}</span>
                <span className="text-[10px] text-white/50">({storageClient.formatBytes(att.size)})</span>
                <button
                  type="button"
                  onClick={() => setPendingAttachments((prev) => prev.filter((p) => p.url !== att.url))}
                  className="text-violet-300 hover:text-white p-0.5 rounded transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Input Box Footer */}
      <footer className="p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-surface-0)]/90 backdrop-blur-md">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          {/* Document Upload Hidden Input & Button */}
          <input
            type="file"
            ref={docInputRef}
            onChange={(e) => handleFilesSelected(e.target.files)}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt,.md,.json,.zip,.tar,.gz,.rar,.7z"
            multiple
            className="hidden"
            id="dm-doc-upload"
          />
          <button
            type="button"
            disabled={isUploading}
            onClick={() => docInputRef.current?.click()}
            className="p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-[var(--text-secondary)] hover:text-white transition-colors"
            title="Send Document (PDF, Word, Excel, Zip...)"
          >
            <FilePlus className="w-4 h-4 text-violet-400" />
          </button>

          {/* Media / Photo Upload Hidden Input & Button */}
          <input
            type="file"
            ref={mediaInputRef}
            onChange={(e) => handleFilesSelected(e.target.files)}
            accept="image/*,video/*,audio/*"
            multiple
            className="hidden"
            id="dm-media-upload"
          />
          <button
            type="button"
            disabled={isUploading}
            onClick={() => mediaInputRef.current?.click()}
            className="p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-[var(--text-secondary)] hover:text-white transition-colors"
            title="Attach Image or Video"
          >
            <ImageIcon className="w-4 h-4 text-cyan-400" />
          </button>

          {/* Instant Google Meet & Teams Button */}
          <button
            type="button"
            onClick={() => setIsMeetingHubOpen(true)}
            className="p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-[var(--text-secondary)] hover:text-white transition-colors group relative"
            title="Start Google Meet or Microsoft Teams session"
          >
            <Video className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
          </button>

          {/* Quick Emoji Trigger */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-[var(--text-secondary)] hover:text-white transition-colors"
              title="Add emoji"
            >
              <Smile className="w-4 h-4 text-amber-400" />
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
            placeholder={`Message ${title}... (or drag and drop documents)`}
            value={inputContent}
            onChange={handleInputChange}
            className="flex-1 bg-[var(--bg-surface-1)] border border-[var(--border-subtle)] rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:border-violet-500 transition-colors"
          />

          {/* Send Button */}
          <Button
            type="submit"
            size="sm"
            disabled={(!inputContent.trim() && pendingAttachments.length === 0) || isUploading}
            className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white shadow-md shadow-violet-600/30"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </footer>

      {/* Lightbox Modal for Image Preview */}
      {previewImageUrl && (
        <div
          onClick={() => setPreviewImageUrl(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <button
              onClick={() => setPreviewImageUrl(null)}
              className="absolute -top-10 right-0 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewImageUrl}
              alt="Enlarged preview"
              className="max-h-[85vh] max-w-full rounded-2xl object-contain shadow-2xl"
            />
          </div>
        </div>
      )}

      {/* External Meeting Hub Modal */}
      {activeConv && (
        <ExternalMeetingHubModal
          isOpen={isMeetingHubOpen}
          onClose={() => setIsMeetingHubOpen(false)}
          conversationId={activeConv.id}
          conversationName={title}
          activeBridge={activeBridge}
          onBridgeUpdated={() => {
            if (activeConversationId) {
              fetchBridge(activeConversationId);
            }
          }}
        />
      )}
    </div>
  );
};
