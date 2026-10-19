import { io, Socket } from 'socket.io-client';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:4000';

class SocketClient {
  private socket: Socket | null = null;
  private currentToken: string | null = null;
  private joinedRooms: Set<string> = new Set();
  private listeners: Map<string, Set<(...args: any[]) => void>> = new Map();
  private isConnecting: boolean = false;

  connect(initialToken?: string): Socket {
    if (initialToken) {
      this.currentToken = initialToken;
    }

    if (this.socket?.connected) {
      return this.socket;
    }

    if (this.socket && this.isConnecting) {
      return this.socket;
    }

    this.isConnecting = true;

    this.socket = io(WS_URL, {
      auth: (cb) => {
        // Dynamic token retrieval for resilient reconnects after token rotations
        const storedToken =
          typeof window !== 'undefined'
            ? localStorage.getItem('mivo_access_token') || this.currentToken
            : this.currentToken;

        cb({ token: storedToken ? `Bearer ${storedToken}` : '' });
      },
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      randomizationFactor: 0.5,
      timeout: 10000,
    });

    // Reattach any pre-registered listeners to the active socket
    this.listeners.forEach((callbacks, event) => {
      callbacks.forEach((cb) => {
        this.socket?.on(event, cb);
      });
    });

    this.socket.on('connect', () => {
      this.isConnecting = false;
      console.log('[Realtime] Connected to Mivo Gateway (Socket.io ID:', this.socket?.id, ')');

      // Resilient Auto-Rejoin: restore room subscriptions after network drops/sleep
      this.joinedRooms.forEach((roomId) => {
        console.log(`[Realtime] Re-joining room subscription after reconnection: ${roomId}`);
        this.socket?.emit('room:join', { roomId });
      });
    });

    this.socket.on('disconnect', (reason) => {
      this.isConnecting = false;
      console.log('[Realtime] Disconnected from Gateway:', reason);
    });

    this.socket.on('connect_error', (error) => {
      this.isConnecting = false;
      console.warn('[Realtime] Gateway connection error:', error.message);
    });

    return this.socket;
  }

  trackRoomJoin(roomId: string) {
    this.joinedRooms.add(roomId);
  }

  trackRoomLeave(roomId: string) {
    this.joinedRooms.delete(roomId);
  }

  getSocket(): Socket | null {
    if (!this.socket) {
      const storedToken = typeof window !== 'undefined' ? localStorage.getItem('mivo_access_token') : null;
      if (storedToken) {
        return this.connect(storedToken);
      }
    }
    return this.socket;
  }

  isConnected(): boolean {
    return Boolean(this.socket?.connected);
  }

  on(event: string, callback: (...args: any[]) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    const s = this.getSocket();
    if (s) {
      s.on(event, callback);
    }
  }

  off(event: string, callback: (...args: any[]) => void) {
    this.listeners.get(event)?.delete(callback);
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  emit(event: string, ...args: any[]) {
    const s = this.getSocket();
    if (s) {
      s.emit(event, ...args);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.joinedRooms.clear();
    this.isConnecting = false;
  }
}

export const realtime = new SocketClient();
