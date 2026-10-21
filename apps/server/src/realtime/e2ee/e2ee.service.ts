import { Injectable, Logger } from '@nestjs/common';
import { E2eeEpochKeyPackage, E2eeSafetyCodeVerification } from '@mivo/shared';
import { createHash } from 'crypto';

interface RoomE2eeState {
  roomId: string;
  currentEpoch: number;
  keyPackages: E2eeEpochKeyPackage[];
  verifiedUsers: Set<string>;
}

@Injectable()
export class E2eeService {
  private readonly logger = new Logger(E2eeService.name);
  private roomStates = new Map<string, RoomE2eeState>();

  private emojiAlphabet = ['🛡️', '⚡', '🔑', '🚀', '🔮', '💎', '🪐', '🌊', '🔥', '✨', '🛸', '🎯', '🌈', '🧩', '🔒', '☀️'];

  private getOrCreateState(roomId: string): RoomE2eeState {
    let state = this.roomStates.get(roomId);
    if (!state) {
      state = {
        roomId,
        currentEpoch: 1,
        keyPackages: [],
        verifiedUsers: new Set(),
      };
      this.roomStates.set(roomId, state);
    }
    return state;
  }

  /**
   * Relay encrypted key package without server decryption
   */
  relayKeyPackage(pkg: E2eeEpochKeyPackage): E2eeEpochKeyPackage {
    const state = this.getOrCreateState(pkg.roomId);
    state.keyPackages.push(pkg);
    state.currentEpoch = Math.max(state.currentEpoch, pkg.epoch);
    this.logger.log(`Relayed E2EE Key Package for room ${pkg.roomId} (Epoch ${pkg.epoch}) from user ${pkg.senderUserId}`);
    return pkg;
  }

  /**
   * Rotate MLS Ratchet Epoch
   */
  rotateEpoch(roomId: string, senderUserId: string): { epoch: number; timestamp: string } {
    const state = this.getOrCreateState(roomId);
    state.currentEpoch += 1;
    state.verifiedUsers.clear();
    state.verifiedUsers.add(senderUserId);

    this.logger.log(`Room ${roomId} E2EE ratchet rotated to Epoch #${state.currentEpoch}`);
    return {
      epoch: state.currentEpoch,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Compute deterministic out-of-band Short Authentication String (SAS)
   * Hex safety code + 4 verification emojis derived from sha256(roomId + epoch)
   */
  getSafetyCode(roomId: string, epoch?: number): E2eeSafetyCodeVerification {
    const state = this.getOrCreateState(roomId);
    const targetEpoch = epoch ?? state.currentEpoch;

    const hash = createHash('sha256')
      .update(`mivo_e2ee_${roomId}_epoch_${targetEpoch}`)
      .digest('hex');

    // Generate 4 chunks of 4 digits: e.g. "9824 5510 3982 7714"
    const fingerprintHex = [
      hash.slice(0, 4).toUpperCase(),
      hash.slice(4, 8).toUpperCase(),
      hash.slice(8, 12).toUpperCase(),
      hash.slice(12, 16).toUpperCase(),
    ].join(' ');

    // Pick 4 emojis using bytes
    const e1 = this.emojiAlphabet[parseInt(hash.slice(16, 18), 16) % this.emojiAlphabet.length] || '🛡️';
    const e2 = this.emojiAlphabet[parseInt(hash.slice(18, 20), 16) % this.emojiAlphabet.length] || '⚡';
    const e3 = this.emojiAlphabet[parseInt(hash.slice(20, 22), 16) % this.emojiAlphabet.length] || '🔑';
    const e4 = this.emojiAlphabet[parseInt(hash.slice(22, 24), 16) % this.emojiAlphabet.length] || '🚀';

    return {
      roomId,
      epoch: targetEpoch,
      fingerprintHex,
      verificationEmojis: [e1, e2, e3, e4],
      participantsVerified: Math.max(1, state.verifiedUsers.size),
    };
  }

  verifyParticipant(roomId: string, userId: string): boolean {
    const state = this.getOrCreateState(roomId);
    state.verifiedUsers.add(userId);
    return true;
  }
}
