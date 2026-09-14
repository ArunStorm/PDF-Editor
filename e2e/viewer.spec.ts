import { test, expect } from '@playwright/test';

test('viewer renders sample PDF', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('button', { name: 'Save PDF' })).toBeVisible();
});
