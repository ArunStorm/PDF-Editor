import { test, expect } from '@playwright/test';
test('viewer renders sample PDF', async ({ page }) => { await page.goto('http://127.0.0.1:5173'); await expect(page.getByText(/Loaded 1 page/)).toBeVisible({ timeout: 15000 }); await expect(page.locator('canvas')).toBeVisible(); });
