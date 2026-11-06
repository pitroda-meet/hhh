import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 120000,
  expect: { timeout: 12000 },
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:5189', actionTimeout: 15000, trace: 'retain-on-failure', screenshot: 'only-on-failure', ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } },
  projects: [{ name: 'chromium' }],
  webServer: { command: 'npm run dev -- --host 127.0.0.1 --port 5189 --strictPort', url: 'http://127.0.0.1:5189', reuseExistingServer: false, timeout: 120000 },
});
