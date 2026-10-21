import { SfuRoomStatsDTO, SfuSimulcastLayer, REALTIME_EVENTS } from '@mivo/shared';
import { realtime } from './socket-client';

export class SfuClientManager {
  private currentLayer: SfuSimulcastLayer = '1080p';
  private engineMode: 'SFU_ROUTER' | 'P2P_MESH' = 'SFU_ROUTER';
  private stats: SfuRoomStatsDTO | null = null;
  private listeners: Array<(stats: SfuRoomStatsDTO) => void> = [];

  constructor() {
    this.listenForEvents();
  }

  private listenForEvents() {
    const socket = realtime.getSocket();
    if (!socket) return;

    socket.on(REALTIME_EVENTS.SFU_STATS_UPDATE, (data: any) => {
      if (data?.data) {
        this.stats = data.data;
        this.notifyListeners();
      }
    });

    socket.on(REALTIME_EVENTS.SFU_MODE_SWITCH, (data: any) => {
      if (data?.mode) {
        this.engineMode = data.mode;
        if (this.stats) {
          this.stats.engine = data.mode;
          this.notifyListeners();
        }
      }
    });
  }

  subscribe(listener: (stats: SfuRoomStatsDTO) => void) {
    this.listeners.push(listener);
    if (this.stats) listener(this.stats);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners() {
    if (this.stats) {
      this.listeners.forEach((l) => l(this.stats!));
    }
  }

  async fetchStats(roomId: string, participantCount = 6): Promise<SfuRoomStatsDTO> {
    const socket = realtime.getSocket();
    if (!socket) {
      const mockStats: SfuRoomStatsDTO = {
        roomId,
        engine: this.engineMode,
        participantCount,
        activeProducers: 2,
        activeConsumers: (participantCount - 1) * 2,
        totalIngressBandwidthKbps: 2500,
        totalEgressBandwidthKbps: 5000,
        clientCpuReductionPercent: Math.min(94, Math.round(((participantCount - 1) / participantCount) * 100)),
      };
      this.stats = mockStats;
      this.notifyListeners();
      return mockStats;
    }

    return new Promise((resolve) => {
      socket.emit(REALTIME_EVENTS.SFU_STATS_UPDATE, { roomId, participantCount }, (res: any) => {
        if (res?.success && res.data) {
          this.stats = res.data;
          this.notifyListeners();
          resolve(res.data);
        } else {
          const fallback: SfuRoomStatsDTO = {
            roomId,
            engine: this.engineMode,
            participantCount,
            activeProducers: 2,
            activeConsumers: Math.max(2, (participantCount - 1) * 2),
            totalIngressBandwidthKbps: 2500,
            totalEgressBandwidthKbps: 5000,
            clientCpuReductionPercent: 83,
          };
          this.stats = fallback;
          this.notifyListeners();
          resolve(fallback);
        }
      });
    });
  }

  async setPreferredLayer(roomId: string, layer: SfuSimulcastLayer): Promise<void> {
    this.currentLayer = layer;
    const socket = realtime.getSocket();
    const spatialMap: Record<SfuSimulcastLayer, number> = { '360p': 0, '720p': 1, '1080p': 2 };
    if (socket) {
      socket.emit(REALTIME_EVENTS.SFU_SET_PREFERRED_LAYERS, {
        roomId,
        consumerId: 'cons_local',
        spatialLayer: spatialMap[layer],
      });
    }
  }

  async toggleEngine(roomId: string, mode: 'SFU_ROUTER' | 'P2P_MESH'): Promise<void> {
    this.engineMode = mode;
    const socket = realtime.getSocket();
    if (socket) {
      socket.emit(REALTIME_EVENTS.SFU_MODE_SWITCH, { roomId, mode });
    }
    await this.fetchStats(roomId);
  }

  getCurrentLayer(): SfuSimulcastLayer {
    return this.currentLayer;
  }

  getEngineMode(): 'SFU_ROUTER' | 'P2P_MESH' {
    return this.engineMode;
  }
}

export const sfuClient = new SfuClientManager();
