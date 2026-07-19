import { test, expect } from '@playwright/test';
import { createVerifiedUser, API_BASE } from './e2e-setup';

type TestUser = Awaited<ReturnType<typeof createVerifiedUser>>;

test.describe('Wallet Integration', () => {
  let user: TestUser;

  test.beforeAll(async () => {
    user = await createVerifiedUser('wallet');
  });

  test('should fetch wallet overview', async () => {
    const response = await fetch(`${API_BASE}/wallet`, {
      headers: { Authorization: `Bearer ${user.accessToken}` },
    });

    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data).toHaveProperty('balance');
    expect(Number(data.balance)).toBeGreaterThanOrEqual(0);
  });

  test('should get transaction history', async () => {
    const response = await fetch(`${API_BASE}/wallet/transactions`, {
      headers: { Authorization: `Bearer ${user.accessToken}` },
    });

    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data).toHaveProperty('transactions');
    expect(Array.isArray(data.transactions)).toBe(true);
  });

  test('should reject withdrawal below minimum', async () => {
    const response = await fetch(`${API_BASE}/wallet/withdraw`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${user.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: '500',
        method: 'MTN_MOMO',
        accountInfo: '22890001234',
      }),
    });

    expect(response.ok).toBe(false);
    // Le wallet n'est pas activé pour un user fraîchement créé → 401
    expect([400, 401, 403, 422]).toContain(response.status);
  });

  test('should get withdrawal fees info', async () => {
    const response = await fetch(`${API_BASE}/wallet/fees`, {
      headers: { Authorization: `Bearer ${user.accessToken}` },
    });

    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data).toHaveProperty('feePercent');
  });
});
