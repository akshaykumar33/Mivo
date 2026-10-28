'use client';

import * as React from 'react';
import {
  Bot,
  Sparkles,
  Volume2,
  VolumeX,
  Mic,
  Pin,
  PinOff,
  Zap,
  ShieldCheck,
  RotateCcw,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  X,
} from 'lucide-react';

export type AiCoHostStatus = 'IDLE' | 'LISTENING' | 'THINKING' | 'SPEAKING';

export interface AiCoHostStageTileProps {
  status: AiCoHostStatus;
  lastSpeechText: string;
  isPinned?: boolean;
  onTogglePin?: () => void;
  onTriggerCommand: (prompt: string) => void;
  onMoveLeft?: () => void;
  onMoveRight?: () => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  onClick?: () => void;
  isSpotlightHero?: boolean;
  filmstripMode?: boolean;
}

export const AiCoHostStageTile: React.FC<AiCoHostStageTileProps> = ({
  status,
  lastSpeechText,
  isPinned = false,
  onTogglePin,
  onTriggerCommand,
  onMoveLeft,
  onMoveRight,
  onDragStart,
  onDragOver,
  onDrop,
  onClick,
  isSpotlightHero = false,
  filmstripMode = false,
}) => {
  const [isMuted, setIsMuted] = React.useState(false);
  const [isInputExpanded, setIsInputExpanded] = React.useState(false);
  const [customPrompt, setCustomPrompt] = React.useState('');

  const isSpeaking = status === 'SPEAKING';
  const isThinking = status === 'THINKING';
  const isListening = status === 'LISTENING';

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPrompt.trim()) return;
    onTriggerCommand(customPrompt.trim());
    setCustomPrompt('');
    setIsInputExpanded(false);
  };

  return (
    <div
      draggable={!isSpotlightHero}
      onDragStart={!isSpotlightHero ? onDragStart : undefined}
      onDragOver={!isSpotlightHero ? onDragOver : undefined}
      onDrop={!isSpotlightHero ? onDrop : undefined}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('button, input, form, [data-prevent-tile-click]')) {
          return;
        }
        onClick?.();
      }}
      className={`relative w-full aspect-video rounded-3xl overflow-hidden bg-gradient-to-br from-[#121424] via-[#0E101D] to-[#0A0B14] border-2 transition-all duration-300 group flex flex-col justify-between p-3.5 sm:p-4 select-none shadow-xl ${
        onClick ? 'cursor-pointer' : ''
      } ${
        isSpotlightHero
          ? isSpeaking
            ? 'border-emerald-400 ring-4 ring-emerald-500/50 shadow-2xl shadow-emerald-500/30'
            : 'border-violet-500 ring-2 ring-violet-500/50 shadow-2xl shadow-violet-950/60'
          : isPinned
          ? 'border-violet-500 ring-2 ring-violet-500/40 shadow-violet-500/30'
          : isSpeaking
          ? 'border-emerald-500 shadow-emerald-500/20 ring-2 ring-emerald-500/30'
          : isThinking
          ? 'border-amber-500/80 shadow-amber-500/20 ring-2 ring-amber-500/20 animate-pulse'
          : isListening
          ? 'border-cyan-500/60 shadow-cyan-500/10'
          : filmstripMode
          ? 'border-violet-500/40 hover:border-violet-400 hover:ring-2 hover:ring-violet-500/50'
          : 'border-violet-500/40 hover:border-violet-500/70'
      }`}
    >
      {/* Background Animated Atmosphere */}
      <div className="absolute inset-0 bg-radial from-violet-600/15 via-transparent to-transparent pointer-events-none" />

      {/* Filmstrip Hover Overlay: Click to Spotlight prompt */}
      {filmstripMode && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-600/95 text-white text-[11px] font-extrabold shadow-xl border border-violet-400/40 tracking-wide uppercase">
            <Pin className="w-3 h-3 fill-current text-amber-300" />
            <span>Spotlight AI Co-Host</span>
          </div>
        </div>
      )}

      {/* Top Controls Bar */}
      <div className="flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          {/* Status Badge */}
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider backdrop-blur-md shadow-md ${
              isSpeaking
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : isThinking
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : isListening
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'bg-violet-600/20 text-violet-300 border border-violet-500/30'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isSpeaking
                  ? 'bg-emerald-400 animate-ping'
                  : isThinking
                  ? 'bg-amber-400 animate-spin'
                  : isListening
                  ? 'bg-cyan-400 animate-ping'
                  : 'bg-violet-400'
              }`}
            />
            <span>
              {isSpeaking
                ? 'Speaking'
                : isThinking
                ? 'Thinking...'
                : isListening
                ? 'Listening'
                : 'AI Co-Host'}
            </span>
          </div>

          <span className="text-[10px] text-white/50 font-bold hidden sm:inline-block">
            Gemini 3.8 Duplex
          </span>
        </div>

        {/* Pin & Tile Actions */}
        <div className="flex items-center gap-1">
          {onMoveLeft && !isSpotlightHero && (
            <button
              onClick={onMoveLeft}
              className="p-1 rounded-lg bg-black/40 hover:bg-white/[0.1] text-white/60 hover:text-white transition-all cursor-pointer opacity-0 group-hover:opacity-100"
              title="Move Tile Left"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          )}

          {onMoveRight && !isSpotlightHero && (
            <button
              onClick={onMoveRight}
              className="p-1 rounded-lg bg-black/40 hover:bg-white/[0.1] text-white/60 hover:text-white transition-all cursor-pointer opacity-0 group-hover:opacity-100"
              title="Move Tile Right"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}

          {onTogglePin && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTogglePin();
              }}
              className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
                isPinned
                  ? 'bg-violet-600/90 border-violet-400 text-white shadow-lg'
                  : 'bg-black/40 border-white/[0.08] text-white/60 hover:text-white'
              }`}
              title={isPinned ? 'Unpin Co-Host' : 'Spotlight Co-Host'}
            >
              {isPinned ? <PinOff className="w-3.5 h-3.5 text-amber-300" /> : <Pin className="w-3.5 h-3.5" />}
            </button>
          )}

          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
              isMuted
                ? 'bg-rose-600/30 border-rose-500/40 text-rose-300'
                : 'bg-black/40 border-white/[0.08] text-white/60 hover:text-white'
            }`}
            title={isMuted ? 'Unmute AI Audio' : 'Mute AI Audio'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Center Avatar & Dynamic Pulse Rings */}
      <div className="flex-1 flex flex-col items-center justify-center my-1 z-10 relative">
        <div className="relative flex items-center justify-center">
          {/* Neon Sound Pulse Waves */}
          {isSpeaking && (
            <>
              <div className="absolute w-24 h-24 rounded-full bg-emerald-500/20 animate-ping pointer-events-none" />
              <div className="absolute w-20 h-20 rounded-full bg-cyan-500/20 animate-pulse pointer-events-none" />
            </>
          )}

          {isThinking && (
            <div className="absolute w-20 h-20 rounded-full border-2 border-amber-400 border-t-transparent animate-spin pointer-events-none" />
          )}

          <div
            className={`w-14 sm:w-16 h-14 sm:h-16 rounded-2xl flex items-center justify-center shadow-2xl transition-all duration-300 ${
              isSpeaking
                ? 'bg-gradient-to-tr from-emerald-600 to-cyan-500 text-white shadow-emerald-500/40 scale-105'
                : isThinking
                ? 'bg-gradient-to-tr from-amber-600 to-violet-600 text-white shadow-amber-500/40'
                : 'bg-gradient-to-tr from-violet-600 to-indigo-600 text-white shadow-violet-600/40'
            }`}
          >
            <Bot className="w-7 sm:w-8 h-7 sm:h-8" />
          </div>
        </div>

        <div className="mt-2 text-center">
          <div className="text-xs sm:text-sm font-extrabold text-white tracking-wide font-display flex items-center justify-center gap-1.5">
            <span>Mivo AI</span>
            <span className="px-1.5 py-0.2 rounded-md bg-violet-500/30 text-violet-300 text-[9px] font-bold">
              STAGE BOT
            </span>
          </div>

          {/* Soundwave Bars */}
          {isSpeaking ? (
            <div className="flex items-center justify-center gap-1 mt-1.5 h-3.5">
              <span className="w-1 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.3s] h-3" />
              <span className="w-1 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.15s] h-4" />
              <span className="w-1 bg-emerald-400 rounded-full animate-bounce h-2.5" />
              <span className="w-1 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.2s] h-3.5" />
              <span className="w-1 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.1s] h-2" />
            </div>
          ) : (
            <span className="text-[10px] text-white/50 block mt-0.5">
              Say &quot;Mivo, ...&quot; to speak or click below
            </span>
          )}
        </div>
      </div>

      {/* Speech / Thought Bubble (if speechText exists) */}
      {lastSpeechText && (
        <div className="mb-2 p-2 rounded-2xl bg-black/60 backdrop-blur-md border border-white/[0.08] text-[11px] text-white/90 line-clamp-2 shadow-lg z-10 animate-fade-in text-center font-sans">
          &ldquo;{lastSpeechText}&rdquo;
        </div>
      )}

      {/* Bottom Quick-Action Chips */}
      <div className="flex items-center justify-center gap-1.5 flex-wrap z-10 pt-1 border-t border-white/[0.06]">
        <button
          onClick={() =>
            onTriggerCommand('Mivo, pull up our last 3 sprint tickets and summarize blockers on screen.')
          }
          className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-violet-600/30 hover:bg-violet-600/50 border border-violet-500/40 text-violet-200 text-[10px] font-bold transition-all hover:scale-105 cursor-pointer shadow-sm"
          title="Pull up Sprint Tickets & Blockers"
        >
          <Zap className="w-3 h-3 text-amber-300" />
          <span>Sprint Blockers</span>
        </button>

        <button
          onClick={() =>
            onTriggerCommand('Mivo, audit the conversation and run a live fact-check against project tickets.')
          }
          className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/40 border border-cyan-500/30 text-cyan-200 text-[10px] font-bold transition-all hover:scale-105 cursor-pointer shadow-sm"
          title="Audit Live Discussion for Fact Checks"
        >
          <ShieldCheck className="w-3 h-3 text-cyan-300" />
          <span>Fact-Check</span>
        </button>

        <button
          onClick={() => setIsInputExpanded(!isInputExpanded)}
          className="p-1 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-white/70 hover:text-white transition-all cursor-pointer"
          title="Ask custom prompt"
        >
          <MessageSquare className="w-3 h-3" />
        </button>
      </div>

      {/* Expandable Custom Command Input */}
      {isInputExpanded && (
        <form
          onSubmit={handleCustomSubmit}
          className="absolute inset-x-2 bottom-2 p-2 rounded-2xl bg-black/95 backdrop-blur-xl border border-violet-500/50 flex items-center gap-2 z-20 animate-slide-up"
        >
          <input
            type="text"
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder='Ask: "Mivo, pull up tickets..."'
            autoFocus
            className="flex-1 bg-transparent text-xs text-white placeholder-white/40 focus:outline-none px-2"
          />
          <button
            type="submit"
            className="px-3 py-1 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-[10px] transition-all cursor-pointer"
          >
            Ask
          </button>
          <button
            type="button"
            onClick={() => setIsInputExpanded(false)}
            className="p-1 text-white/40 hover:text-white cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </form>
      )}
    </div>
  );
};
