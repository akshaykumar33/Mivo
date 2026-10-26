import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Configuration for Mivo Platform
 * Covers all modules, pages, modals, and collaborative features.
 */
export default defineConfig({
  testDir: './e2e/tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker avoids database race conditions in multi-tenant tests
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        permissions: ['camera', 'microphone'],
        launchOptions: {
          args: [
            '--use-fake-ui-for-media-stream',
            '--use-fake-device-for-media-stream',
            '--no-sandbox',
            '--disable-setuid-sandbox',
          ],
        },
      },
    },
  ],
  webServer: [
    {
      command: 'pnpm --filter @mivo/server start:prod',
      url: 'http://localhost:4000/api/v1/auth/me',
      reuseExistingServer: true,
      timeout: 120000,
    },
    {
      command: 'pnpm --filter @mivo/web start',
      url: 'http://localhost:3000',
      reuseExistingServer: true,
      timeout: 120000,
    },
  ],
});
