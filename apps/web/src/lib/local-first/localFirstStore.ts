import { CrdtMessageMutation, CrdtSyncBatchPayload, CrdtSyncBatchResponse, REALTIME_EVENTS } from '@mivo/shared';
import { api } from '@/lib/api-client';
import { realtime } from '@/lib/socket-client';

const STORAGE_KEY = 'mivo_crdt_outbox_queue';

class LocalFirstStore {
  private outbox: CrdtMessageMutation[] = [];
  private lamportClock = 1;
  private isOnline = true;
  private isSyncing = false;
  private listeners: Array<(outboxCount: number, isOnline: boolean) => void> = [];

  constructor() {
    this.loadFromStorage();
    if (typeof window !== 'undefined') {
      this.isOnline = navigator.onLine;
      window.addEventListener('online', () => this.handleNetworkChange(true));
      window.addEventListener('offline', () => this.handleNetworkChange(false));
    }
  }

  private loadFromStorage() {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        this.outbox = JSON.parse(saved);
        this.lamportClock = Math.max(1, this.outbox.length + 1);
      }
    } catch {}
  }

  private saveToStorage() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.outbox));
    } catch {}
    this.notify();
  }

  subscribe(listener: (outboxCount: number, isOnline: boolean) => void) {
    this.listeners.push(listener);
    listener(this.outbox.length, this.isOnline);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l(this.outbox.length, this.isOnline));
  }

  private async handleNetworkChange(online: boolean) {
    this.isOnline = online;
    this.notify();
    if (online && this.outbox.length > 0) {
      await this.drainOutbox();
    }
  }

  /**
   * Queue mutation with 0ms optimistic latency
   */
  async queueMutation(
    mutation: Omit<CrdtMessageMutation, 'lamportClock' | 'clientTimestamp' | 'idempotencyKey'>,
  ): Promise<CrdtMessageMutation> {
    this.lamportClock += 1;
    const fullMutation: CrdtMessageMutation = {
      ...mutation,
      lamportClock: this.lamportClock,
      clientTimestamp: Date.now(),
      idempotencyKey: `idemp_${mutation.id}_${Date.now()}`,
    };

    this.outbox.push(fullMutation);
    this.saveToStorage();

    if (this.isOnline) {
      this.drainOutbox();
    }

    return fullMutation;
  }

  /**
   * Drain outbox to server
   */
  async drainOutbox(): Promise<void> {
    if (this.isSyncing || this.outbox.length === 0) return;
    this.isSyncing = true;

    try {
      const payload: CrdtSyncBatchPayload = {
        clientId: 'client_local',
        mutations: [...this.outbox],
        stateVector: { client_local: this.lamportClock },
      };

      const targetRoomId = this.outbox[0]?.roomId || '00000000-0000-0000-0000-000000000011';
      const res = await api.post<CrdtSyncBatchResponse>(
        `/api/v1/rooms/${targetRoomId}/messages/crdt-sync`,
        payload,
      );

      if (res.success && res.data) {
        const acked = new Set(res.data.acknowledgedIds);
        this.outbox = this.outbox.filter((m) => !acked.has(m.id));
        this.saveToStorage();
      }
    } catch {
      // Keep in outbox to retry next time
    } finally {
      this.isSyncing = false;
      this.notify();
    }
  }

  getPendingCount() {
    return this.outbox.length;
  }

  getIsOnline() {
    return this.isOnline;
  }
}

export const localFirstStore = new LocalFirstStore();
