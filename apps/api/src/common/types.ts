import type { AccountTier, UserRole } from '@xearn/types';

/**
 * Shared request interface for JWT-authenticated NestJS routes.
 * Replaces `req: any` with a typed payload from JwtStrategy.
 */
export interface JwtPayload {
  id: string;
  role: UserRole;
  tier?: AccountTier;
  country?: string;
}

export interface JwtRequest {
  user: JwtPayload;
}
