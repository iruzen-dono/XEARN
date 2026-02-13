import * as crypto from 'crypto';
import { verifyFedapaySignature } from '../src/payment/fedapay-signature';

describe('verifyFedapaySignature', () => {
  it('accepts valid signature (raw hex)', () => {
    const secret = 'test_secret';
    const rawBody = Buffer.from(JSON.stringify({ event: 'transaction.approved', entity: { id: 123 } }));
    const signature = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

    expect(verifyFedapaySignature(rawBody, signature, secret)).toBe(true);
  });

  it('accepts valid signature with sha256 prefix', () => {
    const secret = 'test_secret';
    const rawBody = Buffer.from(JSON.stringify({ event: 'transaction.completed', entity: { id: 456 } }));
    const signature = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

    expect(verifyFedapaySignature(rawBody, `sha256=${signature}`, secret)).toBe(true);
  });

  it('rejects invalid signature', () => {
    const secret = 'test_secret';
    const rawBody = Buffer.from(JSON.stringify({ event: 'payout.failed', entity: { id: 789 } }));

    expect(verifyFedapaySignature(rawBody, 'bad', secret)).toBe(false);
  });
});
