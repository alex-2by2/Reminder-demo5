import 'reflect-metadata';
import { join } from 'node:path';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });

  app.setGlobalPrefix('api/v1', { exclude: ['health'] });

  app.use(helmet({
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        scriptSrc: ["'self'", 'https://www.gstatic.com'],
        styleSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https://www.gstatic.com', 'https://lh3.googleusercontent.com'],
        fontSrc: ["'self'", 'data:'],
        connectSrc: [
          "'self'",
          'https://identitytoolkit.googleapis.com',
          'https://securetoken.googleapis.com',
          'https://www.googleapis.com',
          'https://firebaseinstallations.googleapis.com',
        ],
        frameSrc: ['https://reminder-76588.firebaseapp.com', 'https://accounts.google.com'],
        formAction: ["'self'", 'https://accounts.google.com'],
        upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
      },
    },
  }));

  // The owner console is a same-origin static application served by this API.
  // Keep its assets outside the public user PWA and its service-worker scope.
  app.useStaticAssets(join(process.cwd(), 'public'), {
    prefix: '/owner/',
    index: ['index.html'],
    fallthrough: false,
    maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0,
  });

  app.getHttpAdapter().get('/', (_request, response) => response.redirect(302, '/owner/'));

  // Configure only after confirming the exact reverse-proxy hop count for the host.
  // Leaving this unset is safer than trusting spoofable forwarded headers by default.
  const trustProxyHops = process.env.TRUST_PROXY_HOPS;
  if (trustProxyHops !== undefined) {
    const parsedHops = Number(trustProxyHops);
    if (!Number.isSafeInteger(parsedHops) || parsedHops < 0) {
      throw new Error('TRUST_PROXY_HOPS must be a non-negative integer.');
    }
    app.getHttpAdapter().getInstance().set('trust proxy', parsedHops);
  }

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
      // Same-origin dashboard requests do not need CORS. Native/mobile clients may omit Origin.
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
