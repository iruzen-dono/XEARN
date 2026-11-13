import { defineConfig, devices } from '@playwright/test';

// One source of truth for the address the tests hit. The web server Playwright
// starts and the tests' `baseURL` used to be configured separately -- the server
// on 127.0.0.1:3001, the tests on localhost:3000 -- so in CI every test navigated
// to a port nothing listened on and timed out. `E2E_BASE_URL` points the suite at
// a server someone started elsewhere.
const host = '127.0.0.1';
const port = Number(process.env.E2E_PORT ?? 3001);
const baseURL = process.env.E2E_BASE_URL || `http://${host}:${port}`;

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  retries: 0,
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: `npm run dev -- --hostname ${host} --port ${port}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
