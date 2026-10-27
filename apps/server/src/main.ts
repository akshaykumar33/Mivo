import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { HttpExceptionFilter } from './common/http-exception.filter.js';
import { RedisIoAdapter } from './realtime/redis-io.adapter.js';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security Middlewares
  app.use(helmet());
  app.use(cookieParser());

  // CORS
  app.enableCors({
    origin: (origin, callback) => {
      if (
        !origin ||
        origin.startsWith('http://localhost:') ||
        origin.startsWith('http://127.0.0.1:') ||
        origin === process.env.CORS_ORIGIN
      ) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
  });

  // Global Exception Filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Production-Grade Redis Socket.io Adapter
  const redisIoAdapter = new RedisIoAdapter(app);
  await redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);

  const port = process.env.PORT || 4000;
  await app.listen(port, '0.0.0.0');
  console.log(`[Server] Mivo Backend Server running on http://0.0.0.0:${port}`);
}

process.on('unhandledRejection', (reason) => {
  console.warn('[Process] Unhandled Rejection intercepted:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[Process] Uncaught Exception intercepted:', err);
});

bootstrap();
