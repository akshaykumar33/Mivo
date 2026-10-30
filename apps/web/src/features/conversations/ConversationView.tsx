'use client';

import * as React from 'react';
import { useConversationStore } from '@/stores/conversationStore';
import { useAuthStore } from '@/stores/authStore';
import { useUserPresence } from '@/stores/presenceStore';
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
  Eye,
  ChevronLeft,
  Menu,
  Lock,
  CornerUpLeft,
  MessageSquareReply,
  MessageSquareText,
  ChevronRight,
} from 'lucide-react';
import { ThreadSidebar } from '../chat/ThreadSidebar';
import { useNavigationStore } from '@/stores/navigationStore';
import { storageClient } from '@/lib/storage-client';
import { api } from '@/lib/api-client';
import { realtime } from '@/lib/socket-client';
import { ExternalMeetingCard } from '@/features/meetings/ExternalMeetingCard';
import { RoomMeetingBridgeBanner } from '@/features/meetings/RoomMeetingBridgeBanner';
import { ExternalMeetingHubModal } from '@/features/meetings/ExternalMeetingHubModal';
import { GoogleMeetIcon, MicrosoftTeamsIcon } from '@/features/meetings/ExternalMeetingIcons';
import {
  UniversalFileViewerModal,
  YouTubeEmbedCard,
  extractYouTubeUrls,
  FileViewerItem,
  resolveStorageUrl,
} from '@/features/files';
import { GraphicalReaction } from '@/features/reactions';

const EMOJI_OPTIONS = ['thumbs_up', 'heart', 'fire', 'laugh', 'party', 'rocket', 'hundred', 'sparkles'];

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

function sanitizeChatMessage(content: string, hasMeetingAttachment: boolean): string | null {
  if (!content) return null;
  if (content === 'Sent attachments') return null;
  if (
    hasMeetingAttachment &&
    (content.includes('Created Google Meet Session') ||
      content.includes('Created Microsoft Teams Session') ||
      (content.includes('Created') && content.includes('Session:')))
  ) {
    return null;
  }
  const trimmed = content.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export const ConversationView: React.FC = () => {
  const { user, isGuest, setUpgradeModalOpen } = useAuthStore();
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
    selectConversation,
  } = useConversationStore();
  const { toggleMobileSidebar } = useNavigationStore();

  const [inputContent, setInputContent] = React.useState('');
  const [pendingAttachments, setPendingAttachments] = React.useState<AttachmentMetaDTO[]>([]);
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadStatus, setUploadStatus] = React.useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = React.useState(false);
  const [activeViewerFile, setActiveViewerFile] = React.useState<FileViewerItem | null>(null);
  const [isDragOver, setIsDragOver] = React.useState(false);
  const [isMeetingHubOpen, setIsMeetingHubOpen] = React.useState(false);
  const [activeBridge, setActiveBridge] = React.useState<ExternalMeetingBridgeDTO | null>(null);
  const [replyingTo, setReplyingTo] = React.useState<DirectMessageDTO | null>(null);
  const [activeThreadRoot, setActiveThreadRoot] = React.useState<DirectMessageDTO | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = React.useState<string | null>(null);

  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const docInputRef = React.useRef<HTMLInputElement>(null);
  const mediaInputRef = React.useRef<HTMLInputElement>(null);
  const messageInputRef = React.useRef<HTMLInputElement>(null);
  const typingTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Auto-focus message input when replying
  React.useEffect(() => {
    if (replyingTo) {
      messageInputRef.current?.focus();
    }
  }, [replyingTo]);

  // Cancel reply on Escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && replyingTo) {
        setReplyingTo(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [replyingTo]);

  const handleJumpToMessage = (messageId: string) => {
    const el = document.getElementById(`dm-msg-${messageId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedMessageId(messageId);
      setTimeout(() => {
        setHighlightedMessageId((curr) => (curr === messageId ? null : curr));
      }, 2000);
    }
  };

  const activeConv = conversations.find((c) => c.id === activeConversationId);
  const rawMessages = (activeConversationId && messages[activeConversationId]) || [];
  const convMessages = React.useMemo(() => {
    const seen = new Set<string>();
    return rawMessages.filter((m) => {
      if (!m || !m.id || seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });
  }, [rawMessages]);
  const currentTyping = (activeConversationId && typingUsers[activeConversationId]) || [];

  // Determine other user for direct conversations
  const otherMember =
    activeConv?.type === 'DIRECT'
      ? activeConv.members.find((m) => m.userId !== user?.id)?.user
      : null;

  const otherPresence = useUserPresence(otherMember?.id, otherMember);

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
    if (isGuest) {
      setUpgradeModalOpen(true);
      return;
    }
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
    if (isGuest) {
      setUpgradeModalOpen(true);
      return;
    }
    if (!activeConversationId) return;
    const trimmed = inputContent.trim();
    if (!trimmed && pendingAttachments.length === 0) return;

    const attachmentsToSend = pendingAttachments.length > 0 ? pendingAttachments : undefined;
    const replyTargetId = replyingTo?.id || undefined;
    setInputContent('');
    setPendingAttachments([]);
    setReplyingTo(null);
    sendStopTyping(activeConversationId);

    await sendMessage(activeConversationId, trimmed, attachmentsToSend, replyTargetId);
  };

  const handleStartCall = () => {
    if (isGuest) {
      setUpgradeModalOpen(true);
      return;
    }
    if (!activeConv || !user) return;
    initiateCall(activeConv, user.id);
  };

  if (!activeConv) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[var(--bg-canvas)] text-center select-none">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-[#DC2626] mb-4 shadow-inner">
          <Users className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-[var(--text-primary)] font-display mb-1">
          Select or Create a Conversation
        </h3>
        <p className="text-xs text-[var(--text-muted)] max-w-sm">
          Pick a direct chat from the sidebar or start a new custom group to exchange instant messages, share documents, and launch crystal-clear HD audio calls.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex h-full overflow-hidden select-none">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex-1 flex flex-col bg-[var(--bg-canvas)] h-full overflow-hidden relative transition-colors min-w-0 ${
          isDragOver ? 'ring-2 ring-[#DC2626] ring-inset bg-red-950/5' : ''
        }`}
      >
      {/* Top Header */}
      <header className="h-16 border-b border-[var(--border-subtle)] px-3 sm:px-6 flex items-center justify-between bg-[var(--bg-surface-0)]/80 backdrop-blur-md z-10 gap-2">
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
          {/* Mobile Back Button to Conversation List */}
          <button
            type="button"
            onClick={() => selectConversation(null)}
            className="md:hidden p-1.5 -ml-1 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer mr-0.5 flex-shrink-0"
            title="Back to conversations"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Mobile Hamburger Drawer Trigger */}
          <button
            type="button"
            onClick={toggleMobileSidebar}
            className="md:hidden p-1.5 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer mr-1 flex-shrink-0"
            title="Open workspaces"
          >
            <Menu className="w-4 h-4" />
          </button>

          <div className="relative flex-shrink-0">
            <Avatar
              fallbackText={title}
              src={activeConv.iconUrl || otherMember?.avatarUrl || undefined}
              size="sm"
            />
            {activeConv.type === 'DIRECT' && otherMember && (
              <span
                className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[var(--bg-surface-0)] ${
                  otherPresence.status === 'ONLINE'
                    ? 'bg-emerald-500'
                    : otherPresence.status === 'DND'
                    ? 'bg-rose-500'
                    : otherPresence.status === 'IDLE'
                    ? 'bg-amber-500'
                    : 'bg-slate-500'
                }`}
              />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-[var(--text-primary)] font-display">{title}</h2>
              {activeConv.type === 'GROUP' ? (
                <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-[#DC2626] border border-red-500/20 text-[10px] font-semibold">
                  Group • {activeConv.members.length} members
                </span>
              ) : (
                otherMember && (
                  <span className="text-[11px] text-[var(--text-muted)]">@{otherMember.username}</span>
                )
              )}
            </div>
            <div className="text-[11px] text-[var(--text-muted)] flex items-center gap-1.5">
              {activeConv.type === 'DIRECT' ? (
                <>
                  <span>
                    {otherPresence.status === 'ONLINE'
                      ? 'Active now'
                      : otherPresence.status === 'IDLE'
                      ? 'Away'
                      : otherPresence.status === 'DND'
                      ? 'Do Not Disturb'
                      : 'Offline'}
                  </span>
                  {otherPresence.customStatus && (
                    <>
                      <span>•</span>
                      <span className="text-[#DC2626] font-semibold flex items-center gap-1">
                        {otherPresence.customStatus}
                      </span>
                    </>
                  )}
                </>
              ) : (
                `${activeConv.members.map((m) => m.user.displayName || m.user.username).join(', ')}`
              )}
            </div>
          </div>
        </div>

        {/* Header Actions: Meet & Teams and HD Audio Call */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          <Button
            size="sm"
            variant="secondary"
            onClick={isGuest ? () => setUpgradeModalOpen(true) : () => setIsMeetingHubOpen(true)}
            className={`gap-1.5 sm:gap-2 transition-all duration-200 text-xs px-2.5 sm:px-3 ${
              activeBridge
                ? 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-700 border-emerald-500/40 shadow-[0_0_15px_rgba(48,209,88,0.25)]'
                : 'bg-[var(--bg-surface-1)] hover:bg-[var(--bg-surface-2)] text-[var(--text-primary)] border-[var(--border-subtle)]'
            }`}
            title={isGuest ? 'Guest accounts cannot launch meetings. Upgrade account.' : 'Start or manage Google Meet / Microsoft Teams meeting'}
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
            disabled={!isGuest && activeCall?.conversationId === activeConv.id}
            title={isGuest ? 'Guest accounts cannot make audio or video calls. Upgrade to call.' : undefined}
            className="gap-1.5 sm:gap-2 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-700 border-emerald-500/30 text-xs px-2.5 sm:px-3"
          >
            <Phone className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
            <span className="hidden sm:inline">
              {isGuest ? 'Call (Upgrade)' : activeCall?.conversationId === activeConv.id ? 'Call Active' : 'HD Audio Call'}
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
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#DC2626]/20 to-[#991B1B]/20 border border-[#DC2626]/30 flex items-center justify-center text-[#DC2626] mb-3">
              <Sparkles className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-[var(--text-primary)] mb-1">No messages yet</h4>
            <p className="text-xs text-[var(--text-muted)] max-w-xs">
              This is the beginning of your conversation with{' '}
              <span className="text-[#DC2626] font-semibold">{title}</span>. Share messages, attachments, and documents!
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

            const isHighlighted = highlightedMessageId === msg.id;

            return (
              <div
                key={msg.id}
                id={`dm-msg-${msg.id}`}
                className={`flex gap-3 group relative transition-all duration-300 p-1 rounded-2xl ${
                  isMe ? 'justify-end' : 'justify-start'
                } ${isHighlighted ? 'ring-2 ring-emerald-500/70 bg-emerald-500/10 shadow-md' : ''}`}
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
                    {!isMe && <span className="font-semibold text-[var(--text-primary)]">{senderName}</span>}
                    <span>{formattedTime}</span>
                  </div>

                  {/* Slack-style "Replied to a thread" indicator */}
                  {msg.isThreadBroadcast && (
                    <div
                      onClick={() => {
                        const root = convMessages.find((m) => m.id === msg.threadId) || msg;
                        setActiveThreadRoot(root);
                      }}
                      className="flex items-center gap-1.5 text-[11px] font-semibold text-red-600 hover:underline cursor-pointer mb-1 select-none"
                      title="View original thread"
                    >
                      <MessageSquareText className="w-3.5 h-3.5" />
                      <span>Replied to a thread</span>
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div
                    className={`rounded-2xl p-3 text-xs leading-relaxed transition-all shadow-md ${
                      isMe
                        ? 'bg-gradient-to-r from-[#DC2626] via-[#B91C1C] to-[#991B1B] text-white shadow-[0_4px_16px_rgba(220,38,38,0.25)] rounded-tr-xs'
                        : 'bg-[var(--bg-surface-0)] text-[var(--text-primary)] border border-[var(--border-subtle)] shadow-sm rounded-tl-xs'
                    }`}
                  >
                    {/* WhatsApp-style Quoted Message Box */}
                    {msg.replyTo && (
                      <div
                        onClick={() => handleJumpToMessage(msg.replyTo!.id)}
                        className={`mb-2 p-2 px-3 rounded-xl border-l-[3.5px] border-emerald-500 transition-all cursor-pointer select-none text-left ${
                          isMe
                            ? 'bg-black/20 text-white hover:bg-black/30'
                            : 'bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.07] text-[var(--text-primary)] dark:text-gray-100'
                        }`}
                        title="Click to jump to quoted message"
                      >
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 mb-0.5">
                          <CornerUpLeft className="w-3 h-3" />
                          <span>{msg.replyTo.sender?.displayName || msg.replyTo.sender?.username || 'User'}</span>
                        </div>
                        <div className="text-xs opacity-85 line-clamp-2">
                          {msg.replyTo.content || 'Shared attachment'}
                        </div>
                      </div>
                    )}
                    {(() => {
                      const hasMeeting = msg.attachments?.some((a: any) => a.type === 'external-meeting');
                      const cleaned = sanitizeChatMessage(msg.content || '', !!hasMeeting);
                      if (!cleaned) return null;

                      return (
                        <div>
                          <p className="whitespace-pre-wrap">{cleaned}</p>
                          {/* Auto-detected YouTube Videos inline in conversation */}
                          {extractYouTubeUrls(cleaned).map((yt) => (
                            <YouTubeEmbedCard
                              key={yt.videoId}
                              url={yt.url}
                              onOpenViewer={(url) =>
                                setActiveViewerFile({
                                  name: 'YouTube Video',
                                  url,
                                  type: 'video/youtube',
                                })
                              }
                            />
                          ))}
                        </div>
                      );
                    })()}

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

                          const fileUrl = resolveStorageUrl(att.url);
                          const isImage =
                            att.type?.startsWith('image/') ||
                            att.url?.match(/\.(jpeg|jpg|gif|png|webp|svg)$/i);

                          if (isImage) {
                            return (
                              <div
                                key={att.url || att.name}
                                onClick={() =>
                                  setActiveViewerFile({
                                    name: att.name,
                                    url: fileUrl,
                                    type: att.type,
                                    size: att.size,
                                  })
                                }
                                className="max-w-md max-h-72 rounded-xl overflow-hidden border border-[var(--border-subtle)] hover:border-[#DC2626]/50 cursor-pointer group/img transition-all bg-black/5 shadow-sm relative"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={fileUrl}
                                  alt={att.name}
                                  className="w-full h-full object-cover group-hover/img:scale-102 transition-transform duration-200"
                                />
                                <div className="absolute top-2 right-2 px-2 py-1 rounded-md bg-black/70 backdrop-blur-md text-white opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center gap-1 text-[11px]">
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>View</span>
                                </div>
                              </div>
                            );
                          }

                          // High-Fidelity Document Card
                          const docInfo = getDocTypeInfo(att.name, att.type);

                          return (
                            <div
                              key={att.url || att.name}
                              onClick={() =>
                                setActiveViewerFile({
                                  name: att.name,
                                  url: fileUrl,
                                  type: att.type,
                                  size: att.size,
                                })
                              }
                              className="flex items-center gap-3 p-3 rounded-2xl bg-[var(--bg-surface-1)] hover:bg-[var(--bg-surface-2)] border border-[var(--border-subtle)] hover:border-[#DC2626]/40 transition-all max-w-sm group/doc shadow-sm cursor-pointer"
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
                                    className="text-xs font-semibold text-[var(--text-primary)] truncate max-w-[170px]"
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
                                <div className="text-[10px] text-[var(--text-muted)] flex items-center gap-1.5 mt-0.5">
                                  <span>{storageClient.formatBytes(att.size)}</span>
                                  <span>•</span>
                                  <span>{docInfo.label}</span>
                                </div>
                              </div>

                              <div
                                className="flex items-center gap-1 shrink-0"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  onClick={() =>
                                    setActiveViewerFile({
                                      name: att.name,
                                      url: fileUrl,
                                      type: att.type,
                                      size: att.size,
                                    })
                                  }
                                  title="View Document (Read-Only)"
                                  className="p-1.5 rounded-lg hover:bg-red-500/10 text-[var(--text-secondary)] hover:text-[#DC2626] transition-colors"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                <a
                                  href={fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="Open in new tab"
                                  className="p-1.5 rounded-lg hover:bg-black/5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                                <a
                                  href={fileUrl}
                                  download={att.name}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="Download Document"
                                  className="p-1.5 rounded-lg hover:bg-black/5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
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

                  {/* Reaction & Action Hover Bar */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 mt-1 bg-[var(--bg-surface-0)] px-2 py-0.5 rounded-xl border border-[var(--border-subtle)] shadow-sm">
                    {/* Reply Quote Button */}
                    <button
                      type="button"
                      onClick={() => setReplyingTo(msg)}
                      className="p-1 rounded-md text-[var(--text-muted)] hover:text-emerald-600 hover:bg-black/5 hover:scale-125 transition-all cursor-pointer"
                      title="Reply quote"
                    >
                      <CornerUpLeft className="w-3.5 h-3.5" />
                    </button>

                    {/* Reply in Thread Button */}
                    <button
                      type="button"
                      onClick={() => setActiveThreadRoot(msg)}
                      className="p-1 rounded-md text-[var(--text-muted)] hover:text-red-600 hover:bg-black/5 hover:scale-125 transition-all cursor-pointer"
                      title="Reply in thread"
                    >
                      <MessageSquareReply className="w-3.5 h-3.5" />
                    </button>

                    <div className="w-px h-3.5 bg-[var(--border-subtle)] mx-0.5" />

                    {EMOJI_OPTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => addReaction(activeConv.id, msg.id, emoji)}
                        className="p-1 rounded-md hover:bg-black/5 hover:scale-125 transition-transform cursor-pointer"
                        title={emoji}
                      >
                        <GraphicalReaction name={emoji} size="sm" />
                      </button>
                    ))}
                  </div>

                  {/* Slack-style Thread Footer Button */}
                  {msg.threadMeta && msg.threadMeta.replyCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setActiveThreadRoot(msg)}
                      className="mt-1.5 inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-[var(--bg-surface-2)] hover:bg-[var(--bg-surface-1)] border border-[var(--border-subtle)] hover:border-red-400 transition-all text-xs group/thread shadow-sm cursor-pointer select-none"
                    >
                      {msg.threadMeta.participantAvatars && msg.threadMeta.participantAvatars.length > 0 && (
                        <div className="flex items-center -space-x-1.5 overflow-hidden">
                          {msg.threadMeta.participantAvatars.slice(0, 3).map((av, avIdx) => (
                            <Avatar
                              key={avIdx}
                              src={av || undefined}
                              fallbackText="U"
                              className="w-4 h-4 rounded-md ring-1 ring-white dark:ring-black"
                            />
                          ))}
                        </div>
                      )}
                      <span className="font-bold text-red-600 dark:text-red-400 group-hover/thread:underline">
                        {msg.threadMeta.replyCount} {msg.threadMeta.replyCount === 1 ? 'reply' : 'replies'}
                      </span>
                      {msg.threadMeta.lastReplyAt && (
                        <span className="text-[10px] text-[var(--text-muted)] font-mono">
                          Last reply{' '}
                          {new Date(msg.threadMeta.lastReplyAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      )}
                      <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover/thread:translate-x-0.5 transition-transform" />
                    </button>
                  )}

                  {/* Reaction Badges List if present on direct message */}
                  {(msg as any).reactions && Object.keys((msg as any).reactions).length > 0 && (
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      {Object.entries((msg as any).reactions as Record<string, number>).map(([emoji, count]) => (
                        <button
                          key={emoji}
                          onClick={() => addReaction(activeConv.id, msg.id, emoji)}
                          className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white border border-[var(--border-subtle)] shadow-xs hover:border-red-400 hover:scale-105 transition-all cursor-pointer"
                        >
                          <GraphicalReaction name={emoji} size="xs" />
                          <span className="text-[10px] font-mono text-[var(--text-muted)] font-bold">{count}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing Indicator */}
      {currentTyping.length > 0 && (
        <div className="px-6 py-1 text-[11px] text-[#DC2626] font-medium flex items-center gap-2">
          <span className="flex gap-1 items-center">
            <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626] animate-bounce" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626] animate-bounce [animation-delay:0.2s]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626] animate-bounce [animation-delay:0.4s]" />
          </span>
          <span>{currentTyping.join(', ')} is typing...</span>
        </div>
      )}

      {/* Uploading Status Banner */}
      {isUploading && (
        <div className="px-6 py-2 bg-red-600/10 border-t border-red-500/20 text-xs text-[#DC2626] flex items-center gap-2 animate-pulse">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#DC2626]" />
          <span>{uploadStatus || 'Uploading file...'}</span>
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
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/30 text-[var(--text-primary)] text-xs shadow-sm"
              >
                <div className={`p-1 rounded-lg border ${docInfo.color}`}>
                  <FileText className="w-3 h-3" />
                </div>
                <span className="max-w-[140px] truncate font-semibold">{att.name}</span>
                <span className="text-[10px] text-[var(--text-muted)]">({storageClient.formatBytes(att.size)})</span>
                <button
                  type="button"
                  onClick={() =>
                    setActiveViewerFile({
                      name: att.name,
                      url: att.url,
                      type: att.type,
                      size: att.size,
                    })
                  }
                  className="text-[#DC2626] hover:text-[#991B1B] p-0.5 rounded transition-colors"
                  title="Preview document"
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setPendingAttachments((prev) => prev.filter((p) => p.url !== att.url))}
                  className="text-[var(--text-muted)] hover:text-rose-600 p-0.5 rounded transition-colors"
                  title="Remove attachment"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Input Box Footer */}
      <footer className="p-2 sm:p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-surface-0)]/90 backdrop-blur-md">
        {/* WhatsApp-Style Quote Reply Preview Banner */}
        {replyingTo && (
          <div className="flex items-center justify-between p-2.5 px-3.5 mb-2.5 rounded-2xl bg-[var(--bg-surface-2)] border-l-4 border-emerald-500 shadow-sm border border-[var(--border-subtle)] border-l-emerald-500 animate-slide-down">
            <div className="flex items-center gap-2.5 min-w-0">
              <CornerUpLeft className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div className="min-w-0 text-xs">
                <p className="font-bold text-emerald-600 dark:text-emerald-400 truncate flex items-center gap-1.5">
                  <span>Replying to</span>
                  <span className="text-[var(--text-primary)] dark:text-white">
                    {replyingTo.sender?.displayName || replyingTo.sender?.username || 'User'}
                  </span>
                </p>
                <p className="text-[var(--text-muted)] truncate max-w-lg mt-0.5">
                  {replyingTo.content || (replyingTo.attachments?.length ? 'Shared an attachment' : 'Message')}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setReplyingTo(null)}
              className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer shrink-0 ml-2"
              title="Cancel reply (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {isGuest ? (
          <div className="flex flex-col sm:flex-row items-center justify-between p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 gap-3">
            <div className="flex items-center gap-2.5 text-xs text-amber-800 font-medium">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-600 shrink-0">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-[var(--text-primary)]">Guest Account Restriction</div>
                <div className="text-[11px] text-[var(--text-muted)]">
                  Guest accounts cannot message others or make calls. Create a free account to unlock full messaging.
                </div>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => setUpgradeModalOpen(true)}
              className="bg-gradient-to-r from-[#DC2626] to-[#B91C1C] text-white shrink-0 text-xs px-3.5 shadow-md"
            >
              Upgrade Account
            </Button>
          </div>
        ) : (
        <form onSubmit={handleSendMessage} className="flex items-center gap-1.5 sm:gap-2">
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
            className="p-2 sm:p-2.5 rounded-xl bg-[var(--bg-surface-1)] hover:bg-[var(--bg-surface-2)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer shadow-xs flex-shrink-0"
            title="Send Document (PDF, Word, Excel, Zip...)"
          >
            <FilePlus className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#DC2626]" />
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
            className="p-2 sm:p-2.5 rounded-xl bg-[var(--bg-surface-1)] hover:bg-[var(--bg-surface-2)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer shadow-xs flex-shrink-0"
            title="Attach Image or Video"
          >
            <ImageIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#D97706]" />
          </button>

          {/* Instant Google Meet & Teams Button */}
          <button
            type="button"
            onClick={() => setIsMeetingHubOpen(true)}
            className="p-2 sm:p-2.5 rounded-xl bg-[var(--bg-surface-1)] hover:bg-[var(--bg-surface-2)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer shadow-xs group relative flex-shrink-0"
            title="Start Google Meet or Microsoft Teams session"
          >
            <Video className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#059669] group-hover:scale-110 transition-transform" />
          </button>

          {/* Quick Emoji Trigger */}
          <div className="relative flex-shrink-0">
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-2 sm:p-2.5 rounded-xl bg-[var(--bg-surface-1)] hover:bg-[var(--bg-surface-2)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer shadow-xs"
              title="Add emoji"
            >
              <Smile className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#DC2626]" />
            </button>
            {showEmojiPicker && (
              <div className="absolute bottom-12 left-0 sm:left-auto p-2 rounded-2xl bg-[var(--bg-surface-1)] border border-[var(--border-subtle)] shadow-xl flex gap-1.5 z-20 max-w-[90vw] overflow-x-auto">
                {EMOJI_OPTIONS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => {
                      setInputContent((prev) => `${prev}:${e}: `);
                      setShowEmojiPicker(false);
                    }}
                    className="p-1.5 hover:bg-black/5 rounded-xl hover:scale-125 transition-all cursor-pointer flex items-center justify-center"
                    title={e}
                  >
                    <GraphicalReaction name={e} size="sm" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Message Input */}
          <input
            ref={messageInputRef}
            type="text"
            placeholder={`Message ${title}...`}
            value={inputContent}
            onChange={handleInputChange}
            className="min-w-0 flex-1 bg-[var(--bg-surface-0)] border border-[var(--border-subtle)] rounded-xl px-2.5 sm:px-4 py-2 sm:py-2.5 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626]/20 transition-all shadow-xs"
          />

          {/* Send Button */}
          <Button
            type="submit"
            size="sm"
            disabled={(!inputContent.trim() && pendingAttachments.length === 0) || isUploading}
            className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-[#DC2626] to-[#B91C1C] hover:from-[#EF4444] hover:to-[#DC2626] text-white shadow-md shadow-red-600/30 cursor-pointer flex-shrink-0"
          >
            <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </Button>
        </form>
        )}
      </footer>

      {/* Universal Read-Only File Viewer Modal */}
      <UniversalFileViewerModal
        file={activeViewerFile}
        isOpen={!!activeViewerFile}
        onClose={() => setActiveViewerFile(null)}
      />

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

      {/* Slack-style Thread Sidebar Drawer */}
      {activeThreadRoot && activeConv && (
        <ThreadSidebar
          conversationId={activeConv.id}
          conversationTitle={title}
          rootMessage={activeThreadRoot}
          onClose={() => setActiveThreadRoot(null)}
          onScrollToMessage={handleJumpToMessage}
          onReplyAdded={(reply) => {
            if (reply.isThreadBroadcast) {
              useConversationStore.getState().addDirectMessage(reply as DirectMessageDTO);
            }
          }}
        />
      )}
    </div>
  );
};
