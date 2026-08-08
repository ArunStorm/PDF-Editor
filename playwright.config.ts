import { defineConfig } from '@playwright/test';
export default defineConfig({ testDir: './e2e', use: { headless: true }, timeout: 30000 });
