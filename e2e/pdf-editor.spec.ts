import { test, expect } from '@playwright/test';

test('edits PDF text inline and downloads a valid PDF', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'showSaveFilePicker', { value: undefined, configurable: true });
  });
  await page.goto('/');

  const editButton = page.getByRole('button', { name: 'Edit Text' });
  await expect(editButton).toBeVisible();
  await expect(editButton).toBeEnabled({ timeout: 20000 });
  await editButton.click();

  const textLayer = page.locator('[aria-label="PDF text layer"]');
  await expect(textLayer).toBeVisible({ timeout: 20000 });
  await expect(textLayer).toHaveAttribute('data-text-item-count', /[1-9]\d*/, { timeout: 20000 });

  const textTarget = textLayer.locator('[data-pdf-text-item="true"]').first();
  await expect(textTarget).toBeVisible();
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
  await expect(page.getByRole('button', { name: 'Save PDF' })).toBeEnabled({ timeout: 20000 });

  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save PDF' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe('edited.pdf');
  expect(await file.path()).toBeTruthy();
});
