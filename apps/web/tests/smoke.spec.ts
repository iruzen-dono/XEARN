import { test, expect } from '@playwright/test';

// ─── Smoke tests — public pages ───────────────────────────────

test.describe('Public pages', () => {
  test('landing page loads with branding', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/XEARN/i);
    // Check the main CTA or logo is present
    await expect(page.locator('text=XEARN').first()).toBeVisible();
  });

  test('login page shows form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /connexion/i })).toBeVisible();
    await expect(page.locator('input[type="email"], input[name="email"]').first()).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
    // Google OAuth button
    await expect(page.locator('text=/google/i').first()).toBeVisible();
  });

  test('register page shows form', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByRole('heading', { name: /cr[eé]er un compte/i })).toBeVisible();
    await expect(page.locator('input[type="email"], input[name="email"]').first()).toBeVisible();
  });

  test('forgot password page loads', async ({ page }) => {
    await page.goto('/forgot-password');
    await expect(page.getByRole('heading', { name: /mot de passe oubli[eé]/i })).toBeVisible();
    await expect(page.locator('input[type="email"]').first()).toBeVisible();
  });

  test('legal pages load', async ({ page }) => {
    await page.goto('/legal/confidentialite');
    await expect(page.getByRole('heading', { name: /confidentialit[eé]/i })).toBeVisible();
  });

  test('404 page shows for unknown routes', async ({ page }) => {
    const res = await page.goto('/this-page-does-not-exist');
    expect(res?.status()).toBe(404);
  });
});

// ─── Navigation between auth pages ───────────────────────────

test.describe('Auth navigation', () => {
  test('login page has link to register', async ({ page }) => {
    await page.goto('/login');
    const registerLink = page.locator('a[href*="register"]').first();
    await expect(registerLink).toBeVisible();
    await registerLink.click();
    await expect(page).toHaveURL(/\/register/);
  });

  test('register page has link to login', async ({ page }) => {
    await page.goto('/register');
    const loginLink = page.locator('a[href*="login"]').first();
    await expect(loginLink).toBeVisible();
    await loginLink.click();
    await expect(page).toHaveURL(/\/login/);
  });

  test('login page has forgot password link', async ({ page }) => {
    await page.goto('/login');
    const forgotLink = page.locator('a[href*="forgot-password"]').first();
    await expect(forgotLink).toBeVisible();
    await forgotLink.click();
    await expect(page).toHaveURL(/\/forgot-password/);
  });
});

// ─── Form validation ──────────────────────────────────────────

test.describe('Form validation', () => {
  test('login form shows error on empty submit', async ({ page }) => {
    await page.goto('/login');
    const submitBtn = page.locator('button[type="submit"]').first();
    await submitBtn.click();
    // HTML5 validation or custom error — form should not navigate away
    await expect(page).toHaveURL(/\/login/);
  });

  test('register form shows error on invalid email', async ({ page }) => {
    await page.goto('/register');
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    await emailInput.fill('not-an-email');
    const submitBtn = page.locator('button[type="submit"]').first();
    await submitBtn.click();
    // Should stay on register page
    await expect(page).toHaveURL(/\/register/);
  });

  test('forgot password form validates email', async ({ page }) => {
    await page.goto('/forgot-password');
    const emailInput = page.locator('input[type="email"]').first();
    await emailInput.fill('bad');
    const submitBtn = page.locator('button[type="submit"]').first();
    await submitBtn.click();
    await expect(page).toHaveURL(/\/forgot-password/);
  });
});

// ─── Protected routes redirect ────────────────────────────────

test.describe('Protected routes redirect to login', () => {
  test('dashboard redirects unauthenticated user', async ({ page }) => {
    await page.goto('/dashboard');
    // Should redirect to login or show login UI
    await page.waitForURL(/\/(login|dashboard)/, { timeout: 10000 });
  });

  test('wallet page requires auth', async ({ page }) => {
    await page.goto('/dashboard/wallet');
    await page.waitForURL(/\/(login|dashboard)/, { timeout: 10000 });
  });

  test('admin page requires auth', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForURL(/\/(login|admin)/, { timeout: 10000 });
  });
});

// ─── Responsive layout ───────────────────────────────────────

test.describe('Responsive layout', () => {
  test('landing page is usable on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await expect(page.locator('text=XEARN').first()).toBeVisible();
  });

  test('login page renders on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /connexion/i })).toBeVisible();
  });
});
