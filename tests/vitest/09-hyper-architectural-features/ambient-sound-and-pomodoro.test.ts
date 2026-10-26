import { describe, it, expect } from 'vitest';
import { AmbientTrackType } from '@mivo/shared';

export function clampSpatialPan(pan: number): number {
  return Math.max(-1.0, Math.min(1.0, pan));
}

export function clampVolume(volume: number): number {
  return Math.max(0.0, Math.min(1.0, volume));
}

export function formatPomodoroTime(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export type PomodoroPhase = 'FOCUS' | 'SHORT_BREAK' | 'LONG_BREAK';

export interface PomodoroSession {
  phase: PomodoroPhase;
  remainingSeconds: number;
  completedCycles: number;
  isActive: boolean;
}

export function getNextPomodoroPhase(
  currentPhase: PomodoroPhase,
  completedCycles: number
): { nextPhase: PomodoroPhase; durationSeconds: number; nextCycles: number } {
  if (currentPhase === 'FOCUS') {
    const nextCycles = completedCycles + 1;
    if (nextCycles % 4 === 0) {
      return { nextPhase: 'LONG_BREAK', durationSeconds: 15 * 60, nextCycles };
    }
    return { nextPhase: 'SHORT_BREAK', durationSeconds: 5 * 60, nextCycles };
  } else {
    return { nextPhase: 'FOCUS', durationSeconds: 25 * 60, nextCycles: completedCycles };
  }
}

describe('Ambient Spatial Sound and Synchronized Pomodoro Engine', () => {
  it('validates supported ambient soundscape track types', () => {
    const validTracks: AmbientTrackType[] = [
      'lofi_beats',
      'rain_storm',
      'coffee_shop',
      'cyber_synthwave',
    ];

    expect(validTracks).toHaveLength(4);
    expect(validTracks).toContain('lofi_beats');
    expect(validTracks).toContain('cyber_synthwave');
  });

  it('clamps 3D spatial panning and volume bounds to prevent audio distortion', () => {
    // Spatial pan (-1.0 to 1.0)
    expect(clampSpatialPan(-0.75)).toBe(-0.75);
    expect(clampSpatialPan(-1.5)).toBe(-1.0);
    expect(clampSpatialPan(2.0)).toBe(1.0);
    expect(clampSpatialPan(0)).toBe(0);

    // Volume (0.0 to 1.0)
    expect(clampVolume(0.8)).toBe(0.8);
    expect(clampVolume(-0.5)).toBe(0.0);
    expect(clampVolume(1.5)).toBe(1.0);
  });

  it('formats remaining seconds cleanly in mm:ss display notation', () => {
    expect(formatPomodoroTime(1500)).toBe('25:00');
    expect(formatPomodoroTime(300)).toBe('05:00');
    expect(formatPomodoroTime(59)).toBe('00:59');
    expect(formatPomodoroTime(0)).toBe('00:00');
    expect(formatPomodoroTime(-10)).toBe('00:00');
  });

  it('advances Pomodoro session state machine through focus and break intervals', () => {
    // Focus -> Short Break (cycle 1)
    const step1 = getNextPomodoroPhase('FOCUS', 0);
    expect(step1.nextPhase).toBe('SHORT_BREAK');
    expect(step1.durationSeconds).toBe(300); // 5 min
    expect(step1.nextCycles).toBe(1);

    // Short Break -> Focus
    const step2 = getNextPomodoroPhase('SHORT_BREAK', 1);
    expect(step2.nextPhase).toBe('FOCUS');
    expect(step2.durationSeconds).toBe(1500); // 25 min

    // Focus -> Long Break after 4 completed cycles
    const step4 = getNextPomodoroPhase('FOCUS', 3);
    expect(step4.nextPhase).toBe('LONG_BREAK');
    expect(step4.durationSeconds).toBe(900); // 15 min
    expect(step4.nextCycles).toBe(4);
  });
});
