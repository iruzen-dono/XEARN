import { test, expect } from '@playwright/test';

const API_URL = process.env.API_URL || 'http://localhost:4000/api';

test.describe('Referral System', () => {
  let referrerToken: string;
  let referrerCode: string;
  let referrerUserId: string;
  let refereeEmail: string;

  test.beforeAll(async () => {
    const referrerRes = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `referrer-${Date.now()}@test.com`,
        password: 'Test1234!',
        firstName: 'Referrer',
        lastName: 'User',
      }),
    });

    expect(referrerRes.ok).toBe(true);
    const referrerData = await referrerRes.json();
    referrerToken = referrerData.accessToken;
    referrerUserId = referrerData.user.id;
    referrerCode = referrerData.user.referralCode;
    refereeEmail = `referee-${Date.now()}@test.com`;
  });

  test('should have unique referral code', () => {
    expect(referrerCode).toBeTruthy();
    expect(typeof referrerCode).toBe('string');
    expect(referrerCode.length).toBeGreaterThanOrEqual(8);
  });

  test('should track referral on signup', async () => {
    const refereeRes = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: refereeEmail,
        password: 'Test1234!',
        firstName: 'Referee',
        lastName: 'User',
        referralCode: referrerCode,
      }),
    });

    expect([200, 201]).toContain(refereeRes.status);
    const refereeData = await refereeRes.json();
    expect(refereeData.user.referredById || refereeData.user.referredBy).toBe(referrerUserId);
  });

  test('should get referral stats', async () => {
    const response = await fetch(`${API_URL}/referrals/stats`, {
      headers: { Authorization: `Bearer ${referrerToken}` },
    });

    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data).toHaveProperty('totalReferrals');
    expect(data.totalReferrals).toBeGreaterThanOrEqual(1);
  });

  test('should get referral tree', async () => {
    const response = await fetch(`${API_URL}/referrals/tree`, {
      headers: { Authorization: `Bearer ${referrerToken}` },
    });

    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data).toHaveProperty('referrals');
    expect(Array.isArray(data.referrals)).toBe(true);
  });
});
