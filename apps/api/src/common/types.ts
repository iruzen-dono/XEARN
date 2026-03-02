/**
 * Shared request interface for JWT-authenticated NestJS routes.
 * Replaces `req: any` with a typed payload from JwtStrategy.
 */
export interface JwtPayload {
  id: string;
  role: 'USER' | 'PARTNER' | 'ADMIN';
  tier?: 'NORMAL' | 'PREMIUM' | 'VIP';
  country?: string;
}

export interface JwtRequest {
  user: JwtPayload;
}
