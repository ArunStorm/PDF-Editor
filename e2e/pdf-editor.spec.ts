import { test, expect } from '@playwright/test';

test('edits PDF text inline and downloads a valid PDF', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'showSaveFilePicker', { value: undefined, configurable: true });
  });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Edit Text' })).toBeVisible();
  await page.getByRole('button', { name: 'Edit Text' }).click();

  const textTarget = page.locator('[aria-label="PDF text layer"] span[title="Click to edit this PDF text"]').first();
  await expect(textTarget).toBeVisible({ timeout: 15000 });
  await textTarget.click();

  const editor = page.locator('[contenteditable="true"]').first();
  await expect(editor).toBeVisible();
  await editor.fill('Java Full Stack Developer');
  await editor.press('Enter');
  await expect(page.getByText(/Edited .*Java Full Stack Developer.*Click Save PDF/)).toBeVisible();

  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe('edited.pdf');
  expect(await file.path()).toBeTruthy();
});

test('Save PDF uses the same valid PDF pipeline', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'showSaveFilePicker', { value: undefined, configurable: true });
  });
  await page.goto('/');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save PDF' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe('edited.pdf');
  expect(await file.path()).toBeTruthy();
});
