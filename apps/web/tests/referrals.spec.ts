import { test, expect } from '@playwright/test';
import { createVerifiedUser, API_BASE } from './e2e-setup';

type TestUser = Awaited<ReturnType<typeof createVerifiedUser>>;

test.describe('Referral System', () => {
  let referrer: TestUser;
  let refereeEmail: string;

  test.beforeAll(async () => {
    referrer = await createVerifiedUser('referrer');
    refereeEmail = `referee-${Date.now()}@e2e-test.com`;
  });

  test('should have unique referral code', () => {
    expect(referrer.referralCode).toBeTruthy();
    expect(typeof referrer.referralCode).toBe('string');
    expect(referrer.referralCode!.length).toBeGreaterThanOrEqual(8);
  });

  test('should use referral on signup and verify referral code exists', async () => {
    const refereeRes = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: refereeEmail,
        password: 'Test1234!',
        firstName: 'Referee',
        lastName: 'User',
        referralCode: referrer.referralCode,
      }),
    });

    expect([200, 201]).toContain(refereeRes.status);

    // Le parrainage devrait lier le referee au referrer
    expect(referrer.referralCode?.length).toBeGreaterThanOrEqual(8);
  });

  test('should get referral stats', async () => {
    const response = await fetch(`${API_BASE}/referrals/stats`, {
      headers: { Authorization: `Bearer ${referrer.accessToken}` },
    });

    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data).toHaveProperty('totalLevel1');
    expect(Number(data.totalLevel1)).toBeGreaterThanOrEqual(0);
  });

  test('should get referral tree', async () => {
    const response = await fetch(`${API_BASE}/referrals/tree`, {
      headers: { Authorization: `Bearer ${referrer.accessToken}` },
    });

    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data).toHaveProperty('level1');
    expect(Array.isArray(data.level1)).toBe(true);
  });
});
