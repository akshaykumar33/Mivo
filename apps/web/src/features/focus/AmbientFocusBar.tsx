'use client';

import * as React from 'react';
import {
  Volume2,
  VolumeX,
  Play,
  Pause,
  RotateCcw,
  Headphones,
  Sparkles,
  CloudRain,
  Coffee,
  Radio,
  Sliders,
  X,
  ChevronDown,
  Flame,
  Zap,
} from 'lucide-react';
import { AmbientTrackType, PomodoroTimerState, REALTIME_EVENTS } from '@mivo/shared';
import { ambientSound } from '@/lib/ambient-sound-generator';
import { realtime } from '@/lib/socket-client';

export interface AmbientFocusBarProps {
  roomId: string;
  isOpen: boolean;
  onClose: () => void;
}

const TRACKS: Array<{ id: AmbientTrackType; label: string; icon: any; color: string }> = [
  { id: 'lofi_beats', label: 'Lo-Fi Chill Beats', icon: Radio, color: '#BF5AF2' },
  { id: 'rain_storm', label: 'Rainy Window', icon: CloudRain, color: '#64D2FF' },
  { id: 'coffee_shop', label: 'Cozy Coffee Shop', icon: Coffee, color: '#FF9F0A' },
  { id: 'cyber_synthwave', label: 'Cyber Synthwave', icon: Flame, color: '#FF375F' },
];

export const AmbientFocusBar: React.FC<AmbientFocusBarProps> = ({ roomId, isOpen, onClose }) => {
  const [isPlayingSound, setIsPlayingSound] = React.useState(false);
  const [selectedTrack, setSelectedTrack] = React.useState<AmbientTrackType>('lofi_beats');
  const [volume, setVolume] = React.useState(0.5);
  const [spatialPan, setSpatialPan] = React.useState(0);
  const [pomodoro, setPomodoro] = React.useState<PomodoroTimerState>({
    roomId,
    state: 'IDLE',
    remainingSeconds: 25 * 60,
    totalDurationSeconds: 25 * 60,
    isRunning: false,
    startedAt: null,
    currentTrack: 'lofi_beats',
    ambientVolume: 0.5,
    spatialImmersion: 0.8,
    focusedParticipantIds: [],
  });

  // Listen for room-synchronized Pomodoro timer events
  React.useEffect(() => {
    const socket = realtime.getSocket();
    if (!socket || !roomId) return;

    socket.emit(REALTIME_EVENTS.FOCUS_TIMER_SYNC, { roomId }, (res: any) => {
      if (res?.success && res.data) {
        setPomodoro(res.data);
      }
    });

    const handleSync = (data: PomodoroTimerState) => {
      if (data.roomId === roomId) {
        setPomodoro(data);
      }
    };

    socket.on(REALTIME_EVENTS.FOCUS_TIMER_SYNC, handleSync);
    return () => {
      socket.off(REALTIME_EVENTS.FOCUS_TIMER_SYNC, handleSync);
    };
  }, [roomId]);

  // Local tick countdown if running
  React.useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (pomodoro.isRunning) {
      interval = setInterval(() => {
        setPomodoro((prev) => {
          if (prev.remainingSeconds <= 1) {
            return {
              ...prev,
              remainingSeconds: prev.state === 'FOCUS' ? 5 * 60 : 25 * 60,
              state: prev.state === 'FOCUS' ? 'SHORT_BREAK' : 'IDLE',
              isRunning: prev.state === 'FOCUS',
            };
          }
          return { ...prev, remainingSeconds: prev.remainingSeconds - 1 };
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [pomodoro.isRunning]);

  if (!isOpen) return null;

  const handleToggleSound = () => {
    if (isPlayingSound) {
      ambientSound.stop();
      setIsPlayingSound(false);
    } else {
      ambientSound.playTrack(selectedTrack, volume, spatialPan);
      setIsPlayingSound(true);
    }
  };

  const handleSelectTrack = (track: AmbientTrackType) => {
    setSelectedTrack(track);
    if (isPlayingSound) {
      ambientSound.playTrack(track, volume, spatialPan);
    }
    const socket = realtime.getSocket();
    if (socket) {
      socket.emit(REALTIME_EVENTS.FOCUS_TRACK_CHANGE, { roomId, track, volume, spatial: spatialPan });
    }
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    ambientSound.setVolume(newVol);
  };

  const handleSpatialChange = (newPan: number) => {
    setSpatialPan(newPan);
    ambientSound.setSpatialPan(newPan);
  };

  const handlePomodoroAction = (action: 'START' | 'PAUSE' | 'RESET' | 'START_BREAK') => {
    const socket = realtime.getSocket();
    if (socket) {
      socket.emit(REALTIME_EVENTS.FOCUS_TIMER_ACTION, { roomId, action });
    }
  };

  const mins = Math.floor(pomodoro.remainingSeconds / 60);
  const secs = pomodoro.remainingSeconds % 60;
  const timeFormatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  const progressPercent = Math.max(
    0,
    Math.min(100, ((pomodoro.totalDurationSeconds - pomodoro.remainingSeconds) / pomodoro.totalDurationSeconds) * 100)
  );

  return (
    <div className="absolute top-16 right-4 z-40 w-80 sm:w-96 bg-[var(--bg-surface-0)]/95 backdrop-blur-2xl border border-[var(--border-subtle)] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-fadeIn select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[var(--bg-surface-1)] border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#BF5AF2] to-[#FF375F] flex items-center justify-center text-white shadow-sm">
            <Headphones className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-[var(--text-primary)] font-display">
              Ambient Spatial Focus
            </h4>
            <span className="text-[10px] text-[var(--text-muted)]">
              Room-Synchronized Flow & Pomodoro
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Pomodoro Timer Hero Card */}
        <div className="p-3.5 rounded-xl bg-gradient-to-br from-[#1E2235]/60 to-[#141622]/80 border border-[#2B304A] flex items-center justify-between">
          <div>
            <span className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 mb-0.5 ${
              pomodoro.state === 'SHORT_BREAK' ? 'text-[#30D158]' : 'text-[#BF5AF2]'
            }`}>
              {pomodoro.state === 'SHORT_BREAK' ? (
                <>
                  <Coffee className="w-3 h-3" />
                  <span>Rest Break</span>
                </>
              ) : (
                <>
                  <Zap className="w-3 h-3" />
                  <span>Deep Focus Sprint</span>
                </>
              )}
            </span>
            <div className="text-3xl font-mono font-bold text-white tracking-tight">
              {timeFormatted}
            </div>
            <span className="text-[10px] text-[var(--text-muted)]">
              {pomodoro.isRunning ? 'Synchronized across stage' : 'Sprint paused'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePomodoroAction(pomodoro.isRunning ? 'PAUSE' : 'START')}
              className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105 cursor-pointer ${
                pomodoro.isRunning
                  ? 'bg-[#FF9F0A] text-black'
                  : 'bg-[#5E5CE6] text-white hover:bg-[#5E5CE6]/90'
              }`}
              title={pomodoro.isRunning ? 'Pause Pomodoro' : 'Start Pomodoro'}
            >
              {pomodoro.isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
            </button>
            <button
              onClick={() => handlePomodoroAction('RESET')}
              className="p-2.5 rounded-full bg-[var(--bg-surface-2)] text-[var(--text-secondary)] hover:text-white transition-colors cursor-pointer"
              title="Reset Timer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Ambient Track Selector */}
        <div>
          <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-2">
            Ambient Sound Engine
          </span>
          <div className="grid grid-cols-2 gap-2">
            {TRACKS.map((t) => {
              const isSelected = selectedTrack === t.id;
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => handleSelectTrack(t.id)}
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[var(--bg-surface-2)] text-[var(--text-primary)] border-[#5E5CE6] shadow-sm'
                      : 'bg-[var(--bg-surface-1)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border-[var(--border-subtle)]'
                  }`}
                >
                  <div
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-white"
                    style={{ backgroundColor: t.color }}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="truncate">{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Volume & Spatial Immersion Sliders */}
        <div className="space-y-2.5 pt-1 border-t border-[var(--border-subtle)] text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[var(--text-secondary)] flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 text-[#5E5CE6]" />
              <span>Ambient Volume</span>
            </span>
            <span className="font-mono text-[11px] text-[var(--text-muted)]">
              {Math.round(volume * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-[var(--bg-surface-2)] rounded-lg appearance-none cursor-pointer accent-[#5E5CE6]"
          />

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-[var(--text-secondary)] flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-[#30D158]" />
              <span>3D Spatial Pan</span>
            </span>
            <span className="font-mono text-[11px] text-[var(--text-muted)]">
              {spatialPan === 0 ? 'Center' : spatialPan < 0 ? `L ${Math.abs(Math.round(spatialPan * 100))}%` : `R ${Math.round(spatialPan * 100)}%`}
            </span>
          </div>
          <input
            type="range"
            min="-1"
            max="1"
            step="0.1"
            value={spatialPan}
            onChange={(e) => handleSpatialChange(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-[var(--bg-surface-2)] rounded-lg appearance-none cursor-pointer accent-[#30D158]"
          />
        </div>

        {/* Play / Mute Sound Toggle Button */}
        <button
          onClick={handleToggleSound}
          className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer ${
            isPlayingSound
              ? 'bg-[#FF453A]/20 text-[#FF453A] border border-[#FF453A]/30 hover:bg-[#FF453A]/30'
              : 'bg-[#5E5CE6] text-white hover:bg-[#5E5CE6]/90'
          }`}
        >
          {isPlayingSound ? (
            <>
              <VolumeX className="w-4 h-4" />
              <span>Mute Background Audio</span>
            </>
          ) : (
            <>
              <Volume2 className="w-4 h-4" />
              <span>Play Spatial Audio</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
