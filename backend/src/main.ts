import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.setGlobalPrefix('api/v1', { exclude: ['health'] });
  app.use(helmet());

  // Render terminates TLS and forwards the original client IP through its proxy.
  // Trust the single proxy hop so rate limiting is per client, not one shared proxy IP.
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  app.use(rateLimit({
    windowMs: 60_000,
    limit: 120,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many requests. Please try again later.' },
  }));

  const allowedOrigins = new Set(
    (process.env.FRONTEND_ORIGINS || '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  );

  app.enableCors({
    origin: (origin, callback) => {
      // Native/mobile clients may omit Origin. Browser origins must be allowlisted.
      if (!origin || allowedOrigins.has(origin)) return callback(null, true);
      return callback(null, false);
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type'],
    credentials: false,
  });

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: false },
  }));

  const port = Number(process.env.PORT) || 3001;
  await app.listen(port, '0.0.0.0');
}

void bootstrap();
