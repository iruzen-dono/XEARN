import * as crypto from 'crypto';
import type { Response } from 'express';
import type { ConfigService } from '@nestjs/config';

export const ACCESS_TOKEN_COOKIE = 'accessToken';
export const REFRESH_TOKEN_COOKIE = 'refreshToken';
export const CSRF_TOKEN_COOKIE = 'csrfToken';

export function parseDurationToMs(value: string): number {
  const match = /^([0-9]+)\s*(s|m|h|d)$/i.exec(value.trim());
  if (!match) return 15 * 60 * 1000;
  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  switch (unit) {
    case 's':
      return amount * 1000;
    case 'm':
      return amount * 60 * 1000;
    case 'h':
      return amount * 60 * 60 * 1000;
    case 'd':
      return amount * 24 * 60 * 60 * 1000;
    default:
      return 15 * 60 * 1000;
  }
}

export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function setAuthCookies(
  res: Response,
  configService: ConfigService,
  tokens: { accessToken: string; refreshToken: string },
) {
  const isProd = String(configService.get('NODE_ENV') || '').toLowerCase() === 'production';
  const accessMaxAge = parseDurationToMs(configService.get('JWT_EXPIRATION') || '15m');
  const refreshMaxAge = parseDurationToMs(configService.get('JWT_REFRESH_EXPIRATION') || '7d');
  const csrfToken = generateCsrfToken();

  res.cookie(ACCESS_TOKEN_COOKIE, tokens.accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    maxAge: accessMaxAge,
    path: '/',
  });

  res.cookie(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    maxAge: refreshMaxAge,
    path: '/',
  });

  res.cookie(CSRF_TOKEN_COOKIE, csrfToken, {
    httpOnly: false,
    secure: isProd,
    sameSite: 'lax',
    maxAge: refreshMaxAge,
    path: '/',
  });
}

export function clearAuthCookies(res: Response) {
  res.cookie(ACCESS_TOKEN_COOKIE, '', { maxAge: 0, path: '/' });
  res.cookie(REFRESH_TOKEN_COOKIE, '', { maxAge: 0, path: '/' });
  res.cookie(CSRF_TOKEN_COOKIE, '', { maxAge: 0, path: '/' });
}
