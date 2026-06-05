import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        channel: 'msedge', // Fallback to system edge to avoid massive download timeout
      },
    },
  ],
  webServer: [
    {
      command: 'npm run preview -- --port 5173',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
    },
    {
      command: 'npm --prefix backend start',
      url: 'http://localhost:3001/api/holidays', // Check public backend endpoint on correct port
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
    }
  ]
});
