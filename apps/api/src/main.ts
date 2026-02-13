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

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('HTTP');

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
      logger.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms reqId=${requestId}`);
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

  // Validation globale — rejette les champs inconnus, transforme les types
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // CSRF (double submit cookie)
  app.use((req: Request, res: Response, next: NextFunction) => {
    const method = req.method.toUpperCase();
    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return next();

    const path = req.path || '';
    if (path.startsWith('/api/auth') || path.startsWith('/api/payment/webhook')) return next();

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
      // Autorise les requêtes sans origin (mobile, curl, etc.) en dev
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} non autorisée par CORS`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400, // preflight cache 24h
  });

  // Prefix API
  app.setGlobalPrefix('api');

  const port = configService.get<number>('API_PORT') || 4000;

  await app.listen(port);
  console.log(`🚀 XEARN API running on http://localhost:${port}`);
}
bootstrap();
