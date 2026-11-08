import 'reflect-metadata';
import { join } from 'node:path';
import { request as httpsRequest } from 'node:https';
import { json, urlencoded } from 'express';
import type { Request, Response } from 'express';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { AppModule } from './app.module';

const FIREBASE_AUTH_HOST = 'reminder-76588.firebaseapp.com';
const OWNER_ORIGIN = 'https://reminder-demo5.onrender.com';

function proxyFirebaseAuth(request: Request, response: Response): void {
  const upstream = httpsRequest({
    hostname: FIREBASE_AUTH_HOST,
    port: 443,
    method: request.method,
    path: request.originalUrl,
    headers: { ...request.headers, host: FIREBASE_AUTH_HOST },
    servername: FIREBASE_AUTH_HOST,
  }, (upstreamResponse) => {
    response.status(upstreamResponse.statusCode || 502);
    for (const [name, rawValue] of Object.entries(upstreamResponse.headers)) {
      if (rawValue === undefined || ['connection', 'keep-alive', 'transfer-encoding', 'upgrade'].includes(name.toLowerCase())) continue;
      if (name.toLowerCase() === 'set-cookie') {
        const cookies = (Array.isArray(rawValue) ? rawValue : [rawValue])
          .map((cookie) => cookie.replace(/;\s*domain=[^;]+/i, ''));
        response.setHeader(name, cookies);
        continue;
      }
      if (name.toLowerCase() === 'location') {
        const location = String(rawValue).replaceAll('https://' + FIREBASE_AUTH_HOST, OWNER_ORIGIN);
        response.setHeader(name, location);
        continue;
      }
      response.setHeader(name, rawValue);
    }
    upstreamResponse.pipe(response);
  });

  upstream.setTimeout(20_000, () => upstream.destroy(new Error('Firebase auth upstream timed out.')));
  upstream.on('error', () => {
    if (!response.headersSent) response.status(502).type('text/plain').send('Firebase Authentication proxy is temporarily unavailable.');
    else response.destroy();
  });
  request.on('aborted', () => upstream.destroy());
  response.on('close', () => {
    if (!response.writableEnded) upstream.destroy();
  });
  request.pipe(upstream);
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true, bodyParser: false });

  app.setGlobalPrefix('api/v1', { exclude: ['health'] });

  // Firebase's redirect helper must be served transparently from this origin.
  // A browser redirect (302) is not sufficient for Firebase's cross-origin storage flow.
  app.use('/__/auth', (request: Request, response: Response) => proxyFirebaseAuth(request, response));

  // Keep Firebase proxy request bodies untouched; parse application requests afterwards.
  app.use(json());
  app.use(urlencoded({ extended: true }));

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
        frameSrc: ["'self'", 'https://reminder-76588.firebaseapp.com', 'https://accounts.google.com'],
        formAction: ["'self'", 'https://accounts.google.com'],
        upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
      },
    },
  }));

  // Mount the owner console directory itself at /owner/. Mounting its parent
  // would make Express look for public/index.html instead of public/owner/index.html.
  app.useStaticAssets(join(process.cwd(), 'public', 'owner'), {
    prefix: '/owner/',
    index: ['index.html'],
    fallthrough: false,
    maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0,
  });

  app.getHttpAdapter().getInstance().get('/', (_request, response) => response.redirect(302, '/owner/'));

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
    // CORS preflight is transport negotiation, not an application API operation.
    // Do not consume the authenticated API request budget for OPTIONS requests.
    skip: (request) => request.method === 'OPTIONS',
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
