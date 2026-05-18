import * as crypto from 'crypto';

/**
 * MAJEUR FIX #5: Time-safe HMAC verification for FedaPay webhooks
 *
 * Protects against timing attacks by:
 * 1. Using timingSafeEqual for constant-time comparison
 * 2. Normalizing signatures to Buffer format before comparison
 * 3. Validating buffer lengths before comparison
 */
export function verifyFedapaySignature(
  rawBody: Buffer | undefined,
  signature: string | undefined,
  secret: string,
): boolean {
  if (!signature || !rawBody) return false;

  // Normaliser de manière time-safe (pas de branches basées sur startsWith)
  const normalized = signature.startsWith('sha256=')
    ? Buffer.from(signature.slice(7), 'hex')
    : Buffer.from(signature, 'hex');

  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest();

  try {
    // Les deux buffers doivent avoir la même longueur pour timingSafeEqual
    if (normalized.length !== expected.length) return false;
    return crypto.timingSafeEqual(normalized, expected);
  } catch {
    return false;
  }
}
