import { test, expect } from '@playwright/test';

test('landing page loads', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/XEARN/i);
});

test('login page loads', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: /connexion/i })).toBeVisible();
});

test('register page loads', async ({ page }) => {
  await page.goto('/register');
  await expect(page.getByRole('heading', { name: /cr[eé]er un compte/i })).toBeVisible();
});

test('legal page loads', async ({ page }) => {
  await page.goto('/legal/confidentialite');
  await expect(page.getByRole('heading', { name: /confidentialit[eé]/i })).toBeVisible();
});
