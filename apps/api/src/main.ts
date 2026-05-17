import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { ValidationPipe, RawBodyRequest, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import * as bodyParser from 'body-parser';
import * as cookieParser from 'cookie-parser';
import { randomUUID } from 'crypto';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ACCESS_TOKEN_COOKIE, CSRF_TOKEN_COOKIE } from './auth/auth.cookies';
import { SanitizeInterceptor } from './common/sanitize.interceptor';
import { StructuredLogger } from './common/structured-logger';
import { initSentry } from './common/sentry';

type RequestWithCookies = Request & {
  requestId?: string;
  cookies?: Partial<Record<typeof ACCESS_TOKEN_COOKIE | typeof CSRF_TOKEN_COOKIE, string>>;
};

async function bootstrap() {
  initSentry();

  const app = await NestFactory.create(AppModule, new ExpressAdapter(), {
    logger: new StructuredLogger(),
  });
  const httpLogger = new Logger('HTTP');

  const configService = app.get(ConfigService);

  // Fail-fast if critical secrets are missing or weak
  const requiredSecrets = ['JWT_SECRET', 'JWT_REFRESH_SECRET'];
  for (const key of requiredSecrets) {
    const secret = configService.get(key);
    if (!secret) {
      throw new Error(`Missing required env var: ${key}`);
    }
    // M3 FIX: Validate JWT secret strength (minimum 32 characters)
    if (secret.length < 32) {
      throw new Error(
        `${key} must be at least 32 characters long for security. Current length: ${secret.length}`,
      );
    }
  }

  // Trust proxy (Railway, Vercel, etc.) for correct IP extraction
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('trust proxy', 1);

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
    (req as RequestWithCookies).requestId = requestId;
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
      // M2 fix: Removed enableImplicitConversion (security risk — prevents type coercion attacks)
    }),
  );

  // Sanitization globale — strip HTML tags des réponses API (défense en profondeur)
  app.useGlobalInterceptors(new SanitizeInterceptor());

  // CSRF (double submit cookie)
  app.use((req: Request, res: Response, next: NextFunction) => {
    const method = req.method.toUpperCase();
    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return next();

    // CSRF exempt: auth registration/login routes, password reset, email verification, and payment webhooks
    // Note: /api/v1/auth/logout is NOT exempted — it requires CSRF protection
    const csrfExempt = [
      '/api/v1/auth/register',
      '/api/v1/auth/login',
      '/api/v1/auth/refresh',
      '/api/v1/auth/google',
      '/api/v1/auth/forgot-password',
      '/api/v1/auth/reset-password',
      '/api/v1/auth/resend-verification',
      '/api/v1/auth/verify-email',
      '/api/v1/payment/webhook',
    ];
    if (csrfExempt.some((prefix) => req.path.startsWith(prefix))) return next();

    // C5 fix: Always enforce CSRF on non-exempt mutating requests
    // Authenticated users must present a valid CSRF token.
    // Unauthenticated users hitting auth-guarded routes will get 401 from JwtAuthGuard.
    const request = req as RequestWithCookies;
    const accessToken = request.cookies?.[ACCESS_TOKEN_COOKIE];
    if (!accessToken) {
      // No session — CSRF not applicable (nothing to forge), skip
      return next();
    }

    const csrfCookie = request.cookies?.[CSRF_TOKEN_COOKIE];
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
    origin: (
      origin: string | undefined,
      callback: (error: Error | null, allow?: boolean) => void,
    ) => {
      // No origin = server-to-server (health checks, webhooks, curl) — allow
      if (!origin) {
        callback(null, true);
      } else if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('CORS policy violation'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
    maxAge: 86400, // preflight cache 24h
  });

  // Prefix API — versioned routes: /api/v1/auth/login, /api/v1/tasks, etc.
  // NOTE: Frontend NEXT_PUBLIC_API_URL should be updated at deploy time to include /v1
  // (e.g., the rawFetch base path changes from /api to /api/v1)
  app.setGlobalPrefix('api/v1', {
    exclude: ['health'],
  });

  if (configService.get('NODE_ENV') !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('XEARN API')
      .setDescription('API documentation — enabled in development only')
      .setVersion('1.0.0')
      .addServer('/api/v1')
      .build();

    const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig, {
      deepScanRoutes: true,
    });

    SwaggerModule.setup('docs', app, swaggerDocument, {
      useGlobalPrefix: true,
      swaggerOptions: { persistAuthorization: true },
    });
  }

  // Railway/Render inject PORT; prefer it over API_PORT for PaaS compatibility
  const port = configService.get<number>('PORT') || configService.get<number>('API_PORT') || 4000;

  const logger = new Logger('Bootstrap');
  await app.listen(port);
  logger.log(`🚀 XEARN API running on http://localhost:${port}`);
}
bootstrap();
