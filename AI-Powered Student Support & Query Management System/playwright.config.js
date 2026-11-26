import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 90000,
  expect: { timeout: 12000 },
  globalSetup: './tests/e2e/global-setup.js',
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
  ],
  use: {
    baseURL: 'http://127.0.0.1:5189',
    channel: 'chrome',
    actionTimeout: 15000,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    ...devices['Desktop Chrome'],
    viewport: { width: 1440, height: 1000 },
  },
  projects: [
    { name: 'chromium' },
  ],
  webServer: [
    {
      command: 'php artisan serve --host=0.0.0.0 --port=8000',
      cwd: '../backend',
      url: 'http://127.0.0.1:8000/up',
      reuseExistingServer: true,
      timeout: 120000,
    },
    {
      command: 'npm run dev -- --host 127.0.0.1 --port 5189 --strictPort',
      url: 'http://127.0.0.1:5189',
      reuseExistingServer: true,
      timeout: 120000,
    },
  ],
});
