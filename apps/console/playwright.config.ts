import { defineConfig, devices } from '@playwright/test';

const consolePort = Number(process.env.CONSOLE_E2E_PORT ?? 5174);

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 90_000,
  expect: {
    timeout: 15_000,
  },
  use: {
    ...devices['Desktop Chrome'],
    // CI installs Playwright Chromium; local dev can use system Chrome when CDN is blocked.
    channel: process.env.CI ? undefined : 'chrome',
    baseURL: `http://127.0.0.1:${consolePort}`,
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'pnpm dev',
    url: `http://127.0.0.1:${consolePort}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe',
    // Vite prints "ready in N ms" before HTTP is polled; stdout + url both gate startup.
    wait: {
      stdout: /ready in \d+ ms/i,
    },
    env: {
      ...process.env,
      CONSOLE_DEV_PORT: String(consolePort),
    },
  },
});
