import { describe, it, expect, beforeEach } from 'vitest';
import { useRoomUIStore } from '@/stores/roomUIStore';

export function clampPiPCoordinates(
  posX: number,
  posY: number,
  viewportWidth = 1920,
  viewportHeight = 1080,
  overlayWidth = 384,
  overlayHeight = 320,
  margin = 12
) {
  const maxX = Math.max(margin, viewportWidth - overlayWidth - margin);
  const maxY = Math.max(margin, viewportHeight - overlayHeight - margin);

  return {
    x: Math.max(margin, Math.min(maxX, posX)),
    y: Math.max(margin, Math.min(maxY, posY)),
  };
}

export function computeDecibelBarHeights(audioLevel: number, isMuted: boolean) {
  if (isMuted || audioLevel <= 0) {
    return [0, 0, 0];
  }
  const levelNorm = Math.min(100, Math.max(0, audioLevel)) / 100;
  return [
    Math.round(Math.max(2, levelNorm * 10)),
    Math.round(Math.max(4, levelNorm * 12)),
    Math.round(Math.max(2, levelNorm * 8)),
  ];
}

describe('Floating Picture-in-Picture (PiP) Presenter Engine', () => {
  beforeEach(() => {
    useRoomUIStore.getState().resetUI();
  });

  it('manages PiP modal visibility toggle and explicit state setters', () => {
    const store = useRoomUIStore.getState();
    expect(useRoomUIStore.getState().isPiPOpen).toBe(false);

    store.togglePiP();
    expect(useRoomUIStore.getState().isPiPOpen).toBe(true);

    store.setIsPiPOpen(false);
    expect(useRoomUIStore.getState().isPiPOpen).toBe(false);

    store.setIsPiPOpen(true);
    expect(useRoomUIStore.getState().isPiPOpen).toBe(true);
  });

  it('clamps window coordinates within viewport boundary preventing offscreen drift', () => {
    const viewportW = 1280;
    const viewportH = 720;
    const overlayW = 384;
    const overlayH = 320;
    const margin = 12;

    // Center coordinate should remain unchanged
    const center = clampPiPCoordinates(200, 200, viewportW, viewportH, overlayW, overlayH, margin);
    expect(center).toEqual({ x: 200, y: 200 });

    // Negative coordinate should be clamped to margin
    const offTopLeft = clampPiPCoordinates(-50, -100, viewportW, viewportH, overlayW, overlayH, margin);
    expect(offTopLeft).toEqual({ x: 12, y: 12 });

    // Extreme positive coordinates should be clamped to max bounds
    const offBottomRight = clampPiPCoordinates(5000, 5000, viewportW, viewportH, overlayW, overlayH, margin);
    const expectedMaxX = 1280 - 384 - 12; // 884
    const expectedMaxY = 720 - 320 - 12;  // 388
    expect(offBottomRight).toEqual({ x: expectedMaxX, y: expectedMaxY });
  });

  it('calculates 3-bar audio equalizer heights dynamically for speaking indicator', () => {
    // Muted returns 0
    expect(computeDecibelBarHeights(80, true)).toEqual([0, 0, 0]);

    // Zero audio returns 0
    expect(computeDecibelBarHeights(0, false)).toEqual([0, 0, 0]);

    // Active speech at 50%
    const midSpeech = computeDecibelBarHeights(50, false);
    expect(midSpeech[0]).toBeGreaterThanOrEqual(2);
    expect(midSpeech[1]).toBeGreaterThanOrEqual(4);
    expect(midSpeech[2]).toBeGreaterThanOrEqual(2);

    // Max speech at 100%
    const maxSpeech = computeDecibelBarHeights(100, false);
    expect(maxSpeech).toEqual([10, 12, 8]);
  });
});
