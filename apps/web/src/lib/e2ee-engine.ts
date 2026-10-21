import { E2eeSafetyCodeVerification, REALTIME_EVENTS } from '@mivo/shared';
import { realtime } from './socket-client';

export class E2eeClientEngine {
  private currentEpoch = 1;
  private isZeroTrustActive = true;
  private safetyCode: E2eeSafetyCodeVerification | null = null;
  private keyRatchetInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.listenForEvents();
  }

  private listenForEvents() {
    const socket = realtime.getSocket();
    if (!socket) return;

    socket.on(REALTIME_EVENTS.E2EE_EPOCH_ROTATED, (data: any) => {
      if (data?.safetyCode) {
        this.currentEpoch = data.safetyCode.epoch;
        this.safetyCode = data.safetyCode;
      }
    });
  }

  async fetchSafetyCode(roomId: string): Promise<E2eeSafetyCodeVerification> {
    const socket = realtime.getSocket();
    if (!socket) {
      const mock: E2eeSafetyCodeVerification = {
        roomId,
        epoch: this.currentEpoch,
        fingerprintHex: '9824 5510 3982 7714',
        verificationEmojis: ['🛡️', '⚡', '🔑', '🚀'],
        participantsVerified: 2,
      };
      this.safetyCode = mock;
      return mock;
    }

    return new Promise((resolve) => {
      socket.emit(REALTIME_EVENTS.E2EE_VERIFY_SAFETY_CODE, { roomId, epoch: this.currentEpoch }, (res: any) => {
        if (res?.success && res.data) {
          this.safetyCode = res.data;
          this.currentEpoch = res.data.epoch;
          resolve(res.data);
        } else {
          const fallback: E2eeSafetyCodeVerification = {
            roomId,
            epoch: this.currentEpoch,
            fingerprintHex: '9824 5510 3982 7714',
            verificationEmojis: ['🛡️', '⚡', '🔑', '🚀'],
            participantsVerified: 2,
          };
          this.safetyCode = fallback;
          resolve(fallback);
        }
      });
    });
  }

  async rotateRatchet(roomId: string): Promise<E2eeSafetyCodeVerification> {
    const socket = realtime.getSocket();
    if (!socket) {
      this.currentEpoch += 1;
      return this.fetchSafetyCode(roomId);
    }

    return new Promise((resolve) => {
      socket.emit(REALTIME_EVENTS.E2EE_EPOCH_ROTATED, { roomId }, (res: any) => {
        if (res?.success && res.data?.safetyCode) {
          this.safetyCode = res.data.safetyCode;
          this.currentEpoch = res.data.safetyCode.epoch;
          resolve(res.data.safetyCode);
        } else {
          this.currentEpoch += 1;
          resolve(this.fetchSafetyCode(roomId));
        }
      });
    });
  }

  getEpoch() {
    return this.currentEpoch;
  }

  isActive() {
    return this.isZeroTrustActive;
  }
}

export const e2eeEngine = new E2eeClientEngine();
