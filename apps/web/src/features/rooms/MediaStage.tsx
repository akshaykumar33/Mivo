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
  Maximize2,
  Minimize2,
  AppWindow,
  StopCircle,
  Share2,
  Shield,
  GripVertical,
  ArrowLeftRight,
} from 'lucide-react';
import { ChatStream } from '../chat/ChatStream';
import { LiveVideoTile } from './LiveVideoTile';
import { AiCoHostStageTile, AiCoHostStatus } from './AiCoHostStageTile';
import { AiPinnedDataTile, PinnedDataTilePayload } from './AiPinnedDataTile';
import { LiveFactCheckHUD, FactCheckAlertData } from './LiveFactCheckHUD';
import { spatialAudio } from '../audio/SpatialAudioEngine';
import { VoiceTicketConfirmationCard, VoiceTicketProposal } from '../tickets/VoiceTicketConfirmationCard';
import { useTicketStore } from '@/stores/ticketStore';
import { useAuthStore } from '@/stores/authStore';
import { useRoomStore } from '@/stores/roomStore';
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
  onToggleScreen?: () => void;
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
  onToggleScreen,
}) => {
  const screenVideoRef = React.useRef<HTMLVideoElement>(null);
  const stageContainerRef = React.useRef<HTMLDivElement>(null);
  const filmstripScrollRef = React.useRef<HTMLDivElement>(null);
  const [pinnedUserId, setPinnedUserId] = React.useState<string | null>(null);
  const [layoutMode, setLayoutMode] = React.useState<'grid' | 'spotlight'>('grid');
  const [orderedParticipantIds, setOrderedParticipantIds] = React.useState<string[]>([]);
  const [draggedId, setDraggedId] = React.useState<string | null>(null);
  const [dragOverId, setDragOverId] = React.useState<string | null>(null);
  const [isCustomOrdered, setIsCustomOrdered] = React.useState(false);
  const [arrangeToast, setArrangeToast] = React.useState<string | null>(null);
  const [isAttendeeDrawerOpen, setIsAttendeeDrawerOpen] = React.useState(true);

  // Screen Share Theater State
  const [screenFitMode, setScreenFitMode] = React.useState<'contain' | 'cover'>('contain');
  const [isStageFullscreen, setIsStageFullscreen] = React.useState(false);
  const [selectedSourceType, setSelectedSourceType] = React.useState<'screen' | 'window' | 'tab'>('screen');
  const [isAudioSharingEnabled, setIsAudioSharingEnabled] = React.useState(true);
  const [broadcastDuration, setBroadcastDuration] = React.useState(0);

  // Active AI Stage Co-Host & Real-Time Duplex Voice Agent
  const [isCoHostEnabled, setIsCoHostEnabled] = React.useState(false);
  const [coHostStatus, setCoHostStatus] = React.useState<AiCoHostStatus>('LISTENING');
  const [lastSpeechText, setLastSpeechText] = React.useState('');
  const [pinnedDataTile, setPinnedDataTile] = React.useState<PinnedDataTilePayload | null>(null);
  const [factCheckAlert, setFactCheckAlert] = React.useState<FactCheckAlertData | null>(null);
  const { setIsModalOpen: openTicketsModal } = useTicketStore();
  const { capabilities } = useAuthStore();

  // 3D Spatial Audio & Dynamic Physics Grid
  const [isSpatialAudioActive, setIsSpatialAudioActive] = React.useState(true);
  const [spatialPositions, setSpatialPositions] = React.useState<Record<string, { pan: number; distance: number }>>({});

  // Spoken Voice-to-Ticket Automation
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

  // Spoken Voice-to-Ticket Extraction
  const handleExtractVoiceTicket = React.useCallback(
    async (snippet: string) => {
      if (!capabilities?.canUseVoiceToTask) {
        setTicketToast('Voice-to-Task Commands: Exclusive to Enterprise Organization accounts.');
        setTimeout(() => setTicketToast(null), 5000);
        return;
      }

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
    [participants, room, capabilities?.canUseVoiceToTask]
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
    if (typeof window === 'undefined' || mode === 'TEXT') return;
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
      // Spoken Voice-to-Ticket trigger
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
  }, [mode, handleTriggerCoHost, handleFactCheckAudit, handleExtractVoiceTicket]);

  // Sync participant list to ordered array
  React.useEffect(() => {
    setOrderedParticipantIds((prev) => {
      const incomingIds = participants.map((p) => p.userId);
      const existing = prev.filter((id) => incomingIds.includes(id));
      const added = incomingIds.filter((id) => !existing.includes(id));
      return [...existing, ...added];
    });
  }, [participants]);

  // Determine active screen broadcaster (either local user or remote attendee)
  const remoteScreenPresenter = React.useMemo(() => {
    return participants.find((p) => p.isScreenOn && p.userId !== currentUserId);
  }, [participants, currentUserId]);

  const isLocallySharing = isScreenOn && !!screenStream;
  const isRemotelySharing = !!remoteScreenPresenter && !!remoteStreams[remoteScreenPresenter.userId];
  const isScreenActive = isLocallySharing || isRemotelySharing;

  const activeScreenStream = isLocallySharing
    ? screenStream
    : isRemotelySharing && remoteScreenPresenter
    ? remoteStreams[remoteScreenPresenter.userId]
    : null;

  const presenterName = isLocallySharing
    ? 'You'
    : remoteScreenPresenter
    ? remoteScreenPresenter.user.displayName || remoteScreenPresenter.user.username
    : 'Presenter';

  // Elapsed duration for screen sharing
  React.useEffect(() => {
    if (!isScreenActive) {
      setBroadcastDuration(0);
      return;
    }
    const timer = setInterval(() => {
      setBroadcastDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isScreenActive]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  React.useEffect(() => {
    if (screenVideoRef.current) {
      if (activeScreenStream) {
        screenVideoRef.current.srcObject = activeScreenStream;
        screenVideoRef.current.play().catch((e) => console.log('Screen play interrupted:', e));
      } else {
        screenVideoRef.current.srcObject = null;
      }
    }
  }, [activeScreenStream]);

  // Fullscreen management for theater stage
  const handleToggleFullscreen = React.useCallback(() => {
    if (!stageContainerRef.current) return;
    if (!document.fullscreenElement) {
      stageContainerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  React.useEffect(() => {
    const handleFsChange = () => {
      setIsStageFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Screen share trigger
  const handleToggleScreen = React.useCallback(() => {
    if (onToggleScreen) {
      onToggleScreen();
    } else {
      useRoomStore.getState().toggleScreenShare();
    }
  }, [onToggleScreen]);

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

  // Computes optimal speaker balance layout:
  // - High priority: active speakers (unmuted & audio activity)
  // - Medium priority: live camera streaming
  // - Host/moderator anchor
  // - Symmetrical stereophonic balance for spatial audio acoustics
  const computeOptimalSpeakerOrder = React.useCallback(
    (list: RoomMemberDTO[]) => {
      if (list.length <= 1) return list.map((p) => p.userId);

      const scored = list.map((p) => {
        const isMe = p.userId === currentUserId;
        const speaking = isMe ? !isMuted && audioLevel > 5 : !p.isMuted;
        const camera = isMe ? isCameraOn : p.isCameraOn;
        const isHostMember = (isHost && isMe) || (room && (room as any).hostId === p.userId) || ((p as any).role === 'HOST');

        let score = 0;
        if (speaking) score += 100;
        if (camera) score += 50;
        if (isHostMember) score += 20;

        return { userId: p.userId, score, speaking, camera };
      });

      scored.sort((a, b) => b.score - a.score);

      // Distribute top speakers across center, left, right for spatial balance
      if (scored.length >= 3) {
        const left: typeof scored = [];
        const center: typeof scored = [];
        const right: typeof scored = [];

        scored.forEach((item, idx) => {
          if (idx % 3 === 0) center.push(item);
          else if (idx % 3 === 1) left.push(item);
          else right.push(item);
        });

        const balanced: typeof scored = [];
        const maxLen = Math.max(left.length, center.length, right.length);
        for (let i = 0; i < maxLen; i++) {
          if (left[i]) balanced.push(left[i]);
          if (center[i]) balanced.push(center[i]);
          if (right[i]) balanced.push(right[i]);
        }
        return balanced.map((b) => b.userId);
      }

      return scored.map((s) => s.userId);
    },
    [currentUserId, isMuted, audioLevel, isCameraOn, room]
  );

  // Dynamic grid auto-arranging class
  const getDynamicGridClass = React.useCallback((tileCount: number) => {
    switch (tileCount) {
      case 1:
        return 'grid-cols-1 max-w-4xl mx-auto w-full my-auto';
      case 2:
        return 'grid-cols-1 md:grid-cols-2 max-w-5xl mx-auto w-full my-auto';
      case 3:
        return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto w-full my-auto';
      case 4:
        return 'grid-cols-2 max-w-5xl mx-auto w-full my-auto';
      case 5:
      case 6:
        return 'grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto w-full';
      case 7:
      case 8:
      case 9:
        return 'grid-cols-2 md:grid-cols-3 max-w-7xl mx-auto w-full';
      default:
        return 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 w-full';
    }
  }, []);

  // Synchronize participants when membership changes
  React.useEffect(() => {
    if (!isCustomOrdered) {
      const optimal = computeOptimalSpeakerOrder(participants);
      setOrderedParticipantIds(optimal);
    } else {
      setOrderedParticipantIds((prev) => {
        const currentSet = new Set(participants.map((p) => p.userId));
        const filtered = prev.filter((id) => currentSet.has(id));
        const missing = participants.filter((p) => !filtered.includes(p.userId)).map((p) => p.userId);
        return [...filtered, ...missing];
      });
    }
  }, [participants, isCustomOrdered, computeOptimalSpeakerOrder]);

  // Reset to auto-arranged speaker grid with optimal speaker balance
  const handleAutoArrange = React.useCallback(() => {
    setPinnedUserId(null);
    setLayoutMode('grid');
    const optimal = computeOptimalSpeakerOrder(participants);
    setOrderedParticipantIds(optimal);
    setIsCustomOrdered(false);
    setArrangeToast('Optimal speaker balance restored');
    setTimeout(() => setArrangeToast(null), 3000);
  }, [computeOptimalSpeakerOrder, participants]);

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

  const handleDragEnter = (targetUserId: string) => (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedId && draggedId !== targetUserId) {
      setDragOverId(targetUserId);
    }
  };

  const handleDragLeave = (targetUserId: string) => (e: React.DragEvent) => {
    e.preventDefault();
    if (dragOverId === targetUserId) {
      setDragOverId(null);
    }
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  const handleDrop = (targetUserId: string) => (e: React.DragEvent) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('text/plain') || draggedId;
    setDragOverId(null);
    setDraggedId(null);

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
    setIsCustomOrdered(true);
    setArrangeToast('Tile reordered on the fly');
    setTimeout(() => setArrangeToast(null), 2500);
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
    setIsCustomOrdered(true);
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

  const isCoHostPinned = pinnedUserId === 'ai-cohost';
  const pinnedParticipant = participants.find((p) => p.userId === pinnedUserId);

  // Compute effective spotlight participant for Spotlight Focus Mode
  const effectiveSpotlightParticipant = React.useMemo(() => {
    if (pinnedParticipant) return pinnedParticipant;
    if (layoutMode === 'spotlight' && !isCoHostPinned && !pinnedDataTile) {
      return (
        sortedParticipants.find((p) => p.userId !== currentUserId && !p.isMuted) ||
        sortedParticipants.find((p) => p.userId === currentUserId) ||
        sortedParticipants[0] ||
        null
      );
    }
    return null;
  }, [pinnedParticipant, layoutMode, isCoHostPinned, pinnedDataTile, sortedParticipants, currentUserId]);

  // Spotlight Toggle Handler
  const handleTogglePin = React.useCallback((targetUserId: string) => {
    if (pinnedUserId === targetUserId) {
      // Unpin -> return to Grid View
      setPinnedUserId(null);
      setLayoutMode('grid');
      setArrangeToast('Exited Spotlight Focus Mode');
    } else {
      // Pin target -> enter Spotlight Focus Mode
      setPinnedUserId(targetUserId);
      setLayoutMode('spotlight');
      if (targetUserId === 'ai-cohost') {
        setArrangeToast('Spotlight focused on AI Co-Host');
      } else {
        const target = participants.find((p) => p.userId === targetUserId);
        const name = target?.user.displayName || target?.user.username || 'Speaker';
        setArrangeToast(`Spotlight focused on ${name}`);
      }
    }
    setTimeout(() => setArrangeToast(null), 2500);
  }, [pinnedUserId, participants]);

  // Layout mode switcher (Grid vs Spotlight)
  const handleToggleLayoutMode = React.useCallback((mode: 'grid' | 'spotlight') => {
    setLayoutMode(mode);
    if (mode === 'grid') {
      setPinnedUserId(null);
      setArrangeToast('Switched to Grid View');
    } else {
      if (!pinnedUserId) {
        const topSpeaker =
          sortedParticipants.find((p) => p.userId !== currentUserId && !p.isMuted) ||
          sortedParticipants[0];
        if (topSpeaker) {
          setPinnedUserId(topSpeaker.userId);
        }
      }
      setArrangeToast('Switched to Spotlight Focus Mode');
    }
    setTimeout(() => setArrangeToast(null), 2500);
  }, [pinnedUserId, sortedParticipants, currentUserId]);

  // Disconnect safety cleanup: if pinned user leaves room, fallback smoothly
  React.useEffect(() => {
    if (pinnedUserId && pinnedUserId !== 'ai-cohost') {
      const exists = participants.some((p) => p.userId === pinnedUserId);
      if (!exists) {
        if (participants.length > 0) {
          const next = participants.find((p) => p.userId !== currentUserId && !p.isMuted) || participants[0];
          setPinnedUserId(next ? next.userId : null);
        } else {
          setPinnedUserId(null);
          setLayoutMode('grid');
        }
      }
    }
  }, [participants, pinnedUserId, currentUserId]);

  // Escape key shortcut to return to Grid View
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && (layoutMode === 'spotlight' || pinnedUserId !== null)) {
        setPinnedUserId(null);
        setLayoutMode('grid');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [layoutMode, pinnedUserId]);

  // Smooth scroll filmstrip
  const handleScrollFilmstrip = React.useCallback((direction: 'left' | 'right') => {
    if (filmstripScrollRef.current) {
      const amount = direction === 'left' ? -260 : 260;
      filmstripScrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  }, []);

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

  // VOICE MODE: Real Spatial Voice Huddle Stage with Dynamic Audio Levels
  const renderVoiceStage = () => {
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
            {isCustomOrdered ? (
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-400 text-[10px] font-bold animate-in fade-in">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                <span>Custom Layout</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[10px] font-bold animate-in fade-in">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                <span>Speaker Balanced</span>
              </span>
            )}
            <button
              onClick={handleAutoArrange}
              className={`flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-xl border transition-all cursor-pointer shadow-sm ${
                isCustomOrdered
                  ? 'bg-violet-600/30 hover:bg-violet-600/50 border-violet-500/50 text-violet-200 hover:text-white ring-2 ring-violet-500/25'
                  : 'bg-white/[0.04] border-white/[0.06] text-violet-400 hover:text-violet-300'
              }`}
              title="Auto-Arrange Speaker Order (Restores optimal speaker balance)"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-violet-400" />
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
              className={`flex items-center gap-1.5 text-[11px] font-extrabold px-3 py-1 rounded-xl border transition-all shadow-md cursor-pointer ${
                capabilities?.canUseVoiceToTask
                  ? 'text-amber-300 hover:text-amber-200 bg-amber-600/25 border-amber-500/40 hover:bg-amber-600/40'
                  : 'text-zinc-400 bg-zinc-800/60 border-zinc-700/50 hover:bg-zinc-800/80'
              }`}
              title={
                capabilities?.canUseVoiceToTask
                  ? 'Simulate Voice-to-Ticket Detection'
                  : 'Voice-to-task commands are exclusive to Enterprise Organization accounts'
              }
            >
              <Ticket className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>Voice-to-Ticket Demo</span>
              {!capabilities?.canUseVoiceToTask && (
                <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 text-[9px] font-bold border border-purple-500/30">
                  Org Only
                </span>
              )}
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
            const isDragging = draggedId === p.userId;
            const isDragOver = dragOverId === p.userId;

            return (
              <div
                key={p.id}
                draggable
                onDragStart={handleDragStart(p.userId)}
                onDragOver={handleDragOver}
                onDragEnter={handleDragEnter(p.userId)}
                onDragLeave={handleDragLeave(p.userId)}
                onDragEnd={handleDragEnd}
                onDrop={handleDrop(p.userId)}
                className={`relative flex flex-col items-center p-4 sm:p-5 rounded-3xl bg-[var(--bg-surface-1)] border transition-all duration-300 group w-40 sm:w-44 shadow-lg cursor-grab active:cursor-grabbing ${
                  isDragging
                    ? 'opacity-35 scale-[0.97] border-dashed border-violet-400 ring-2 ring-violet-500/40 shadow-none'
                    : isDragOver
                    ? 'scale-[1.04] border-violet-400 ring-4 ring-violet-500/60 shadow-2xl shadow-violet-500/30 bg-violet-950/40'
                    : isSpeaking
                    ? 'border-emerald-500 shadow-emerald-500/20 ring-2 ring-emerald-500/30'
                    : 'border-[var(--border-subtle)] hover:border-violet-500/30'
                }`}
              >
                {/* Drop Target Indicator */}
                {isDragOver && (
                  <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-violet-950/85 backdrop-blur-xs rounded-3xl border-2 border-dashed border-violet-400 pointer-events-none animate-in fade-in zoom-in-95">
                    <ArrowLeftRight className="w-4 h-4 text-violet-300 animate-pulse mb-1" />
                    <span className="text-[10px] font-bold text-white text-center px-2">Drop to Swap</span>
                  </div>
                )}

                {/* Voice Card Drag Handle & Quick Reorder Controls */}
                <div className="absolute top-2 left-2 right-2 flex items-center justify-between opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity z-20">
                  <div
                    draggable
                    onDragStart={(e) => {
                      e.stopPropagation();
                      handleDragStart(p.userId)(e);
                    }}
                    onDragEnd={handleDragEnd}
                    className="p-1 rounded-lg bg-black/60 hover:bg-violet-600/40 text-white/70 hover:text-white transition-all cursor-grab active:cursor-grabbing border border-white/10"
                    title="Grab handle to reorder tile on the fly"
                  >
                    <GripVertical className="w-3 h-3 text-violet-400" />
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMoveTile(p.userId, 'left');
                      }}
                      className="p-1 rounded-lg bg-black/60 hover:bg-white/[0.15] text-white/60 hover:text-white transition-all cursor-pointer border border-white/10"
                      title="Move Left"
                    >
                      <ChevronLeft className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMoveTile(p.userId, 'right');
                      }}
                      className="p-1 rounded-lg bg-black/60 hover:bg-white/[0.15] text-white/60 hover:text-white transition-all cursor-pointer border border-white/10"
                      title="Move Right"
                    >
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
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
                      className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-black/60 border border-white/10 text-emerald-400 shadow-sm inline-flex items-center gap-1 mt-1.5"
                      title="3D Spatial Audio Pan"
                    >
                      <Headphones className="w-2.5 h-2.5 text-emerald-400" />
                      <span>{spatialAudio.formatPanLabel(spatialPositions[p.userId].pan)}</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // VIDEO MODE: Grid with Drag & Drop, Host Moderation & Spotlight Pinning
  const renderVideoStage = () => {
    const activeHeroParticipant = effectiveSpotlightParticipant;
    const isHeroActive = Boolean(pinnedDataTile || isCoHostPinned || activeHeroParticipant);
    const heroName = isCoHostPinned
      ? 'Mivo AI Co-Host'
      : activeHeroParticipant?.user.displayName || activeHeroParticipant?.user.username || 'Speaker';

    return (
      <div className="flex-1 p-2 sm:p-5 pb-28 bg-[var(--bg-canvas)] select-none flex flex-col overflow-hidden relative gap-3">
        {/* Live Fact Check HUD Alert */}
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

        {/* Global Video Stage Controls Header Bar */}
        <div className="flex items-center justify-between px-1 flex-wrap gap-2 flex-shrink-0 z-10">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--text-secondary)]">
              Live Video Stage ({participants.length + (isCoHostEnabled ? 1 : 0)} Active)
            </span>

            {/* Spotlight Active Indicator Badge */}
            {isHeroActive && (
              <span className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-violet-600/20 border border-violet-500/40 text-violet-300 text-[11px] font-extrabold animate-in fade-in">
                <Pin className="w-3 h-3 fill-current text-amber-300 animate-pulse" />
                <span>Spotlight: {heroName}</span>
              </span>
            )}

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

          <div className="flex items-center gap-2">
            {/* View Mode Switcher: Grid View vs Spotlight View */}
            <div className="flex items-center p-0.5 rounded-xl bg-black/40 border border-white/10 shadow-inner">
              <button
                onClick={() => handleToggleLayoutMode('grid')}
                className={`flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  !isHeroActive
                    ? 'bg-violet-600 text-white shadow-md'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
                }`}
                title="Switch to Equal Responsive Grid View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Grid</span>
              </button>
              <button
                onClick={() => handleToggleLayoutMode('spotlight')}
                className={`flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  isHeroActive
                    ? 'bg-violet-600 text-white shadow-md'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
                }`}
                title="Switch to Spotlight Focus Mode (Dominant 16:9 Hero Stage + Attendee Filmstrip)"
              >
                <Pin className="w-3.5 h-3.5" />
                <span>Spotlight</span>
              </button>
            </div>

            {/* Custom Layout indicator & reset for Grid View */}
            {!isHeroActive && (
              <>
                {isCustomOrdered ? (
                  <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-400 text-[10px] font-bold animate-in fade-in">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    <span>Custom Layout</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[10px] font-bold animate-in fade-in">
                    <Sparkles className="w-3 h-3 text-emerald-400" />
                    <span>Speaker Balanced</span>
                  </span>
                )}
                <button
                  onClick={handleAutoArrange}
                  className={`flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-xl border transition-all cursor-pointer shadow-sm ${
                    isCustomOrdered
                      ? 'bg-violet-600/30 hover:bg-violet-600/50 border-violet-500/50 text-violet-200 hover:text-white ring-2 ring-violet-500/25'
                      : 'bg-[var(--bg-surface-1)] border-[var(--border-subtle)] text-violet-400 hover:text-violet-300 hover:bg-[var(--bg-surface-2)]'
                  }`}
                  title="Reset to Auto-Arranged Grid (Restores optimal speaker balance)"
                >
                  <LayoutGrid className="w-3.5 h-3.5 text-violet-400" />
                  <span>Auto-Arrange</span>
                </button>
              </>
            )}

            {/* Exit Spotlight button when in Spotlight Mode */}
            {isHeroActive && (
              <button
                onClick={() => handleToggleLayoutMode('grid')}
                className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-xl bg-white/[0.06] hover:bg-rose-950/60 hover:text-rose-200 border border-white/10 hover:border-rose-500/40 text-zinc-300 transition-all cursor-pointer shadow-sm"
                title="Exit Spotlight Focus Mode (Return to Grid)"
              >
                <PinOff className="w-3.5 h-3.5 text-violet-400" />
                <span>Exit Spotlight</span>
              </button>
            )}
          </div>
        </div>

        {/* Voice-to-Ticket Interactive Confirmation Card */}
        {voiceTicketProposal && (
          <div className="w-full max-w-xl mx-auto mb-2 z-30 flex-shrink-0">
            <VoiceTicketConfirmationCard
              proposal={voiceTicketProposal}
              roomId={room?.id}
              onConfirm={handleConfirmVoiceTicket}
              onDismiss={() => setVoiceTicketProposal(null)}
            />
          </div>
        )}

        {/* STAGE CONTENT: Spotlight Mode vs Grid Mode */}
        {isHeroActive ? (
          /* Spotlight Focus Mode: Dominant 16:9 Hero Stage + Attendee Filmstrip */
          <div className="flex-1 flex flex-col gap-3 min-h-0 overflow-hidden">
            {/* 1. Dominant 16:9 Hero Stage Container */}
            <div className="flex-1 min-h-0 flex items-center justify-center relative p-1 sm:p-2">
              <div className="w-full max-w-5xl xl:max-w-6xl max-h-full aspect-video mx-auto relative flex items-center justify-center">
                {/* Atmospheric Ambient Halo Backlight */}
                <div className="absolute -inset-2 bg-gradient-to-r from-violet-600/30 via-indigo-600/20 to-purple-600/30 rounded-3xl blur-2xl opacity-75 pointer-events-none" />

                {/* Top Overlay Banner on Hero Stage */}
                <div className="absolute top-3 left-3 z-30 flex items-center gap-2 pointer-events-none">
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-600/90 text-white text-xs font-black tracking-wider uppercase backdrop-blur-md shadow-xl border border-violet-400/40">
                    <Pin className="w-3.5 h-3.5 fill-current text-amber-300 animate-pulse" />
                    <span>Spotlight Focus Mode</span>
                  </div>
                  <span className="text-[11px] text-white/80 font-bold bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 hidden sm:inline-block">
                    16:9 Hero Stage
                  </span>
                </div>

                {/* Top Right Exit Spotlight button on Hero Stage */}
                <button
                  onClick={() => handleToggleLayoutMode('grid')}
                  className="absolute top-3 right-3 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/80 hover:bg-black text-zinc-300 hover:text-white text-xs font-bold backdrop-blur-md border border-white/15 hover:border-violet-400/50 shadow-xl transition-all cursor-pointer"
                  title="Exit Spotlight Focus Mode"
                >
                  <PinOff className="w-3.5 h-3.5 text-violet-400" />
                  <span>Exit Spotlight</span>
                </button>

                {/* Hero Stage Content */}
                {pinnedDataTile ? (
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
                ) : isCoHostPinned ? (
                  <AiCoHostStageTile
                    status={coHostStatus}
                    lastSpeechText={lastSpeechText}
                    onTriggerCommand={handleTriggerCoHost}
                    isPinned={true}
                    onTogglePin={() => handleTogglePin('ai-cohost')}
                    isSpotlightHero={true}
                  />
                ) : activeHeroParticipant ? (
                  <LiveVideoTile
                    user={activeHeroParticipant.user}
                    isMe={activeHeroParticipant.userId === currentUserId}
                    isMuted={activeHeroParticipant.userId === currentUserId ? isMuted : activeHeroParticipant.isMuted}
                    isCameraOn={activeHeroParticipant.userId === currentUserId ? isCameraOn : activeHeroParticipant.isCameraOn}
                    isPinned={true}
                    onTogglePin={() => handleTogglePin(activeHeroParticipant.userId)}
                    isHost={isHost}
                    onHostAction={handleHostAction}
                    mediaStream={activeHeroParticipant.userId === currentUserId ? localStream : remoteStreams[activeHeroParticipant.userId]}
                    audioLevel={activeHeroParticipant.userId === currentUserId ? audioLevel : 0}
                    spatialPanLabel={isSpatialAudioActive && spatialPositions[activeHeroParticipant.userId] ? spatialAudio.formatPanLabel(spatialPositions[activeHeroParticipant.userId].pan) : undefined}
                    isSpotlightHero={true}
                  />
                ) : null}
              </div>
            </div>

            {/* 2. Attendee Filmstrip Below */}
            <div className="flex-shrink-0 w-full pt-2 pb-1 border-t border-white/[0.08] bg-black/30 backdrop-blur-md rounded-2xl px-3 flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs px-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-violet-400" />
                    Attendee Filmstrip ({
                      (sortedParticipants.filter((p) => p.userId !== activeHeroParticipant?.userId).length) +
                      (isCoHostEnabled && !isCoHostPinned ? 1 : 0)
                    })
                  </span>
                  <span className="text-[10px] text-zinc-500 hidden sm:inline-block">
                    • Click any attendee to switch spotlight
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleScrollFilmstrip('left')}
                    className="p-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300 hover:text-white transition-all cursor-pointer"
                    title="Scroll filmstrip left"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleScrollFilmstrip('right')}
                    className="p-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300 hover:text-white transition-all cursor-pointer"
                    title="Scroll filmstrip right"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Filmstrip Horizontal Track */}
              <div
                ref={filmstripScrollRef}
                className="flex items-center gap-3 overflow-x-auto py-1 scrollbar-thin scrollbar-thumb-white/10 scroll-smooth min-h-[90px]"
              >
                {/* AI Co-Host Tile in Filmstrip (if enabled and not currently the hero) */}
                {isCoHostEnabled && !isCoHostPinned && (
                  <div
                    className="w-44 sm:w-52 aspect-video flex-shrink-0 flex items-center relative group/strip cursor-pointer rounded-2xl overflow-hidden transition-all duration-200 hover:scale-[1.02] hover:ring-2 hover:ring-violet-500/60"
                    onClick={() => handleTogglePin('ai-cohost')}
                  >
                    <AiCoHostStageTile
                      status={coHostStatus}
                      lastSpeechText={lastSpeechText}
                      onTriggerCommand={handleTriggerCoHost}
                      isPinned={false}
                      onTogglePin={() => handleTogglePin('ai-cohost')}
                      filmstripMode={true}
                    />
                  </div>
                )}

                {/* Attendee Tiles in Filmstrip */}
                {sortedParticipants
                  .filter((p) => p.userId !== activeHeroParticipant?.userId)
                  .map((p) => {
                    const isMe = p.userId === currentUserId;
                    const camOn = isMe ? isCameraOn : p.isCameraOn;
                    const participantMuted = isMe ? isMuted : p.isMuted;
                    const participantStream = isMe ? localStream : remoteStreams[p.userId];

                    return (
                      <div
                        key={p.id}
                        className="w-44 sm:w-52 aspect-video flex-shrink-0 flex items-center relative group/strip cursor-pointer rounded-2xl overflow-hidden transition-all duration-200 hover:scale-[1.02] hover:ring-2 hover:ring-violet-500/60"
                        onClick={() => handleTogglePin(p.userId)}
                      >
                        <LiveVideoTile
                          user={p.user}
                          isMe={isMe}
                          isMuted={participantMuted}
                          isCameraOn={camOn}
                          isPinned={false}
                          onTogglePin={() => handleTogglePin(p.userId)}
                          isHost={isHost}
                          onHostAction={handleHostAction}
                          mediaStream={participantStream}
                          audioLevel={isMe ? audioLevel : 0}
                          spatialPanLabel={isSpatialAudioActive && spatialPositions[p.userId] ? spatialAudio.formatPanLabel(spatialPositions[p.userId].pan) : undefined}
                          filmstripMode={true}
                          onClick={() => handleTogglePin(p.userId)}
                          onDragStart={handleDragStart(p.userId)}
                          onDragOver={handleDragOver}
                          onDragEnter={handleDragEnter(p.userId)}
                          onDragLeave={handleDragLeave(p.userId)}
                          onDragEnd={handleDragEnd}
                          onDrop={handleDrop(p.userId)}
                          isDragging={draggedId === p.userId}
                          isDragOver={dragOverId === p.userId}
                          onMoveLeft={() => handleMoveTile(p.userId, 'left')}
                          onMoveRight={() => handleMoveTile(p.userId, 'right')}
                        />
                      </div>
                    );
                  })}

                {/* Fallback when no other attendees are in the filmstrip */}
                {sortedParticipants.filter((p) => p.userId !== activeHeroParticipant?.userId).length === 0 && !isCoHostEnabled && (
                  <div className="h-20 w-full flex items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.02] text-xs text-zinc-400 gap-2 px-4">
                    <Users className="w-4 h-4 text-violet-400" />
                    <span>Spotlight Focus active. As other participants join, they will appear in this attendee filmstrip.</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Standard Equal Auto-Adjusting Grid with Drag & Drop */
          <div
            className={`grid gap-4 sm:gap-5 h-full min-h-[340px] overflow-y-auto items-center transition-all duration-300 ${
              getDynamicGridClass(sortedParticipants.length + (isCoHostEnabled ? 1 : 0))
            }`}
          >
            {/* Co-Host Stage Tile */}
            {isCoHostEnabled && (
              <AiCoHostStageTile
                status={coHostStatus}
                lastSpeechText={lastSpeechText}
                onTriggerCommand={handleTriggerCoHost}
                isPinned={false}
                onTogglePin={() => handleTogglePin('ai-cohost')}
                onClick={() => handleTogglePin('ai-cohost')}
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
                  onTogglePin={() => handleTogglePin(p.userId)}
                  isHost={isHost}
                  onHostAction={handleHostAction}
                  mediaStream={participantStream}
                  audioLevel={isMe ? audioLevel : 0}
                  spatialPanLabel={isSpatialAudioActive && spatialPositions[p.userId] ? spatialAudio.formatPanLabel(spatialPositions[p.userId].pan) : undefined}
                  onDragStart={handleDragStart(p.userId)}
                  onDragOver={handleDragOver}
                  onDragEnter={handleDragEnter(p.userId)}
                  onDragLeave={handleDragLeave(p.userId)}
                  onDragEnd={handleDragEnd}
                  onDrop={handleDrop(p.userId)}
                  isDragging={draggedId === p.userId}
                  isDragOver={dragOverId === p.userId}
                  onMoveLeft={() => handleMoveTile(p.userId, 'left')}
                  onMoveRight={() => handleMoveTile(p.userId, 'right')}
                />
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // SCREEN_SHARE or STREAM MODE: Studio Broadcast Theater with Interactive Preparation Deck & Participant Strip
  const renderScreenStage = () => {
    return (
    <div className="flex-1 p-2 sm:p-5 pb-28 sm:pb-32 bg-[var(--bg-canvas)] flex flex-col select-none overflow-hidden gap-3">
      {/* Primary Studio Broadcast Stage Frame */}
      <div
        ref={stageContainerRef}
        className="flex-1 rounded-2xl bg-[#0c0e17] border border-[#1e2333] relative flex flex-col shadow-sm overflow-hidden min-h-[360px]"
      >
        {/* Stage Integrated Header Bar */}
        <div className="h-11 px-4 border-b border-[#1e2333] bg-[#111422]/95 flex items-center justify-between flex-shrink-0 z-20">
          {/* Left: Broadcast Status */}
          <div className="flex items-center gap-2.5">
            {isScreenActive ? (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                <span className="text-xs font-bold text-rose-300 uppercase tracking-wider">Broadcasting Live</span>
                <span className="text-slate-600 text-xs">•</span>
                <span className="text-xs text-slate-200 font-medium">Shared by {presenterName}</span>
                <span className="text-[11px] font-mono text-slate-400 bg-white/[0.06] px-1.5 py-0.5 rounded border border-white/[0.08]">
                  {formatDuration(broadcastDuration)}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-xs font-semibold text-slate-200">
                  {mode === 'SCREEN_SHARE' ? 'Screen Broadcast Stage' : 'Live Broadcaster Stage'}
                </span>
                <span className="text-slate-600 text-xs">•</span>
                <span className="text-[11px] text-slate-400 font-medium">Standby & Ready</span>
              </div>
            )}
          </div>

          {/* Center: Stream profile / resolution badge */}
          <div className="hidden md:flex items-center gap-2 text-[11px] font-mono text-slate-400">
            <span className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.08] text-slate-300">
              1080p 60fps
            </span>
            <span>WebRTC Low-Latency Mesh</span>
          </div>

          {/* Right: Stage View Controls */}
          <div className="flex items-center gap-1.5">
            {isScreenActive && (
              <button
                onClick={() => setScreenFitMode(screenFitMode === 'contain' ? 'cover' : 'contain')}
                className="px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-[11px] text-slate-300 transition-colors flex items-center gap-1 cursor-pointer"
                title={screenFitMode === 'contain' ? 'Fill Frame' : 'Fit to Screen'}
              >
                <span>{screenFitMode === 'contain' ? 'Fit' : 'Fill'}</span>
              </button>
            )}

            <button
              onClick={handleToggleFullscreen}
              className="p-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-slate-300 hover:text-white transition-colors cursor-pointer"
              title={isStageFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            >
              {isStageFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={() => setIsAttendeeDrawerOpen(!isAttendeeDrawerOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-[11px] font-medium text-slate-200 transition-colors cursor-pointer"
              title={isAttendeeDrawerOpen ? 'Collapse Video Strip' : 'Show Video Strip'}
            >
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <span>{participants.length} in Meet</span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-300">
                {isAttendeeDrawerOpen ? 'Hide' : 'Show'}
              </span>
            </button>
          </div>
        </div>

        {/* Stage Viewport */}
        {isScreenActive && activeScreenStream ? (
          <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-black">
            <video
              ref={screenVideoRef}
              autoPlay
              playsInline
              muted={isLocallySharing}
              className={`w-full h-full ${screenFitMode === 'cover' ? 'object-cover' : 'object-contain'} bg-black`}
            />

            {/* Floating Control HUD Overlay */}
            {isLocallySharing && (
              <div className="absolute bottom-4 right-4 z-20 flex items-center gap-2 bg-[#0c0e17]/95 backdrop-blur-md border border-[#242b3d] px-3 py-2 rounded-xl shadow-lg">
                <div className="flex items-center gap-2 pr-2 border-r border-[#242b3d]">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-xs text-slate-200 font-medium">You are broadcasting</span>
                </div>
                <button
                  onClick={handleToggleScreen}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <StopCircle className="w-3.5 h-3.5" />
                  <span>Stop Sharing</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 relative flex flex-col items-center justify-center p-4 sm:p-8 overflow-y-auto">
            {/* Safe Frame Guides (Delicate 16:9 Architectural Markings) */}
            <div className="absolute inset-4 sm:inset-8 border border-white/[0.04] rounded-xl pointer-events-none flex flex-col justify-between p-3">
              <div className="flex justify-between text-[9px] font-mono text-slate-600 uppercase tracking-widest">
                <span>Safe 16:9</span>
                <span>Studio Ready</span>
              </div>
              <div className="flex justify-between text-[9px] font-mono text-slate-600">
                <span>Mivo Display Mesh</span>
                <span>P2P Encrypted</span>
              </div>
            </div>

            {/* Central Broadcast Preparation Card */}
            <div className="max-w-xl w-full z-10 flex flex-col items-center text-center">
              {/* Monogram / Icon */}
              <div className="w-12 h-12 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-slate-200 mb-3 shadow-sm">
                <Monitor className="w-6 h-6 text-slate-200" />
              </div>

              <h3 className="text-xl font-semibold text-white tracking-tight">
                Broadcast Your Screen
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 mt-1.5 max-w-md">
                Share live code, application windows, slides, or your entire desktop directly with this meeting.
              </p>

              {/* 3 Source Selector Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 w-full mt-6">
                {/* Option 1: Entire Screen */}
                <button
                  onClick={() => setSelectedSourceType('screen')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    selectedSourceType === 'screen'
                      ? 'bg-white/[0.08] border-white/25 text-white'
                      : 'bg-white/[0.02] border-white/[0.06] text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Monitor className="w-4 h-4 text-slate-300" />
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.06] text-slate-300 border border-white/[0.08]">
                      All Displays
                    </span>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white">Full Screen</div>
                    <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">Multi-window & code</div>
                  </div>
                </button>

                {/* Option 2: App Window */}
                <button
                  onClick={() => setSelectedSourceType('window')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    selectedSourceType === 'window'
                      ? 'bg-white/[0.08] border-white/25 text-white'
                      : 'bg-white/[0.02] border-white/[0.06] text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <AppWindow className="w-4 h-4 text-slate-300" />
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.06] text-slate-300 border border-white/[0.08]">
                      Privacy Safe
                    </span>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white">App Window</div>
                    <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">VS Code, Figma, Slides</div>
                  </div>
                </button>

                {/* Option 3: Browser Tab */}
                <button
                  onClick={() => setSelectedSourceType('tab')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    selectedSourceType === 'tab'
                      ? 'bg-white/[0.08] border-white/25 text-white'
                      : 'bg-white/[0.02] border-white/[0.06] text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Radio className="w-4 h-4 text-slate-300" />
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.06] text-slate-300 border border-white/[0.08]">
                      Stereo Audio
                    </span>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white">Browser Tab</div>
                    <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">Media & app preview</div>
                  </div>
                </button>
              </div>

              {/* Action Bar */}
              <div className="flex flex-col sm:flex-row items-center gap-3 mt-5 w-full justify-center">
                <button
                  onClick={handleToggleScreen}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-white text-slate-900 hover:bg-slate-100 font-semibold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-[0.98]"
                >
                  <Share2 className="w-4 h-4 text-slate-900" />
                  <span>Start Screen Sharing</span>
                </button>

                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-colors">
                  <input
                    type="checkbox"
                    checked={isAudioSharingEnabled}
                    onChange={(e) => setIsAudioSharingEnabled(e.target.checked)}
                    className="rounded border-slate-700 text-slate-900 focus:ring-0 w-3.5 h-3.5 accent-slate-200 cursor-pointer"
                  />
                  <Volume2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>Include audio feed</span>
                </label>
              </div>

              {/* Telemetry Readiness Bar */}
              <div className="grid grid-cols-3 gap-2 mt-6 pt-5 border-t border-white/[0.06] w-full text-left">
                <div>
                  <div className="text-[10px] uppercase font-mono tracking-wider text-slate-500">Audience</div>
                  <div className="text-xs font-medium text-slate-300 mt-0.5">
                    {participants.length} {participants.length === 1 ? 'member' : 'members'} ready
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-mono tracking-wider text-slate-500">Transport</div>
                  <div className="text-xs font-medium text-slate-300 mt-0.5">WebRTC Mesh P2P</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-mono tracking-wider text-slate-500">Security</div>
                  <div className="text-xs font-medium text-slate-300 mt-0.5">Encrypted Stream</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Interactive Participant Video Drawer (Only in active call modes: Voice, Video, Screen) */}
      {mode !== 'TEXT' && (
        isAttendeeDrawerOpen ? (
          <div className="flex-shrink-0 flex flex-col gap-2 rounded-xl bg-[var(--bg-surface-0)] border border-[var(--border-subtle)] p-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-semibold text-[var(--text-secondary)]">
                Meeting Participants ({participants.length}) • Drag or Reorder
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setIsCoHostEnabled(!isCoHostEnabled)}
                  className={`flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                    isCoHostEnabled
                      ? 'bg-violet-600/15 text-violet-600 dark:text-violet-300 border-violet-500/40'
                      : 'bg-[var(--bg-surface-1)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border-[var(--border-subtle)]'
                  }`}
                  title="Toggle AI Stage Co-Host Assistant"
                >
                  <Bot className="w-3 h-3" />
                  <span>{isCoHostEnabled ? 'AI Co-Host (On)' : '+ AI Assistant'}</span>
                </button>

                {isCustomOrdered ? (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-400 text-[10px] font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    <span>Custom</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[10px] font-bold">
                    <Sparkles className="w-3 h-3 text-emerald-400" />
                    <span>Balanced</span>
                  </span>
                )}

                <button
                  onClick={handleAutoArrange}
                  className={`flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                    isCustomOrdered
                      ? 'bg-violet-600/25 text-violet-200 border-violet-500/40 hover:bg-violet-600/40'
                      : 'bg-[var(--bg-surface-1)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border-[var(--border-subtle)] hover:bg-[var(--bg-surface-2)]'
                  }`}
                  title="Auto-Arrange Video Strip (Restores optimal speaker balance)"
                >
                  <LayoutGrid className="w-3 h-3 text-violet-400" />
                  <span>Auto-Arrange</span>
                </button>

                <button
                  onClick={() => setIsAttendeeDrawerOpen(false)}
                  className="flex items-center gap-1 text-[11px] font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] px-2 py-1 rounded-lg bg-[var(--bg-surface-1)] border border-[var(--border-subtle)] hover:bg-[var(--bg-surface-2)] transition-colors cursor-pointer"
                  title="Collapse Video Drawer"
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
                <div className="w-48 sm:w-56 aspect-video flex-shrink-0">
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
                  <div key={p.id} className="w-48 sm:w-56 aspect-video flex-shrink-0">
                    <LiveVideoTile
                      user={p.user}
                      isMe={isMe}
                      isMuted={participantMuted}
                      isCameraOn={camOn}
                      isPinned={pinnedUserId === p.userId}
                      onTogglePin={() => handleTogglePin(p.userId)}
                      isHost={isHost}
                      onHostAction={handleHostAction}
                      mediaStream={participantStream}
                      audioLevel={isMe ? audioLevel : 0}
                      spatialPanLabel={isSpatialAudioActive && spatialPositions[p.userId] ? spatialAudio.formatPanLabel(spatialPositions[p.userId].pan) : undefined}
                      onDragStart={handleDragStart(p.userId)}
                      onDragOver={handleDragOver}
                      onDragEnter={handleDragEnter(p.userId)}
                      onDragLeave={handleDragLeave(p.userId)}
                      onDragEnd={handleDragEnd}
                      onDrop={handleDrop(p.userId)}
                      isDragging={draggedId === p.userId}
                      isDragOver={dragOverId === p.userId}
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
              className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-[var(--bg-surface-0)] hover:bg-[var(--bg-surface-1)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] shadow-sm transition-all cursor-pointer"
            >
              <Users className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              <span>Show Attendee Video Drawer ({participants.length})</span>
              <ChevronUp className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            </button>
          </div>
        )
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

  return (
    <div className="flex-1 flex flex-col h-full w-full relative overflow-hidden bg-[var(--bg-canvas)]">
      {/* Auto-Arrange / Reorder Feedback Toast */}
      {arrangeToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl bg-violet-950/95 border border-violet-500/50 text-violet-200 text-xs font-bold shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2 backdrop-blur-md pointer-events-none">
          <CheckCircle2 className="w-4 h-4 text-violet-400" />
          <span>{arrangeToast}</span>
        </div>
      )}

      {/* ── Real-Time Chat Stream (Kept hot in DOM: 0ms instant switch, zero re-fetching or scroll loss) ── */}
      <div
        className={`flex-1 flex flex-col h-full w-full ${
          mode === 'TEXT' ? 'flex relative z-10' : 'hidden'
        }`}
      >
        {room ? (
          <ChatStream room={room} />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-[#0E1017]">
            <div className="w-8 h-8 border-3 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* ── Live Media Stages (Voice / Video / Screen Share) ── */}
      <div
        className={`flex-1 flex flex-col h-full w-full relative overflow-hidden ${
          mode !== 'TEXT' ? 'flex' : 'hidden'
        }`}
      >
        {mode === 'VOICE'
          ? renderVoiceStage()
          : mode === 'VIDEO'
          ? renderVideoStage()
          : renderScreenStage()}
      </div>
    </div>
  );
};

