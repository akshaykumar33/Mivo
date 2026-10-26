import { describe, it, expect, beforeEach } from 'vitest';
import { E2eeClientEngine } from '@/lib/e2ee-engine';

describe('End-to-End Encryption (E2EE) and MLS Ratchet Engine', () => {
  let engine: E2eeClientEngine;

  beforeEach(() => {
    engine = new E2eeClientEngine();
  });

  it('initializes in Zero-Trust active state with epoch 1', () => {
    expect(engine.isActive()).toBe(true);
    expect(engine.getEpoch()).toBe(1);
  });

  it('generates cryptographic out-of-band SAS safety verification codes', async () => {
    const safetyCode = await engine.fetchSafetyCode('room-crypto-stage');

    expect(safetyCode.roomId).toBe('room-crypto-stage');
    expect(safetyCode.epoch).toBe(1);
    expect(safetyCode.fingerprintHex).toBe('9824 5510 3982 7714');
    expect(safetyCode.verificationEmojis).toEqual(['SAS-SHIELD', 'SAS-BOLT', 'SAS-KEY', 'SAS-ROCKET']);
    expect(safetyCode.participantsVerified).toBe(2);
  });

  it('rotates MLS ratchet advancing epochs sequentially', async () => {
    expect(engine.getEpoch()).toBe(1);

    const rotated1 = await engine.rotateRatchet('room-crypto-stage');
    expect(engine.getEpoch()).toBe(2);
    expect(rotated1.epoch).toBe(2);

    const rotated2 = await engine.rotateRatchet('room-crypto-stage');
    expect(engine.getEpoch()).toBe(3);
    expect(rotated2.epoch).toBe(3);
  });
});
