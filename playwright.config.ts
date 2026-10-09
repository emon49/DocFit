import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  timeout: 30000,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    headless: true,
  },
  webServer: {
    command: 'npx tsx server/server.ts',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 15000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
