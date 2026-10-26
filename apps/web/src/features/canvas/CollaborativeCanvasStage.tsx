'use client';

import * as React from 'react';
import {
  MousePointer,
  StickyNote,
  Square,
  Database,
  Radio,
  Shield,
  ArrowRight,
  Type,
  Trash2,
  Download,
  Sparkles,
  Mic,
  Plus,
  Move,
  Layers,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from 'lucide-react';
import { CanvasElement, CanvasCursorPayload, CanvasUpdatePayload, REALTIME_EVENTS, RoomMemberDTO } from '@mivo/shared';
import { realtime } from '../../lib/socket-client';
import { api } from '../../lib/api-client';

export interface CollaborativeCanvasStageProps {
  roomId: string;
  roomName: string;
  currentUserId?: string;
  currentUserName?: string;
  participants: RoomMemberDTO[];
}

export const CollaborativeCanvasStage: React.FC<CollaborativeCanvasStageProps> = ({
  roomId,
  roomName,
  currentUserId,
  currentUserName = 'Anonymous',
  participants,
}) => {
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Canvas elements state
  const [elements, setElements] = React.useState<CanvasElement[]>([
    {
      id: 'gateway-init',
      type: 'GATEWAY',
      x: 140,
      y: 220,
      width: 200,
      height: 110,
      title: 'Auth & API Gateway',
      content: 'Reverse Proxy • JWT Verification',
      color: '#6366F1',
    },
    {
      id: 'service-init',
      type: 'SERVICE',
      x: 440,
      y: 120,
      width: 210,
      height: 110,
      title: 'Core Microservice',
      content: 'NestJS Engine • Business Logic',
      color: '#06B6D4',
    },
    {
      id: 'queue-init',
      type: 'QUEUE',
      x: 440,
      y: 340,
      width: 210,
      height: 110,
      title: 'Redis Pub/Sub Bus',
      content: 'Realtime Stage Presence & Events',
      color: '#EF4444',
    },
    {
      id: 'db-init',
      type: 'DATABASE',
      x: 740,
      y: 120,
      width: 210,
      height: 110,
      title: 'Neon PostgreSQL',
      content: 'Lakebase DB • Tickets & Users',
      color: '#8B5CF6',
    },
    {
      id: 'conn-1',
      type: 'CONNECTOR',
      x: 0,
      y: 0,
      fromId: 'gateway-init',
      toId: 'service-init',
      label: 'REST / gRPC',
      color: '#38BDF8',
    },
    {
      id: 'conn-2',
      type: 'CONNECTOR',
      x: 0,
      y: 0,
      fromId: 'gateway-init',
      toId: 'queue-init',
      label: 'Publish Event',
      color: '#F87171',
    },
    {
      id: 'conn-3',
      type: 'CONNECTOR',
      x: 0,
      y: 0,
      fromId: 'service-init',
      toId: 'db-init',
      label: 'Prisma ORM',
      color: '#A78BFA',
    },
  ]);

  // Active tools
  const [selectedTool, setSelectedTool] = React.useState<
    'SELECT' | 'STICKY' | 'SERVICE' | 'DATABASE' | 'QUEUE' | 'GATEWAY' | 'CONNECTOR' | 'TEXT'
  >('SELECT');

  // Dragging / Selection state
  const [selectedElementId, setSelectedElementId] = React.useState<string | null>(null);
  const [draggedElementId, setDraggedElementId] = React.useState<string | null>(null);
  const [dragOffset, setDragOffset] = React.useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Connector drawing state
  const [connectorStartId, setConnectorStartId] = React.useState<string | null>(null);

  // Remote cursors
  const [remoteCursors, setRemoteCursors] = React.useState<Map<string, CanvasCursorPayload>>(new Map());

  // AI Voice-to-Canvas
  const [aiPrompt, setAiPrompt] = React.useState('');
  const [isGeneratingAi, setIsGeneratingAi] = React.useState(false);
  const [isVoiceListening, setIsVoiceListening] = React.useState(false);

  // Zoom & Pan
  const [zoom, setZoom] = React.useState(1.0);

  // User color
  const userColor = React.useMemo(() => {
    const colors = ['#38BDF8', '#4ADE80', '#F472B6', '#FBBF24', '#A78BFA', '#FB7185'];
    const idx = Math.abs(currentUserName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % colors.length;
    return colors[idx];
  }, [currentUserName]);

  // Socket.io Real-Time Synchronization
  React.useEffect(() => {
    const socket = realtime.getSocket();
    if (!socket || !roomId) return;

    // Listen for canvas element updates
    const onCanvasUpdate = (data: CanvasUpdatePayload) => {
      if (data.roomId !== roomId) return;
      if (data.action === 'CLEAR') {
        setElements([]);
      } else if (data.action === 'UPSERT') {
        setElements((prev) => {
          const map = new Map(prev.map((el) => [el.id, el]));
          data.elements.forEach((el) => map.set(el.id, el));
          return Array.from(map.values());
        });
      }
    };

    // Listen for remote cursors
    const onCanvasCursor = (data: CanvasCursorPayload) => {
      if (data.roomId !== roomId || data.userId === currentUserId) return;
      setRemoteCursors((prev) => {
        const next = new Map(prev);
        next.set(data.userId, data);
        return next;
      });
    };

    // Listen for clear
    const onCanvasClear = (data: { roomId: string }) => {
      if (data.roomId === roomId) setElements([]);
    };

    socket.on(REALTIME_EVENTS.ROOM_CANVAS_UPDATE, onCanvasUpdate);
    socket.on(REALTIME_EVENTS.ROOM_CANVAS_CURSOR, onCanvasCursor);
    socket.on(REALTIME_EVENTS.ROOM_CANVAS_CLEAR, onCanvasClear);

    return () => {
      socket.off(REALTIME_EVENTS.ROOM_CANVAS_UPDATE, onCanvasUpdate);
      socket.off(REALTIME_EVENTS.ROOM_CANVAS_CURSOR, onCanvasCursor);
      socket.off(REALTIME_EVENTS.ROOM_CANVAS_CLEAR, onCanvasClear);
    };
  }, [roomId, currentUserId]);

  // Broadcast cursor position (throttled)
  const lastCursorEmit = React.useRef(0);
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.round((e.clientX - rect.left) / zoom);
    const y = Math.round((e.clientY - rect.top) / zoom);

    // If dragging an element
    if (draggedElementId) {
      setElements((prev) =>
        prev.map((el) => {
          if (el.id === draggedElementId) {
            return {
              ...el,
              x: Math.max(10, x - dragOffset.x),
              y: Math.max(10, y - dragOffset.y),
            };
          }
          return el;
        })
      );
    }

    // Throttle cursor emit to 40ms (~25fps)
    const now = Date.now();
    if (now - lastCursorEmit.current > 40) {
      lastCursorEmit.current = now;
      const socket = realtime.getSocket();
      if (socket && roomId) {
        socket.emit(REALTIME_EVENTS.ROOM_CANVAS_CURSOR, {
          roomId,
          userId: currentUserId || 'me',
          userName: currentUserName,
          x,
          y,
          color: userColor,
        });
      }
    }
  };

  const handlePointerUp = () => {
    if (draggedElementId) {
      // Broadcast updated element placement
      const updated = elements.find((el) => el.id === draggedElementId);
      if (updated) {
        const socket = realtime.getSocket();
        if (socket && roomId) {
          socket.emit(REALTIME_EVENTS.ROOM_CANVAS_UPDATE, {
            roomId,
            elements: [updated],
            action: 'UPSERT',
            updatedBy: currentUserName,
          });
        }
      }
      setDraggedElementId(null);
    }
  };

  // Canvas Click: Place chosen tool element
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.round((e.clientX - rect.left) / zoom);
    const y = Math.round((e.clientY - rect.top) / zoom);

    if (selectedTool === 'SELECT') {
      setSelectedElementId(null);
      setConnectorStartId(null);
      return;
    }

    const newId = `el-${Date.now()}`;
    let newElement: CanvasElement | null = null;

    if (selectedTool === 'STICKY') {
      newElement = {
        id: newId,
        type: 'STICKY',
        x,
        y,
        width: 180,
        height: 130,
        title: 'Sticky Note',
        content: 'Double click to edit idea',
        color: '#FBBF24', // Amber
        authorName: currentUserName,
      };
    } else if (selectedTool === 'SERVICE') {
      newElement = {
        id: newId,
        type: 'SERVICE',
        x,
        y,
        width: 220,
        height: 110,
        title: 'New Service',
        content: 'Microservice Container',
        color: '#06B6D4',
      };
    } else if (selectedTool === 'DATABASE') {
      newElement = {
        id: newId,
        type: 'DATABASE',
        x,
        y,
        width: 200,
        height: 110,
        title: 'Data Store',
        content: 'PostgreSQL / Redis Cache',
        color: '#8B5CF6',
      };
    } else if (selectedTool === 'QUEUE') {
      newElement = {
        id: newId,
        type: 'QUEUE',
        x,
        y,
        width: 210,
        height: 110,
        title: 'Event Bus',
        content: 'Pub/Sub Broker',
        color: '#EF4444',
      };
    } else if (selectedTool === 'GATEWAY') {
      newElement = {
        id: newId,
        type: 'GATEWAY',
        x,
        y,
        width: 210,
        height: 110,
        title: 'API Gateway',
        content: 'Reverse Proxy & Auth',
        color: '#6366F1',
      };
    } else if (selectedTool === 'TEXT') {
      newElement = {
        id: newId,
        type: 'TEXT',
        x,
        y,
        title: 'Architecture Title',
        color: '#FFFFFF',
      };
    }

    if (newElement) {
      const updatedElements = [...elements, newElement];
      setElements(updatedElements);
      setSelectedTool('SELECT');

      // Broadcast
      const socket = realtime.getSocket();
      if (socket && roomId) {
        socket.emit(REALTIME_EVENTS.ROOM_CANVAS_UPDATE, {
          roomId,
          elements: [newElement],
          action: 'UPSERT',
          updatedBy: currentUserName,
        });
      }
    }
  };

  // Node Element Click
  const handleElementClick = (e: React.MouseEvent, el: CanvasElement) => {
    e.stopPropagation();
    setSelectedElementId(el.id);

    // If drawing connector
    if (selectedTool === 'CONNECTOR') {
      if (!connectorStartId) {
        setConnectorStartId(el.id);
      } else if (connectorStartId !== el.id) {
        // Create connector
        const newConnector: CanvasElement = {
          id: `conn-${Date.now()}`,
          type: 'CONNECTOR',
          x: 0,
          y: 0,
          fromId: connectorStartId,
          toId: el.id,
          label: 'gRPC / PubSub',
          color: '#38BDF8',
        };
        const updated = [...elements, newConnector];
        setElements(updated);
        setConnectorStartId(null);
        setSelectedTool('SELECT');

        // Broadcast
        const socket = realtime.getSocket();
        if (socket && roomId) {
          socket.emit(REALTIME_EVENTS.ROOM_CANVAS_UPDATE, {
            roomId,
            elements: [newConnector],
            action: 'UPSERT',
            updatedBy: currentUserName,
          });
        }
      }
    }
  };

  const handleElementMouseDown = (e: React.MouseEvent, el: CanvasElement) => {
    if (selectedTool !== 'SELECT') return;
    e.stopPropagation();
    setDraggedElementId(el.id);
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const pointerX = (e.clientX - rect.left) / zoom;
      const pointerY = (e.clientY - rect.top) / zoom;
      setDragOffset({ x: pointerX - el.x, y: pointerY - el.y });
    }
  };

  // Delete Element
  const handleDeleteSelected = () => {
    if (!selectedElementId) return;
    setElements((prev) => prev.filter((el) => el.id !== selectedElementId && el.fromId !== selectedElementId && el.toId !== selectedElementId));
    setSelectedElementId(null);
  };

  // Clear Canvas
  const handleClearCanvas = () => {
    if (confirm('Clear collaborative whiteboard canvas for all participants?')) {
      setElements([]);
      const socket = realtime.getSocket();
      if (socket && roomId) {
        socket.emit(REALTIME_EVENTS.ROOM_CANVAS_CLEAR, { roomId });
      }
    }
  };

  // Trigger AI Voice-to-Canvas
  const handleGenerateAiArchitecture = async (promptToUse?: string) => {
    const text = promptToUse || aiPrompt;
    if (!text.trim() || isGeneratingAi) return;

    setIsGeneratingAi(true);
    try {
      const userKey = localStorage.getItem('mivo_gemini_api_key') || undefined;
      const res = await api.post<any>('/api/v1/ai/canvas-generate', {
        prompt: text,
        apiKey: userKey,
      });

      if (res.success && res.data?.elements) {
        const newEls: CanvasElement[] = res.data.elements;
        setElements((prev) => {
          const map = new Map(prev.map((el) => [el.id, el]));
          newEls.forEach((el) => map.set(el.id, el));
          return Array.from(map.values());
        });

        // Broadcast to all attendees via Socket
        const socket = realtime.getSocket();
        if (socket && roomId) {
          socket.emit(REALTIME_EVENTS.ROOM_CANVAS_UPDATE, {
            roomId,
            elements: newEls,
            action: 'UPSERT',
            summary: res.data.summary,
            updatedBy: 'Mivo AI Architect',
          });
        }
      }
    } catch (err) {
      console.warn('AI Canvas generation error:', err);
    } finally {
      setIsGeneratingAi(false);
      setAiPrompt('');
    }
  };

  // Ambient Voice Recognition for AI Canvas
  const toggleVoiceListening = () => {
    if (isVoiceListening) {
      setIsVoiceListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Web Speech API is not supported in this browser.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsVoiceListening(true);
      recognition.onend = () => setIsVoiceListening(false);
      recognition.onerror = () => setIsVoiceListening(false);

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setAiPrompt(transcript);
          handleGenerateAiArchitecture(transcript);
        }
      };

      recognition.start();
    } catch (e) {
      console.warn('Speech recognition error:', e);
      setIsVoiceListening(false);
    }
  };

  // Quick prompt chips
  const quickChips = [
    "Let's build a microservice with an auth gateway and Redis pub/sub",
    'Event-Driven Microservices with Kafka & PostgreSQL',
    'WebRTC Mesh Media Pipeline with SFU Relay',
  ];

  // Helper to resolve connector coordinates
  const elementMap = React.useMemo(() => new Map(elements.map((el) => [el.id, el])), [elements]);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0a0a0c] overflow-hidden select-none relative">
      {/* Top Whiteboard Header Bar */}
      <div className="h-14 border-b border-white/[0.08] px-4 flex items-center justify-between bg-zinc-950/80 backdrop-blur-xl z-20">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-amber-500/20 to-yellow-500/10 text-amber-400 border border-amber-500/30 shadow-md">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white tracking-wide">
                Canvas Stage • #{roomName}
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono font-semibold border border-amber-500/30 animate-pulse">
                6TH MODE ACTIVE
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 flex items-center gap-2">
              <span>Infinite Multiplayer Whiteboard & Flowchart Engine</span>
              <span>•</span>
              <span className="text-zinc-300">{participants.length} Active Collaborators</span>
            </p>
          </div>
        </div>

        {/* AI Voice-to-Canvas Bar */}
        <div className="flex items-center gap-2 max-w-xl flex-1 mx-4">
          <div className="relative flex-1 flex items-center">
            <input
              type="text"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleGenerateAiArchitecture()}
              placeholder="Speak or type: 'Let's build a microservice with auth gateway and Redis'..."
              className="w-full pl-9 pr-20 py-1.5 rounded-xl bg-white/[0.05] border border-white/[0.1] text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500/60 transition-all"
            />
            <Sparkles className="w-3.5 h-3.5 text-amber-400 absolute left-3 pointer-events-none" />

            <div className="absolute right-1.5 flex items-center gap-1">
              <button
                type="button"
                onClick={toggleVoiceListening}
                className={`p-1 rounded-lg transition-all cursor-pointer ${
                  isVoiceListening ? 'bg-rose-600 text-white animate-pulse' : 'hover:bg-white/10 text-zinc-400 hover:text-white'
                }`}
                title="Voice-to-Canvas Audio Dictation"
              >
                <Mic className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleGenerateAiArchitecture()}
                disabled={isGeneratingAi || !aiPrompt.trim()}
                className="px-2 py-0.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-[10px] transition-all cursor-pointer disabled:opacity-40"
              >
                {isGeneratingAi ? 'Rendering...' : 'Generate'}
              </button>
            </div>
          </div>
        </div>

        {/* Zoom & Action Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white/[0.04] border border-white/[0.08] rounded-xl p-1">
            <button
              onClick={() => setZoom((z) => Math.max(0.4, z - 0.1))}
              className="p-1 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono font-bold text-zinc-300 px-2 min-w-[42px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.min(2.0, z + 0.1))}
              className="p-1 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoom(1.0)}
              className="p-1 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white cursor-pointer border-l border-white/[0.08] ml-1"
              title="Reset Zoom"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>

          <button
            onClick={handleClearCanvas}
            className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/20 transition-all cursor-pointer"
            title="Clear Canvas"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quick Prompt Chips */}
      <div className="px-4 py-2 bg-zinc-950/40 border-b border-white/[0.04] flex items-center gap-2 overflow-x-auto z-10">
        <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider flex-shrink-0">
          AI Architecture Seeds:
        </span>
        {quickChips.map((chip, idx) => (
          <button
            key={idx}
            onClick={() => handleGenerateAiArchitecture(chip)}
            className="px-2.5 py-1 rounded-lg bg-white/[0.03] hover:bg-amber-500/15 border border-white/[0.06] hover:border-amber-500/30 text-[11px] text-zinc-300 hover:text-amber-200 transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5"
          >
            <Sparkles className="w-2.5 h-2.5 text-amber-400" />
            <span>{chip}</span>
          </button>
        ))}
      </div>

      {/* Main Canvas Workspace */}
      <div
        ref={containerRef}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onClick={handleCanvasClick}
        style={{
          backgroundImage:
            'radial-gradient(circle, rgba(255, 255, 255, 0.08) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
        className="flex-1 w-full h-full relative overflow-hidden cursor-crosshair"
      >
        {/* Floating Whiteboard Left Toolbar */}
        <div className="absolute left-4 top-4 flex flex-col gap-1.5 p-1.5 rounded-2xl bg-zinc-950/90 border border-white/[0.1] shadow-2xl backdrop-blur-xl z-30">
          {[
            { id: 'SELECT', label: 'Select & Move', icon: MousePointer },
            { id: 'STICKY', label: 'Sticky Note', icon: StickyNote },
            { id: 'GATEWAY', label: 'API Gateway', icon: Shield },
            { id: 'SERVICE', label: 'Microservice', icon: Square },
            { id: 'QUEUE', label: 'Redis Pub/Sub', icon: Radio },
            { id: 'DATABASE', label: 'PostgreSQL DB', icon: Database },
            { id: 'CONNECTOR', label: 'Connect Flow', icon: ArrowRight },
            { id: 'TEXT', label: 'Text Box', icon: Type },
          ].map((tool) => {
            const Icon = tool.icon;
            const isActive = selectedTool === tool.id;
            return (
              <button
                key={tool.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedTool(tool.id as any);
                  if (tool.id !== 'CONNECTOR') setConnectorStartId(null);
                }}
                className={`p-2.5 rounded-xl transition-all cursor-pointer group relative ${
                  isActive
                    ? 'bg-amber-500 text-zinc-950 shadow-lg shadow-amber-500/30 scale-105'
                    : 'text-zinc-400 hover:text-white hover:bg-white/[0.06]'
                }`}
                title={tool.label}
              >
                <Icon className="w-4 h-4 stroke-[2.2]" />
                <span className="absolute left-full ml-2 px-2 py-1 rounded-md bg-zinc-900 border border-white/10 text-[10px] font-medium text-white opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-40 transition-opacity">
                  {tool.label}
                </span>
              </button>
            );
          })}

          {selectedElementId && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteSelected();
              }}
              className="p-2.5 rounded-xl text-rose-400 hover:bg-rose-500/20 transition-all cursor-pointer mt-2 border-t border-white/[0.08]"
              title="Delete Selected"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* SVG Connectors Layer */}
        <svg
          className="absolute inset-0 pointer-events-none w-full h-full"
          style={{ transform: `scale(${zoom})`, transformOrigin: '0 0' }}
        >
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="#38BDF8" />
            </marker>
          </defs>

          {elements
            .filter((el) => el.type === 'CONNECTOR')
            .map((conn) => {
              const from = conn.fromId ? elementMap.get(conn.fromId) : undefined;
              const to = conn.toId ? elementMap.get(conn.toId) : undefined;
              if (!from || !to) return null;

              const x1 = from.x + (from.width || 200) / 2;
              const y1 = from.y + (from.height || 110) / 2;
              const x2 = to.x + (to.width || 200) / 2;
              const y2 = to.y + (to.height || 110) / 2;
              const midX = (x1 + x2) / 2;
              const midY = (y1 + y2) / 2;

              return (
                <g key={conn.id}>
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={conn.color || '#38BDF8'}
                    strokeWidth="2.5"
                    strokeDasharray="4 2"
                    markerEnd="url(#arrowhead)"
                    className="transition-all"
                  />
                  {conn.label && (
                    <g transform={`translate(${midX}, ${midY})`}>
                      <rect
                        x="-45"
                        y="-12"
                        width="90"
                        height="20"
                        rx="6"
                        fill="#18181b"
                        stroke={conn.color || '#38BDF8'}
                        strokeWidth="1"
                      />
                      <text
                        x="0"
                        y="2"
                        textAnchor="middle"
                        fill="#F3F4F6"
                        fontSize="9"
                        fontWeight="bold"
                        fontFamily="monospace"
                      >
                        {conn.label}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
        </svg>

        {/* Canvas Elements Canvas */}
        <div
          style={{ transform: `scale(${zoom})`, transformOrigin: '0 0' }}
          className="absolute inset-0 pointer-events-auto"
        >
          {elements
            .filter((el) => el.type !== 'CONNECTOR')
            .map((el) => {
              const isSelected = selectedElementId === el.id;
              const isConnectingStart = connectorStartId === el.id;

              return (
                <div
                  key={el.id}
                  onClick={(e) => handleElementClick(e, el)}
                  onMouseDown={(e) => handleElementMouseDown(e, el)}
                  style={{
                    left: `${el.x}px`,
                    top: `${el.y}px`,
                    width: el.width ? `${el.width}px` : 'auto',
                    minHeight: el.height ? `${el.height}px` : 'auto',
                  }}
                  className={`absolute rounded-2xl p-3.5 transition-shadow select-none shadow-xl cursor-grab active:cursor-grabbing backdrop-blur-md ${
                    isConnectingStart
                      ? 'ring-4 ring-cyan-400 animate-pulse'
                      : isSelected
                      ? 'ring-2 ring-amber-400 shadow-amber-500/20'
                      : 'hover:ring-1 hover:ring-white/30'
                  } ${
                    el.type === 'STICKY'
                      ? 'bg-amber-400 text-zinc-950 shadow-amber-500/30'
                      : 'bg-zinc-900/90 border border-white/[0.12] text-white'
                  }`}
                >
                  {/* Shape Header */}
                  <div className="flex items-center justify-between pb-1.5 border-b border-black/10">
                    <div className="flex items-center gap-1.5">
                      {el.type === 'GATEWAY' && <Shield className="w-3.5 h-3.5 text-indigo-400" />}
                      {el.type === 'SERVICE' && <Square className="w-3.5 h-3.5 text-cyan-400" />}
                      {el.type === 'DATABASE' && <Database className="w-3.5 h-3.5 text-purple-400" />}
                      {el.type === 'QUEUE' && <Radio className="w-3.5 h-3.5 text-rose-400" />}
                      {el.type === 'STICKY' && <StickyNote className="w-3.5 h-3.5 text-zinc-800" />}

                      <span className="text-[11px] font-bold tracking-tight uppercase">
                        {el.title || el.type}
                      </span>
                    </div>

                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: el.color || '#38BDF8' }}
                    />
                  </div>

                  {/* Shape Body */}
                  <div className="pt-2">
                    <p
                      className={`text-[11px] leading-relaxed ${
                        el.type === 'STICKY' ? 'text-zinc-900 font-medium' : 'text-zinc-300'
                      }`}
                    >
                      {el.content || 'Configured Component'}
                    </p>
                  </div>

                  {el.authorName && (
                    <div className="mt-2 pt-1 border-t border-black/10 flex items-center justify-between">
                      <span className="text-[9px] text-zinc-700 font-semibold">
                        by {el.authorName}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
        </div>

        {/* Remote Collaborator Cursors */}
        {Array.from(remoteCursors.values()).map((cursor) => (
          <div
            key={cursor.userId}
            style={{
              left: `${cursor.x * zoom}px`,
              top: `${cursor.y * zoom}px`,
              transition: 'all 0.06s ease-out',
            }}
            className="absolute pointer-events-none z-50 flex items-center gap-1 -translate-x-1 -translate-y-1"
          >
            <MousePointer
              className="w-4 h-4 drop-shadow-md"
              style={{ color: cursor.color, fill: cursor.color }}
            />
            <span
              style={{ backgroundColor: cursor.color }}
              className="px-1.5 py-0.5 rounded-full text-[10px] font-bold text-zinc-950 shadow-md font-mono whitespace-nowrap"
            >
              {cursor.userName}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
