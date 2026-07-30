import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['json', { outputFile: 'test-results/results.json' }]],
  use: {
    baseURL: process.env.API_BASE_URL || 'http://localhost:8081',
    extraHTTPHeaders: {
      'Content-Type': 'application/json',
    },
  },
});
