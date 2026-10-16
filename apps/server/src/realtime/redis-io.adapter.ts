import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { INestApplicationContext, Logger } from '@nestjs/common';

export class RedisIoAdapter extends IoAdapter {
  private readonly logger = new Logger(RedisIoAdapter.name);
  private adapterConstructor: ReturnType<typeof createAdapter> | null = null;

  constructor(app: INestApplicationContext) {
    super(app);
  }

  async connectToRedis(): Promise<void> {
    const redisUrl = process.env.REDIS_URL;

    if (!redisUrl) {
      this.logger.warn('REDIS_URL not configured. Socket.io running on in-memory cluster mode.');
      return;
    }

    try {
      this.logger.log('Initializing Redis adapter for distributed Socket.io clustering...');
      const pubClient = new Redis(redisUrl, {
        connectTimeout: 5000,
        maxRetriesPerRequest: 2,
        lazyConnect: true,
      });

      await pubClient.connect();
      const subClient = pubClient.duplicate();
      await subClient.connect();

      this.adapterConstructor = createAdapter(pubClient, subClient);
      this.logger.log('🚀 Redis Socket.io adapter successfully attached (Pub/Sub active).');
    } catch (err: any) {
      this.logger.warn(`Redis connection failed (${err.message}). Falling back to in-memory Socket.io adapter.`);
      this.adapterConstructor = null;
    }
  }

  createIOServer(port: number, options?: ServerOptions): any {
    const productionOptions: ServerOptions = {
      ...options,
      cors: {
        origin: '*',
        credentials: true,
      },
      pingInterval: 10000,
      pingTimeout: 5000,
      maxHttpBufferSize: 1e6, // 1MB buffer limit for production protection
      transports: ['websocket', 'polling'],
    };

    const server = super.createIOServer(port, productionOptions);
    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }
    return server;
  }
}
