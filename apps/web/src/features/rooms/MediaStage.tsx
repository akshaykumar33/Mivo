'use client';

import * as React from 'react';
import { RoomMemberDTO, RoomCommunicationMode, RoomDTO, REALTIME_EVENTS } from '@mivo/shared';
import { Avatar } from '@mivo/ui';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  Radio,
  Activity,
  Volume2,
  Pin,
  PinOff,
  LayoutGrid,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Users,
  Bot,
  Headphones,
  Ticket,
  CheckCircle2,
} from 'lucide-react';
import { ChatStream } from '../chat/ChatStream';
import { LiveVideoTile } from './LiveVideoTile';
import { AiCoHostStageTile, AiCoHostStatus } from './AiCoHostStageTile';
import { AiPinnedDataTile, PinnedDataTilePayload } from './AiPinnedDataTile';
import { LiveFactCheckHUD, FactCheckAlertData } from './LiveFactCheckHUD';
import { spatialAudio } from '../audio/SpatialAudioEngine';
import { VoiceTicketConfirmationCard, VoiceTicketProposal } from '../tickets/VoiceTicketConfirmationCard';
import { useTicketStore } from '@/stores/ticketStore';
import { api } from '@/lib/api-client';
import { realtime } from '@/lib/socket-client';

export interface MediaStageProps {
  mode: RoomCommunicationMode;
  participants: RoomMemberDTO[];
  room?: RoomDTO;
  currentUserId?: string;
  isHost?: boolean;
  isMuted: boolean;
  isCameraOn: boolean;
  isScreenOn: boolean;
  localStream?: MediaStream | null;
  screenStream?: MediaStream | null;
  remoteStreams?: Record<string, MediaStream>;
  audioLevel?: number;
}

export const MediaStage: React.FC<MediaStageProps> = ({
  mode,
  participants,
  room,
  currentUserId,
  isHost = false,
  isMuted,
  isCameraOn,
  isScreenOn,
  localStream,
  screenStream,
  remoteStreams = {},
  audioLevel = 0,
}) => {
  const screenVideoRef = React.useRef<HTMLVideoElement>(null);
  const [pinnedUserId, setPinnedUserId] = React.useState<string | null>(null);
  const [orderedParticipantIds, setOrderedParticipantIds] = React.useState<string[]>([]);
  const [draggedId, setDraggedId] = React.useState<string | null>(null);
  const [isAttendeeDrawerOpen, setIsAttendeeDrawerOpen] = React.useState(true);

  // Active AI Stage Co-Host & Real-Time Duplex Voice Agent
  const [isCoHostEnabled, setIsCoHostEnabled] = React.useState(true);
  const [coHostStatus, setCoHostStatus] = React.useState<AiCoHostStatus>('LISTENING');
  const [lastSpeechText, setLastSpeechText] = React.useState('');
  const [pinnedDataTile, setPinnedDataTile] = React.useState<PinnedDataTilePayload | null>(null);
  const [factCheckAlert, setFactCheckAlert] = React.useState<FactCheckAlertData | null>(null);
  const { setIsModalOpen: openTicketsModal } = useTicketStore();

  // 🎧 3D Spatial Audio & Dynamic Physics Grid
  const [isSpatialAudioActive, setIsSpatialAudioActive] = React.useState(true);
  const [spatialPositions, setSpatialPositions] = React.useState<Record<string, { pan: number; distance: number }>>({});

  // ⚡ Spoken Voice-to-Ticket Automation
  const [voiceTicketProposal, setVoiceTicketProposal] = React.useState<VoiceTicketProposal | null>(null);
  const [ticketToast, setTicketToast] = React.useState<string | null>(null);

  // Speech synthesis for AI Co-Host Duplex Voice
  const speakVerbalResponse = React.useCallback((text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      const voices = window.speechSynthesis.getVoices();
      const naturalVoice = voices.find(
        (v) =>
          v.lang.startsWith('en') &&
          (v.name.includes('Natural') ||
            v.name.includes('Google') ||
            v.name.includes('Neural') ||
            v.name.includes('Samantha') ||
            v.name.includes('David'))
      );
      if (naturalVoice) utterance.voice = naturalVoice;

      utterance.onstart = () => setCoHostStatus('SPEAKING');
      utterance.onend = () => setCoHostStatus('LISTENING');
      utterance.onerror = () => setCoHostStatus('LISTENING');

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis error:', e);
      setCoHostStatus('LISTENING');
    }
  }, []);

  // Trigger Co-Host command via Socket.io with fallback to REST
  const handleTriggerCoHost = React.useCallback(
    async (query: string) => {
      setCoHostStatus('THINKING');
      const userKey = localStorage.getItem('mivo_gemini_api_key') || undefined;

      const socket = realtime.getSocket();
      if (socket && room?.id) {
        socket.emit(REALTIME_EVENTS.ROOM_AI_AGENT_ACTION, {
          roomId: room.id,
          query,
          roomName: room.name,
          attendees: participants.map((p) => p.user.displayName || p.user.username),
          communityId: room.channelId,
        });
      } else {
        try {
          const res = await api.post<any>('/api/v1/ai/stage-agent', {
            query,
            roomName: room?.name || 'Stage',
            attendees: participants.map((p) => p.user.displayName || p.user.username),
            apiKey: userKey,
          });

          if (res.success && res.data) {
            setLastSpeechText(res.data.speechText);
            if (res.data.speechText) speakVerbalResponse(res.data.speechText);
            if (res.data.shouldPinTile && res.data.pinnedTile) {
              setPinnedDataTile(res.data.pinnedTile);
            }
            if (res.data.factCheckAlert) {
              setFactCheckAlert(res.data.factCheckAlert);
            }
          }
        } catch (e) {
          console.error('Co-Host API call failed:', e);
          setCoHostStatus('LISTENING');
        }
      }
    },
    [room, participants, speakVerbalResponse]
  );

  // Background fact-check audit trigger
  const handleFactCheckAudit = React.useCallback(
    async (statement: string, speakerName?: string) => {
      const userKey = localStorage.getItem('mivo_gemini_api_key') || undefined;
      try {
        const res = await api.post<any>('/api/v1/ai/fact-check', {
          transcriptText: statement,
          speaker: speakerName || 'Speaker',
          apiKey: userKey,
        });
        if (res.success && res.data && res.data.hasConflict) {
          setFactCheckAlert(res.data);
          const socket = realtime.getSocket();
          if (socket && room?.id) {
            socket.emit(REALTIME_EVENTS.ROOM_AI_FACT_CHECK, {
              roomId: room.id,
              alert: res.data,
            });
          }
        }
      } catch {}
    },
    [room?.id]
  );

  // ⚡ Spoken Voice-to-Ticket Extraction
  const handleExtractVoiceTicket = React.useCallback(
    async (snippet: string) => {
      const userKey = localStorage.getItem('mivo_gemini_api_key') || undefined;
      try {
        const res = await api.post<any>('/api/v1/ai/extract-ticket', {
          transcriptSnippet: snippet,
          attendees: participants.map((p) => p.user.displayName || p.user.username),
          apiKey: userKey,
        });

        if (res.success && res.data?.ticketProposal) {
          const prop = res.data.ticketProposal;
          setVoiceTicketProposal({
            title: prop.title,
            description: prop.description,
            priority: prop.priority,
            category: prop.category,
            suggestedAssignee: prop.suggestedAssignee,
            communityId: room?.channelId,
            speakerName: 'Stage Attendee',
          });
        }
      } catch (err) {
        console.warn('Voice ticket extraction error:', err);
      }
    },
    [participants, room]
  );

  const handleConfirmVoiceTicket = React.useCallback(
    (ticket: any) => {
      setVoiceTicketProposal(null);
      setTicketToast(`Ticket created: "${ticket.title}" (${ticket.priority || 'HIGH'} priority)`);
      speakVerbalResponse(`Created ticket for ${ticket.title}. Added to sprint board.`);
      setTimeout(() => setTicketToast(null), 6000);
    },
    [speakVerbalResponse]
  );

  // Real-time socket sync for Co-Host and Fact Check events
  React.useEffect(() => {
    const socket = realtime.getSocket();
    if (!socket || !room?.id) return;

    const handleAgentResponse = (data: any) => {
      if (data.roomId !== room.id) return;
      if (data.status) setCoHostStatus(data.status);
      if (data.speechText) {
        setLastSpeechText(data.speechText);
        speakVerbalResponse(data.speechText);
      }
      if (data.pinnedTile) setPinnedDataTile(data.pinnedTile);
      if (data.factCheckAlert) setFactCheckAlert(data.factCheckAlert);
    };

    const handlePinTile = (data: any) => {
      if (data.roomId !== room.id) return;
      setPinnedDataTile(data.pinnedTile);
    };

    const handleDismissTile = (data: any) => {
      if (data.roomId !== room.id) return;
      setPinnedDataTile(null);
    };

    const handleFactCheck = (data: any) => {
      if (data.roomId !== room.id) return;
      setFactCheckAlert(data.alert);
    };

    socket.on(REALTIME_EVENTS.ROOM_AI_AGENT_RESPONSE, handleAgentResponse);
    socket.on(REALTIME_EVENTS.ROOM_AI_PIN_TILE, handlePinTile);
    socket.on(REALTIME_EVENTS.ROOM_AI_DISMISS_TILE, handleDismissTile);
    socket.on(REALTIME_EVENTS.ROOM_AI_FACT_CHECK, handleFactCheck);

    return () => {
      socket.off(REALTIME_EVENTS.ROOM_AI_AGENT_RESPONSE, handleAgentResponse);
      socket.off(REALTIME_EVENTS.ROOM_AI_PIN_TILE, handlePinTile);
      socket.off(REALTIME_EVENTS.ROOM_AI_DISMISS_TILE, handleDismissTile);
      socket.off(REALTIME_EVENTS.ROOM_AI_FACT_CHECK, handleFactCheck);
    };
  }, [room?.id, speakVerbalResponse]);

  // Ambient speech recognition for "@mivo" or "Mivo, ..." voice commands
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      const current = event.resultIndex;
      const text = event.results[current][0]?.transcript?.trim();
      if (!text) return;

      const lower = text.toLowerCase();
      // ⚡ Spoken Voice-to-Ticket trigger
      if (
        lower.includes('ticket') ||
        lower.includes('file a ticket') ||
        lower.includes('create a ticket') ||
        lower.includes('action item') ||
        lower.includes('fix the')
      ) {
        handleExtractVoiceTicket(text);
      } else if (lower.startsWith('mivo') || lower.includes('@mivo') || lower.includes('hey mivo')) {
        // Duplex voice trigger: "Mivo, ..." or "@mivo" or "Hey Mivo"
        handleTriggerCoHost(text);
      } else if (
        lower.includes('no bugs') ||
        lower.includes('no blockers') ||
        lower.includes('we are done') ||
        lower.includes('redis leak')
      ) {
        handleFactCheckAudit(text, 'Attendee');
      }
    };

    try {
      recognition.start();
    } catch {}

    return () => {
      try {
        recognition.stop();
      } catch {}
    };
  }, [handleTriggerCoHost, handleFactCheckAudit, handleExtractVoiceTicket]);

  // Sync participant list to ordered array
  React.useEffect(() => {
    setOrderedParticipantIds((prev) => {
      const incomingIds = participants.map((p) => p.userId);
      const existing = prev.filter((id) => incomingIds.includes(id));
      const added = incomingIds.filter((id) => !existing.includes(id));
      return [...existing, ...added];
    });
  }, [participants]);

  React.useEffect(() => {
    if (screenVideoRef.current) {
      if (screenStream) {
        screenVideoRef.current.srcObject = screenStream;
        screenVideoRef.current.play().catch((e) => console.log('Screen play interrupted:', e));
      } else {
        screenVideoRef.current.srcObject = null;
      }
    }
  }, [screenStream]);

  // Host Action Handler
  const handleHostAction = (action: 'MUTE' | 'KICK' | 'TRANSFER_HOST', targetUserId: string) => {
    if (!room) return;
    const socket = realtime.getSocket();
    if (socket) {
      socket.emit(REALTIME_EVENTS.ROOM_HOST_ACTION, {
        roomId: room.id,
        action,
        targetUserId,
      });
    }
  };

  // Reset to auto-arranged speaker grid
  const handleAutoArrange = () => {
    setPinnedUserId(null);
    setOrderedParticipantIds(participants.map((p) => p.userId));
  };

  // Drag & Drop Reordering handlers
  const handleDragStart = (userId: string) => (e: React.DragEvent) => {
    setDraggedId(userId);
    e.dataTransfer.setData('text/plain', userId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (targetUserId: string) => (e: React.DragEvent) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('text/plain') || draggedId;
    if (!sourceId || sourceId === targetUserId) return;

    setOrderedParticipantIds((prev) => {
      const currentList = prev.length === participants.length ? [...prev] : participants.map((p) => p.userId);
      const fromIndex = currentList.indexOf(sourceId);
      const toIndex = currentList.indexOf(targetUserId);
      if (fromIndex !== -1 && toIndex !== -1) {
        currentList.splice(fromIndex, 1);
        currentList.splice(toIndex, 0, sourceId);
      }
      return [...currentList];
    });
    setDraggedId(null);
  };

  const handleMoveTile = (userId: string, direction: 'left' | 'right') => {
    setOrderedParticipantIds((prev) => {
      const currentList = prev.length === participants.length ? [...prev] : participants.map((p) => p.userId);
      const fromIndex = currentList.indexOf(userId);
      if (fromIndex === -1) return currentList;
      const toIndex = direction === 'left' ? fromIndex - 1 : fromIndex + 1;
      if (toIndex < 0 || toIndex >= currentList.length) return currentList;

      const item = currentList.splice(fromIndex, 1)[0];
      currentList.splice(toIndex, 0, item);
      return [...currentList];
    });
  };

  // Sort participants by current drag order
  const sortedParticipants = React.useMemo(() => {
    return [...participants].sort((a, b) => {
      const indexA = orderedParticipantIds.indexOf(a.userId);
      const indexB = orderedParticipantIds.indexOf(b.userId);
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
  }, [participants, orderedParticipantIds]);

  const pinnedParticipant = participants.find((p) => p.userId === pinnedUserId);

  // Connect incoming WebRTC remoteStreams to Spatial Audio Engine
  React.useEffect(() => {
    if (!isSpatialAudioActive) return;
    Object.entries(remoteStreams).forEach(([userId, stream]) => {
      if (stream) spatialAudio.attachStream(userId, stream);
    });
  }, [remoteStreams, isSpatialAudioActive]);

  // Update spatial positions when sorted participants change
  React.useEffect(() => {
    const total = sortedParticipants.length;
    if (total === 0) return;

    const newPositions: Record<string, { pan: number; distance: number }> = {};
    sortedParticipants.forEach((p, index) => {
      // Normalized X from -1.0 (Left) to +1.0 (Right) based on position in grid
      const normalizedX = total > 1 ? (index / (total - 1)) * 2 - 1 : 0;
      const pos = spatialAudio.updatePosition(p.userId, normalizedX, 0);
      newPositions[p.userId] = pos;
    });

    setSpatialPositions(newPositions);
  }, [sortedParticipants, isSpatialAudioActive]);

  // TEXT MODE: Real-Time Chat Stream
  if (mode === 'TEXT') {
    if (!room) {
      return (
        <div className="flex-1 flex items-center justify-center bg-[#0E1017]">
          <div className="w-8 h-8 border-3 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      );
    }

    return <ChatStream room={room} />;
  }

  // VOICE MODE: Real Spatial Voice Huddle Stage with Dynamic Audio Levels
  if (mode === 'VOICE') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-3 sm:p-8 pb-28 sm:pb-28 bg-[var(--bg-canvas)] select-none relative overflow-hidden">
        {/* Subtle Ambient Glow */}
        <div className="absolute inset-0 bg-radial from-violet-600/10 via-transparent to-transparent pointer-events-none" />

        <div className="mb-6 sm:mb-8 text-center z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold mb-3 shadow-lg shadow-emerald-500/10">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Spatial Voice Huddle Active</span>
          </div>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <h3 className="text-xl font-bold text-[var(--text-primary)] font-display">
              {participants.length} {participants.length === 1 ? 'Speaker' : 'Speakers'} in Stage
            </h3>
            <button
              onClick={handleAutoArrange}
              className="flex items-center gap-1 text-[11px] font-bold text-violet-400 hover:text-violet-300 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06] transition-colors"
              title="Auto-Arrange Speaker Order"
            >
              <LayoutGrid className="w-3 h-3" />
              <span>Auto-Arrange</span>
            </button>
            <button
              onClick={() => {
                const next = !isSpatialAudioActive;
                setIsSpatialAudioActive(next);
                spatialAudio.setEnabled(next);
              }}
              className={`flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-xl border transition-all cursor-pointer shadow-md ${
                isSpatialAudioActive
                  ? 'bg-emerald-600/25 border-emerald-500/40 text-emerald-300'
                  : 'bg-white/[0.04] border-white/[0.08] text-zinc-400'
              }`}
              title="Toggle 3D Positional Stereo Spatial Audio"
            >
              <Headphones className="w-3.5 h-3.5 text-emerald-400" />
              <span>3D Spatial: {isSpatialAudioActive ? 'ON' : 'OFF'}</span>
            </button>
            <button
              onClick={() =>
                handleTriggerCoHost(
                  'Mivo, pull up our last 3 sprint tickets and summarize blockers on screen.'
                )
              }
              className="flex items-center gap-1.5 text-[11px] font-extrabold text-cyan-300 hover:text-cyan-200 px-3 py-1 rounded-xl bg-violet-600/30 border border-violet-500/40 hover:bg-violet-600/50 transition-all shadow-md cursor-pointer"
              title="Trigger Mivo AI Stage Co-Host"
            >
              <Bot className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span>@mivo Sprint Blockers</span>
            </button>
            <button
              onClick={() =>
                handleExtractVoiceTicket(
                  "Sarah, let's file a high priority ticket to optimize the Redis pub/sub adapter by Friday"
                )
              }
              className="flex items-center gap-1.5 text-[11px] font-extrabold text-amber-300 hover:text-amber-200 px-3 py-1 rounded-xl bg-amber-600/25 border border-amber-500/40 hover:bg-amber-600/40 transition-all shadow-md cursor-pointer"
              title="Simulate Voice-to-Ticket Detection"
            >
              <Ticket className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>Voice-to-Ticket Demo</span>
            </button>
          </div>
        </div>

        {/* Success Toast */}
        {ticketToast && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-emerald-950/90 border border-emerald-500/50 text-emerald-200 text-xs font-bold shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{ticketToast}</span>
          </div>
        )}

        {/* Spoken Voice-to-Ticket Interactive Confirmation Card */}
        {voiceTicketProposal && (
          <div className="w-full max-w-xl mb-6 z-30">
            <VoiceTicketConfirmationCard
              proposal={voiceTicketProposal}
              roomId={room?.id}
              onConfirm={handleConfirmVoiceTicket}
              onDismiss={() => setVoiceTicketProposal(null)}
            />
          </div>
        )}

        {/* Pinned Sprint Data Tile (if triggered) */}
        {pinnedDataTile && (
          <div className="w-full max-w-4xl mb-6 z-20">
            <AiPinnedDataTile
              payload={pinnedDataTile}
              onDismiss={() => {
                setPinnedDataTile(null);
                const socket = realtime.getSocket();
                if (socket && room?.id) {
                  socket.emit(REALTIME_EVENTS.ROOM_AI_DISMISS_TILE, { roomId: room.id });
                }
              }}
              onOpenTicketsModal={() => openTicketsModal(true)}
            />
          </div>
        )}

        <div className="w-full max-w-4xl grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 sm:gap-8 place-items-center z-10">
          {/* Active AI Stage Co-Host */}
          {isCoHostEnabled && (
            <div className="w-40 sm:w-44 aspect-video flex-shrink-0">
              <AiCoHostStageTile
                status={coHostStatus}
                lastSpeechText={lastSpeechText}
                onTriggerCommand={handleTriggerCoHost}
              />
            </div>
          )}
          {sortedParticipants.map((p) => {
            const isMe = p.userId === currentUserId;
            const participantMuted = isMe ? isMuted : p.isMuted;
            const isSpeaking = !participantMuted && (isMe ? audioLevel > 5 : true);

            return (
              <div
                key={p.id}
                draggable
                onDragStart={handleDragStart(p.userId)}
                onDragOver={handleDragOver}
                onDrop={handleDrop(p.userId)}
                className={`relative flex flex-col items-center p-4 sm:p-5 rounded-3xl bg-[var(--bg-surface-1)] border transition-all duration-200 group w-40 sm:w-44 shadow-lg cursor-grab active:cursor-grabbing ${
                  isSpeaking
                    ? 'border-emerald-500 shadow-emerald-500/20 ring-2 ring-emerald-500/30'
                    : 'border-[var(--border-subtle)] hover:border-violet-500/30'
                }`}
              >
                {/* Voice Card Reorder Arrows */}
                <div className="absolute top-2 left-2 right-2 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity z-20">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMoveTile(p.userId, 'left');
                    }}
                    className="p-1 rounded-lg bg-black/60 hover:bg-white/[0.15] text-white/60 hover:text-white transition-all cursor-pointer"
                    title="Move Left"
                  >
                    <ChevronLeft className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMoveTile(p.userId, 'right');
                    }}
                    className="p-1 rounded-lg bg-black/60 hover:bg-white/[0.15] text-white/60 hover:text-white transition-all cursor-pointer"
                    title="Move Right"
                  >
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>

                <div className="relative">
                  <Avatar
                    size="xl"
                    src={p.user.avatarUrl}
                    fallbackText={p.user.displayName || p.user.username}
                    status={p.user.status}
                    isSpeaking={isSpeaking}
                  />

                  {/* Mic Mute Indicator Bubble */}
                  <div
                    className={`absolute -bottom-1 -right-1 p-1.5 rounded-full text-white shadow-lg transition-all ${
                      participantMuted ? 'bg-rose-600 ring-2 ring-[var(--bg-canvas)]' : 'bg-emerald-600 ring-2 ring-[var(--bg-canvas)]'
                    }`}
                  >
                    {participantMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                  </div>
                </div>

                <div className="mt-3.5 text-center w-full">
                  <div className="text-xs font-bold text-[var(--text-primary)] truncate">
                    {p.user.displayName || p.user.username}
                    {isMe && ' (You)'}
                  </div>

                  {/* Dynamic Soundwave animation driven by audioLevel */}
                  {!participantMuted ? (
                    <div className="flex items-center justify-center gap-1 mt-2 h-3.5">
                      <span
                        className="w-0.5 bg-emerald-400 rounded-full transition-all duration-75"
                        style={{ height: isMe ? `${Math.max(4, (audioLevel / 100) * 14)}px` : '10px' }}
                      />
                      <span
                        className="w-0.5 bg-emerald-400 rounded-full transition-all duration-75"
                        style={{ height: isMe ? `${Math.max(6, (audioLevel / 100) * 18)}px` : '14px' }}
                      />
                      <span
                        className="w-0.5 bg-emerald-400 rounded-full transition-all duration-75"
                        style={{ height: isMe ? `${Math.max(4, (audioLevel / 100) * 12)}px` : '8px' }}
                      />
                      <span
                        className="w-0.5 bg-emerald-400 rounded-full transition-all duration-75"
                        style={{ height: isMe ? `${Math.max(5, (audioLevel / 100) * 16)}px` : '12px' }}
                      />
                    </div>
                  ) : (
                    <span className="text-[10px] text-[var(--text-muted)] font-semibold block mt-1">Muted</span>
                  )}

                  {isSpatialAudioActive && spatialPositions[p.userId] && (
                    <span
                      className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-black/60 border border-white/10 text-emerald-400 shadow-sm inline-block mt-1.5"
                      title="3D Spatial Audio Pan"
                    >
                      🎧 {spatialAudio.formatPanLabel(spatialPositions[p.userId].pan)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // VIDEO MODE: Grid with Drag & Drop, Host Moderation & Spotlight Pinning
  if (mode === 'VIDEO') {
    return (
      <div className="flex-1 p-2 sm:p-6 pb-28 bg-[var(--bg-canvas)] select-none flex flex-col overflow-hidden relative">
        <LiveFactCheckHUD
          alert={factCheckAlert}
          onDismiss={() => setFactCheckAlert(null)}
          onClarifyOnStage={(stmt, truth) => {
            handleTriggerCoHost(
              `Mivo, please clarify this statement on stage: "${stmt}" - what does our database show?`
            );
            setFactCheckAlert(null);
          }}
        />

        {pinnedDataTile ? (
          // Spotlight Mode: Dominant Pinned AI Data Tile + Attendee Strip
          <div className="flex-1 flex flex-col gap-4 overflow-hidden">
            <div className="flex-1 flex items-center justify-center max-w-4xl mx-auto w-full aspect-video">
              <AiPinnedDataTile
                payload={pinnedDataTile}
                onDismiss={() => {
                  setPinnedDataTile(null);
                  const socket = realtime.getSocket();
                  if (socket && room?.id) {
                    socket.emit(REALTIME_EVENTS.ROOM_AI_DISMISS_TILE, { roomId: room.id });
                  }
                }}
                onOpenTicketsModal={() => openTicketsModal(true)}
              />
            </div>

            {/* Bottom attendee filmstrip with Co-Host */}
            <div className="h-32 flex items-center gap-3 overflow-x-auto py-1">
              {isCoHostEnabled && (
                <div className="w-48 aspect-video flex-shrink-0 flex items-center">
                  <AiCoHostStageTile
                    status={coHostStatus}
                    lastSpeechText={lastSpeechText}
                    onTriggerCommand={handleTriggerCoHost}
                  />
                </div>
              )}
              {sortedParticipants.map((p) => {
                const isMe = p.userId === currentUserId;
                return (
                  <div key={p.id} className="w-48 aspect-video flex-shrink-0 flex items-center">
                    <LiveVideoTile
                      user={p.user}
                      isMe={isMe}
                      isMuted={isMe ? isMuted : p.isMuted}
                      isCameraOn={isMe ? isCameraOn : p.isCameraOn}
                      isPinned={false}
                      onTogglePin={() => setPinnedUserId(p.userId)}
                      isHost={isHost}
                      onHostAction={handleHostAction}
                      mediaStream={isMe ? localStream : remoteStreams[p.userId]}
                      audioLevel={isMe ? audioLevel : 0}
                      spatialPanLabel={isSpatialAudioActive && spatialPositions[p.userId] ? spatialAudio.formatPanLabel(spatialPositions[p.userId].pan) : undefined}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ) : pinnedParticipant ? (
          // Spotlight Mode: Dominant Pinned Tile + Attendee Strip
          <div className="flex-1 flex flex-col gap-4 overflow-hidden">
            <div className="flex-1 flex items-center justify-center max-w-4xl mx-auto w-full aspect-video">
              <LiveVideoTile
                user={pinnedParticipant.user}
                isMe={pinnedParticipant.userId === currentUserId}
                isMuted={pinnedParticipant.userId === currentUserId ? isMuted : pinnedParticipant.isMuted}
                isCameraOn={pinnedParticipant.userId === currentUserId ? isCameraOn : pinnedParticipant.isCameraOn}
                isPinned={true}
                onTogglePin={() => setPinnedUserId(null)}
                isHost={isHost}
                onHostAction={handleHostAction}
                mediaStream={pinnedParticipant.userId === currentUserId ? localStream : remoteStreams[pinnedParticipant.userId]}
                audioLevel={pinnedParticipant.userId === currentUserId ? audioLevel : 0}
                spatialPanLabel={isSpatialAudioActive && spatialPositions[pinnedParticipant.userId] ? spatialAudio.formatPanLabel(spatialPositions[pinnedParticipant.userId].pan) : undefined}
              />
            </div>

            {/* Bottom attendee filmstrip */}
            <div className="h-32 flex items-center gap-3 overflow-x-auto py-1">
              {isCoHostEnabled && (
                <div className="w-48 aspect-video flex-shrink-0 flex items-center">
                  <AiCoHostStageTile
                    status={coHostStatus}
                    lastSpeechText={lastSpeechText}
                    onTriggerCommand={handleTriggerCoHost}
                  />
                </div>
              )}
              {sortedParticipants
                .filter((p) => p.userId !== pinnedUserId)
                .map((p) => {
                  const isMe = p.userId === currentUserId;
                  return (
                    <div key={p.id} className="w-48 aspect-video flex-shrink-0 flex items-center">
                      <LiveVideoTile
                        user={p.user}
                        isMe={isMe}
                        isMuted={isMe ? isMuted : p.isMuted}
                        isCameraOn={isMe ? isCameraOn : p.isCameraOn}
                        isPinned={false}
                        onTogglePin={() => setPinnedUserId(p.userId)}
                        isHost={isHost}
                        onHostAction={handleHostAction}
                        mediaStream={isMe ? localStream : remoteStreams[p.userId]}
                        audioLevel={isMe ? audioLevel : 0}
                        spatialPanLabel={isSpatialAudioActive && spatialPositions[p.userId] ? spatialAudio.formatPanLabel(spatialPositions[p.userId].pan) : undefined}
                      />
                    </div>
                  );
                })}
            </div>
          </div>
        ) : (
          // Standard Equal Auto-Adjusting Grid with Drag & Drop
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-3 px-1 flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--text-secondary)]">
                  Live Video Stage ({participants.length + (isCoHostEnabled ? 1 : 0)} Active)
                </span>
                <button
                  onClick={() => {
                    const next = !isSpatialAudioActive;
                    setIsSpatialAudioActive(next);
                    spatialAudio.setEnabled(next);
                  }}
                  className={`flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-xl border transition-all cursor-pointer shadow-md ${
                    isSpatialAudioActive
                      ? 'bg-emerald-600/25 border-emerald-500/40 text-emerald-300'
                      : 'bg-white/[0.04] border-white/[0.08] text-zinc-400'
                  }`}
                  title="Toggle 3D Positional Stereo Spatial Audio"
                >
                  <Headphones className="w-3.5 h-3.5 text-emerald-400" />
                  <span>3D Spatial: {isSpatialAudioActive ? 'ON' : 'OFF'}</span>
                </button>
                <button
                  onClick={() =>
                    handleTriggerCoHost(
                      'Mivo, pull up our last 3 sprint tickets and summarize blockers on screen.'
                    )
                  }
                  className="flex items-center gap-1.5 text-[11px] font-extrabold text-cyan-300 hover:text-cyan-200 px-3 py-1 rounded-xl bg-violet-600/30 border border-violet-500/40 hover:bg-violet-600/50 transition-all shadow-md cursor-pointer"
                  title="Trigger Mivo AI Stage Co-Host"
                >
                  <Bot className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                  <span>@mivo Sprint Blockers</span>
                </button>
                <button
                  onClick={() =>
                    handleExtractVoiceTicket(
                      "Sarah, let's file a high priority ticket to optimize the Redis pub/sub adapter by Friday"
                    )
                  }
                  className="flex items-center gap-1.5 text-[11px] font-extrabold text-amber-300 hover:text-amber-200 px-3 py-1 rounded-xl bg-amber-600/25 border border-amber-500/40 hover:bg-amber-600/40 transition-all shadow-md cursor-pointer"
                  title="Simulate Voice-to-Ticket Detection"
                >
                  <Ticket className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                  <span>Voice-to-Ticket Demo</span>
                </button>
              </div>

              <button
                onClick={handleAutoArrange}
                className="flex items-center gap-1.5 text-[11px] font-bold text-violet-400 hover:text-violet-300 px-3 py-1 rounded-xl bg-[var(--bg-surface-1)] border border-[var(--border-subtle)] hover:bg-[var(--bg-surface-2)] transition-colors"
                title="Reset to Auto-Arranged Grid"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Auto-Arrange Grid</span>
              </button>
            </div>

            {/* Voice-to-Ticket Interactive Confirmation Card */}
            {voiceTicketProposal && (
              <div className="w-full max-w-xl mx-auto mb-4 z-30">
                <VoiceTicketConfirmationCard
                  proposal={voiceTicketProposal}
                  roomId={room?.id}
                  onConfirm={handleConfirmVoiceTicket}
                  onDismiss={() => setVoiceTicketProposal(null)}
                />
              </div>
            )}

            <div
              className={`grid gap-4 sm:gap-5 h-full min-h-[340px] overflow-y-auto items-center ${
                sortedParticipants.length === 1 && !isCoHostEnabled
                  ? 'grid-cols-1 max-w-2xl mx-auto w-full my-auto'
                  : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
              }`}
            >
              {/* Co-Host Stage Tile */}
              {isCoHostEnabled && (
                <AiCoHostStageTile
                  status={coHostStatus}
                  lastSpeechText={lastSpeechText}
                  onTriggerCommand={handleTriggerCoHost}
                />
              )}

              {sortedParticipants.map((p) => {
                const isMe = p.userId === currentUserId;
                const camOn = isMe ? isCameraOn : p.isCameraOn;
                const participantMuted = isMe ? isMuted : p.isMuted;
                const participantStream = isMe ? localStream : remoteStreams[p.userId];

                return (
                  <LiveVideoTile
                    key={p.id}
                    user={p.user}
                    isMe={isMe}
                    isMuted={participantMuted}
                    isCameraOn={camOn}
                    isPinned={false}
                    onTogglePin={() => setPinnedUserId(p.userId)}
                    isHost={isHost}
                    onHostAction={handleHostAction}
                    mediaStream={participantStream}
                    audioLevel={isMe ? audioLevel : 0}
                    spatialPanLabel={isSpatialAudioActive && spatialPositions[p.userId] ? spatialAudio.formatPanLabel(spatialPositions[p.userId].pan) : undefined}
                    onDragStart={handleDragStart(p.userId)}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop(p.userId)}
                    onMoveLeft={() => handleMoveTile(p.userId, 'left')}
                    onMoveRight={() => handleMoveTile(p.userId, 'right')}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // SCREEN_SHARE or STREAM MODE: Real Display Stream Theater with Interactive Participant Video Strip
  return (
    <div className="flex-1 p-2 sm:p-6 pb-28 bg-[var(--bg-canvas)] flex flex-col select-none overflow-hidden gap-3 sm:gap-4">
      {/* Primary Dominant Screen Share Stage */}
      <div className="flex-1 rounded-3xl bg-[#0B0D14] border border-[var(--border-subtle)] relative flex items-center justify-center shadow-2xl overflow-hidden min-h-[280px]">
        {screenStream ? (
          <video
            ref={screenVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-contain rounded-3xl bg-black"
          />
        ) : (
          <div className="text-center p-8">
            <div className="inline-flex p-6 rounded-3xl bg-gradient-to-tr from-violet-600/20 to-indigo-600/20 text-violet-400 mb-5 border border-violet-500/30 shadow-2xl shadow-violet-600/20">
              {mode === 'SCREEN_SHARE' ? (
                <Monitor className="w-12 h-12 text-cyan-400" />
              ) : (
                <Radio className="w-12 h-12 animate-pulse text-rose-400" />
              )}
            </div>
            <h4 className="text-xl font-extrabold text-[var(--text-primary)] font-display">
              {mode === 'SCREEN_SHARE' ? 'Interactive Screen Broadcast' : 'Live Broadcaster Stage'}
            </h4>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-2 max-w-md mx-auto">
              Click &quot;Share Screen&quot; in the bottom dock to broadcast your window, or collaborate with attendee video feeds below.
            </p>
          </div>
        )}

        {/* Live Presentation Status Badge */}
        <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1 rounded-full bg-rose-600 text-white text-xs font-extrabold shadow-lg shadow-rose-600/40 z-10">
          <span className="w-2 h-2 rounded-full bg-white animate-ping" />
          <span>{mode === 'SCREEN_SHARE' ? 'PRESENTING' : 'LIVE ON STAGE'}</span>
        </div>

        {/* Participant Count & Quick Drawer Toggle Chip */}
        <div className="absolute top-4 right-4 flex items-center gap-1.5 z-10">
          <button
            onClick={() => setIsAttendeeDrawerOpen(!isAttendeeDrawerOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--bg-surface-0)]/90 hover:bg-[var(--bg-surface-1)] backdrop-blur-md border border-[var(--border-subtle)] text-[11px] font-bold text-[var(--text-primary)] transition-all cursor-pointer shadow-lg"
            title={isAttendeeDrawerOpen ? 'Collapse Attendee Video Drawer' : 'Expand Attendee Video Drawer'}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>{participants.length} in Meet</span>
            <span className="text-[var(--text-muted)]">•</span>
            <span className="text-violet-400 flex items-center gap-1">
              {isAttendeeDrawerOpen ? (
                <>
                  <span>Hide Videos</span>
                  <EyeOff className="w-3 h-3" />
                </>
              ) : (
                <>
                  <span>Show Videos</span>
                  <Eye className="w-3 h-3" />
                </>
              )}
            </span>
          </button>
        </div>
      </div>

      {/* Interactive Closeable / Expandable Drag & Drop Video Drawer */}
      {isAttendeeDrawerOpen ? (
        <div className="flex-shrink-0 flex flex-col gap-2 animate-slide-up">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-secondary)]">
                Meeting Participants ({participants.length}) • Drag or Use Controls to Reorder
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={handleAutoArrange}
                className="flex items-center gap-1 text-[10px] font-bold text-violet-400 hover:text-violet-300 px-2.5 py-1 rounded-lg bg-[var(--bg-surface-1)] border border-[var(--border-subtle)] hover:bg-[var(--bg-surface-2)] transition-colors cursor-pointer"
                title="Auto-Arrange Video Strip"
              >
                <LayoutGrid className="w-3 h-3" />
                <span>Auto-Arrange</span>
              </button>

              <button
                onClick={() => setIsAttendeeDrawerOpen(false)}
                className="flex items-center gap-1 text-[10px] font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)] px-2 py-1 rounded-lg bg-[var(--bg-surface-1)] border border-[var(--border-subtle)] hover:bg-[var(--bg-surface-2)] transition-colors cursor-pointer"
                title="Collapse Video Drawer (Full-Screen Share View)"
              >
                <ChevronDown className="w-3 h-3" />
                <span>Hide</span>
              </button>
            </div>
          </div>

          <div
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-none no-scrollbar"
          >
            {isCoHostEnabled && (
              <div className="w-56 sm:w-64 aspect-video flex-shrink-0">
                <AiCoHostStageTile
                  status={coHostStatus}
                  lastSpeechText={lastSpeechText}
                  onTriggerCommand={handleTriggerCoHost}
                />
              </div>
            )}
            {sortedParticipants.map((p) => {
              const isMe = p.userId === currentUserId;
              const camOn = isMe ? isCameraOn : p.isCameraOn;
              const participantMuted = isMe ? isMuted : p.isMuted;
              const participantStream = isMe ? localStream : remoteStreams[p.userId];

              return (
                <div key={p.id} className="w-56 sm:w-64 aspect-video flex-shrink-0">
                  <LiveVideoTile
                    user={p.user}
                    isMe={isMe}
                    isMuted={participantMuted}
                    isCameraOn={camOn}
                    isPinned={pinnedUserId === p.userId}
                    onTogglePin={() => setPinnedUserId(pinnedUserId === p.userId ? null : p.userId)}
                    isHost={isHost}
                    onHostAction={handleHostAction}
                    mediaStream={participantStream}
                    audioLevel={isMe ? audioLevel : 0}
                    spatialPanLabel={isSpatialAudioActive && spatialPositions[p.userId] ? spatialAudio.formatPanLabel(spatialPositions[p.userId].pan) : undefined}
                    onDragStart={handleDragStart(p.userId)}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop(p.userId)}
                    onMoveLeft={() => handleMoveTile(p.userId, 'left')}
                    onMoveRight={() => handleMoveTile(p.userId, 'right')}
                  />
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Collapsed State: Sleek Restore Drawer Button */
        <div className="flex justify-center flex-shrink-0 animate-fade-in">
          <button
            onClick={() => setIsAttendeeDrawerOpen(true)}
            className="flex items-center gap-2 px-4 py-1.5 rounded-2xl bg-[var(--bg-surface-1)] hover:bg-[var(--bg-surface-2)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] shadow-xl transition-all hover:scale-105 cursor-pointer"
          >
            <Users className="w-3.5 h-3.5 text-[#5E5CE6]" />
            <span>Show Attendee Video Drawer ({participants.length})</span>
            <ChevronUp className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          </button>
        </div>
      )}

      {/* Floating Live Fact-Check HUD Alert */}
      <LiveFactCheckHUD
        alert={factCheckAlert}
        onDismiss={() => setFactCheckAlert(null)}
        onClarifyOnStage={(stmt, truth) => {
          handleTriggerCoHost(
            `Mivo, please clarify this statement on stage: "${stmt}" - what does our database show?`
          );
          setFactCheckAlert(null);
        }}
      />
    </div>
  );
};

