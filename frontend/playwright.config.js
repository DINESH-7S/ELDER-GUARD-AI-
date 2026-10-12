import { defineConfig, devices } from '@playwright/test';

// Tests run against the dev stack. Start it first with `npm run dev` from the
// repo root (frontend :5173, backend :8000) and seed with
// `python backend/seed_connected_demo.py`.
const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:5173';

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } }, grepInvert: /@mobile/ },
    { name: 'mobile', use: { ...devices['Pixel 7'] }, grep: /@mobile/ },
  ],
});
