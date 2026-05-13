import { test, expect } from '@playwright/test';

const API_URL = process.env.API_URL || 'http://localhost:4000/api';

test.describe('Wallet Integration', () => {
  let authToken: string;

  test.beforeAll(async () => {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `wallet-test-${Date.now()}@test.com`,
        password: 'Test1234!',
        firstName: 'Wallet',
        lastName: 'Tester',
      }),
    });

    expect(response.ok).toBe(true);
    const data = await response.json();
    authToken = data.accessToken;
  });

  test('should fetch wallet overview', async () => {
    const response = await fetch(`${API_URL}/wallet`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data).toHaveProperty('balance');
    expect(Number(data.balance)).toBeGreaterThanOrEqual(0);
  });

  test('should get transaction history', async () => {
    const response = await fetch(`${API_URL}/wallet/transactions`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data).toHaveProperty('transactions');
    expect(Array.isArray(data.transactions)).toBe(true);
  });

  test('should reject withdrawal below minimum', async () => {
    const response = await fetch(`${API_URL}/wallet/withdraw`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: '500',
        method: 'MTN_MOMO',
        accountInfo: '22890001234',
      }),
    });

    expect(response.ok).toBe(false);
    expect([400, 403, 422]).toContain(response.status);
  });

  test('should get withdrawal fees info', async () => {
    const response = await fetch(`${API_URL}/wallet/fees`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data).toHaveProperty('feePercentage');
  });
});
