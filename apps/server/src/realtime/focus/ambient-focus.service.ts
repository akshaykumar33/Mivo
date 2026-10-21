import { Injectable, Logger } from '@nestjs/common';
import { PomodoroTimerState, AmbientTrackType, PomodoroState } from '@mivo/shared';

@Injectable()
export class AmbientFocusService {
  private readonly logger = new Logger(AmbientFocusService.name);
  private roomTimers = new Map<string, PomodoroTimerState>();
  private intervals = new Map<string, NodeJS.Timeout>();

  /**
   * Get or initialize focus state for a room
   */
  getOrCreateState(roomId: string): PomodoroTimerState {
    let state = this.roomTimers.get(roomId);
    if (!state) {
      state = {
        roomId,
        state: 'IDLE',
        remainingSeconds: 25 * 60,
        totalDurationSeconds: 25 * 60,
        isRunning: false,
        startedAt: null,
        currentTrack: 'lofi_beats',
        ambientVolume: 0.7,
        spatialImmersion: 0.85,
        focusedParticipantIds: [],
      };
      this.roomTimers.set(roomId, state);
    }
    return state;
  }

  /**
   * Perform timer action (start, pause, reset, switch_phase)
   */
  handleTimerAction(
    roomId: string,
    action: 'START' | 'PAUSE' | 'RESET' | 'START_BREAK',
    durationMinutes?: number,
  ): PomodoroTimerState {
    const state = this.getOrCreateState(roomId);

    if (action === 'START') {
      state.isRunning = true;
      state.startedAt = new Date().toISOString();
      if (state.state === 'IDLE') {
        state.state = 'FOCUS';
        const dur = (durationMinutes || 25) * 60;
        state.remainingSeconds = dur;
        state.totalDurationSeconds = dur;
      }
      this.ensureTicker(roomId);
    } else if (action === 'PAUSE') {
      state.isRunning = false;
      this.clearTicker(roomId);
    } else if (action === 'RESET') {
      state.isRunning = false;
      state.state = 'IDLE';
      state.remainingSeconds = 25 * 60;
      state.totalDurationSeconds = 25 * 60;
      state.startedAt = null;
      this.clearTicker(roomId);
    } else if (action === 'START_BREAK') {
      state.isRunning = true;
      state.state = 'SHORT_BREAK';
      const dur = (durationMinutes || 5) * 60;
      state.remainingSeconds = dur;
      state.totalDurationSeconds = dur;
      state.startedAt = new Date().toISOString();
      this.ensureTicker(roomId);
    }

    this.logger.log(`Room ${roomId} Focus Timer: ${action} (State: ${state.state}, Remaining: ${state.remainingSeconds}s)`);
    return state;
  }

  /**
   * Change ambient soundtrack
   */
  setAmbientTrack(roomId: string, track: AmbientTrackType, volume?: number, spatial?: number): PomodoroTimerState {
    const state = this.getOrCreateState(roomId);
    state.currentTrack = track;
    if (volume !== undefined) state.ambientVolume = Math.max(0, Math.min(1, volume));
    if (spatial !== undefined) state.spatialImmersion = Math.max(0, Math.min(1, spatial));
    this.logger.log(`Room ${roomId} ambient track updated to ${track}`);
    return state;
  }

  joinFocus(roomId: string, userId: string): PomodoroTimerState {
    const state = this.getOrCreateState(roomId);
    if (!state.focusedParticipantIds.includes(userId)) {
      state.focusedParticipantIds.push(userId);
    }
    return state;
  }

  leaveFocus(roomId: string, userId: string): PomodoroTimerState {
    const state = this.getOrCreateState(roomId);
    state.focusedParticipantIds = state.focusedParticipantIds.filter((id) => id !== userId);
    return state;
  }

  private ensureTicker(roomId: string) {
    if (this.intervals.has(roomId)) return;
    const interval = setInterval(() => {
      const state = this.roomTimers.get(roomId);
      if (!state || !state.isRunning) {
        this.clearTicker(roomId);
        return;
      }

      if (state.remainingSeconds > 0) {
        state.remainingSeconds -= 1;
      } else {
        // Phase transition: FOCUS -> SHORT_BREAK or BREAK -> IDLE
        if (state.state === 'FOCUS') {
          state.state = 'SHORT_BREAK';
          state.remainingSeconds = 5 * 60;
          state.totalDurationSeconds = 5 * 60;
        } else {
          state.state = 'IDLE';
          state.isRunning = false;
          state.remainingSeconds = 25 * 60;
          state.totalDurationSeconds = 25 * 60;
          this.clearTicker(roomId);
        }
      }
    }, 1000);
    this.intervals.set(roomId, interval);
  }

  private clearTicker(roomId: string) {
    const interval = this.intervals.get(roomId);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(roomId);
    }
  }
}
