import { NestFactory } from '@nestjs/core';
import { ValidationPipe, RawBodyRequest, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import * as bodyParser from 'body-parser';
import * as cookieParser from 'cookie-parser';
import { randomUUID } from 'crypto';
import { AppModule } from './app.module';
import { ACCESS_TOKEN_COOKIE, CSRF_TOKEN_COOKIE } from './auth/auth.cookies';
import { SanitizeInterceptor } from './common/sanitize.interceptor';
import { StructuredLogger } from './common/structured-logger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new StructuredLogger(),
  });
  const httpLogger = new Logger('HTTP');

  const configService = app.get(ConfigService);

  // Cookies + raw body (webhooks)
  app.use(cookieParser());
  app.use(
    bodyParser.json({
      limit: '1mb',
      verify: (req: RawBodyRequest<Request>, _res: Response, buf: Buffer) => {
        if (buf?.length) req.rawBody = buf;
      },
    }),
  );

  // Request logging with request id
  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    const requestId = (req.headers['x-request-id'] as string) || randomUUID();
    (req as any).requestId = requestId;
    res.setHeader('x-request-id', requestId);

    res.on('finish', () => {
      const duration = Date.now() - start;
      httpLogger.log(
        `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms reqId=${requestId}`,
      );
    });

    next();
  });

  // Sécurité — headers HTTP stricts
  app.use(
    helmet({
      hidePoweredBy: true,
      frameguard: { action: 'deny' },
      referrerPolicy: { policy: 'no-referrer' },
      crossOriginResourcePolicy: { policy: 'same-site' },
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'", 'https:', 'data:'],
          objectSrc: ["'none'"],
          upgradeInsecureRequests: [],
        },
      },
      crossOriginEmbedderPolicy: false,
      hsts: {
        maxAge: 31536000, // 1 an
        includeSubDomains: true,
        preload: true,
      },
    }),
  );

  // Permissions-Policy — désactiver les fonctionnalités sensibles non utilisées
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()',
    );
    next();
  });

  // Validation globale — rejette les champs inconnus, transforme les types
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Sanitization globale — strip HTML tags des réponses API (défense en profondeur)
  app.useGlobalInterceptors(new SanitizeInterceptor());

  // CSRF (double submit cookie)
  app.use((req: Request, res: Response, next: NextFunction) => {
    const method = req.method.toUpperCase();
    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return next();

    // CSRF exempt: auth registration/login routes, password reset, email verification, and payment webhooks
    // Note: /api/auth/logout is NOT exempted — it requires CSRF protection
    const csrfExempt = [
      '/api/auth/register',
      '/api/auth/login',
      '/api/auth/refresh',
      '/api/auth/google',
      '/api/auth/forgot-password',
      '/api/auth/reset-password',
      '/api/auth/resend-verification',
      '/api/auth/verify-email',
      '/api/payment/webhook',
    ];
    if (csrfExempt.some((prefix) => req.path.startsWith(prefix))) return next();

    const accessToken = (req as any)?.cookies?.[ACCESS_TOKEN_COOKIE];
    if (!accessToken) return next();

    const csrfCookie = (req as any)?.cookies?.[CSRF_TOKEN_COOKIE];
    const csrfHeader = req.headers['x-csrf-token'];

    if (!csrfCookie || !csrfHeader || csrfHeader !== csrfCookie) {
      return res.status(403).json({ message: 'CSRF token invalide' });
    }

    return next();
  });

  // CORS — origines autorisées depuis .env, fallback localhost
  const allowedOrigins = configService
    .get<string>('CORS_ORIGINS', 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim());

  app.enableCors({
    origin: (origin, callback) => {
      // En production, rejeter les requêtes sans origin (sauf healthcheck/curl)
      const isProduction = configService.get('NODE_ENV') === 'production';
      if (!origin) {
        if (isProduction) {
          callback(new Error('Origin manquante — requête rejetée en production'));
        } else {
          callback(null, true);
        }
      } else if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} non autorisée par CORS`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
    maxAge: 86400, // preflight cache 24h
  });

  // Prefix API
  app.setGlobalPrefix('api');

  const port = configService.get<number>('API_PORT') || 4000;

  const logger = new Logger('Bootstrap');
  await app.listen(port);
  logger.log(`🚀 XEARN API running on http://localhost:${port}`);
}
bootstrap();
