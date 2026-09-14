import { test, expect } from '@playwright/test';

// Small deterministic one-page PDF with a real text operator. Keeping the fixture
// in the test avoids depending on a particular production sample PDF encoding.
const TEXT_PDF_BASE64 = 'JVBERi0xLjMKJZOMi54gUmVwb3J0TGFiIEdlbmVyYXRlZCBQREYgZG9jdW1lbnQgKG9wZW5zb3VyY2UpCjEgMCBvYmoKPDwKL0YxIDIgMCBSCj4+CmVuZG9iagoyIDAgb2JqCjw8Ci9CYXNlRm9udCAvSGVsdmV0aWNhIC9FbmNvZGluZyAvV2luQW5zaUVuY29kaW5nIC9OYW1lIC9GMSAvU3VidHlwZSAvVHlwZTEgL1R5cGUgL0ZvbnQKPj4KZW5kb2JqCjMgMCBvYmoKPDwKL0NvbnRlbnRzIDcgMCBSIC9NZWRpYUJveCBbIDAgMCA2MTIgNzkyIF0gL1BhcmVudCA2IDAgUiAvUmVzb3VyY2VzIDw8Ci9Gb250IDEgMCBSIC9Qcm9jU2V0IFsgL1BERiAvVGV4dCAvSW1hZ2VCIC9JbWFnZUMgL0ltYWdlSSBdCj4+IC9Sb3RhdGUgMCAvVHJhbnMgPDwKCj4+IAogIC9UeXBlIC9QYWdlCj4+CmVuZG9iago0IDAgb2JqCjw8Ci9QYWdlTW9kZSAvVXNlTm9uZSAvUGFnZXMgNiAwIFIgL1R5cGUgL0NhdGFsb2cKPj4KZW5kb2JqCjUgMCBvYmoKPDwKL0F1dGhvciAoYW5vbnltb3VzKSAvQ3JlYXRpb25EYXRlIChEOjIwMjYwOTE0MDYzNTI2KzAwJzAwJykgL0NyZWF0b3IgKGFub255bW91cykgL0tleXdvcmRzICgpIC9Nb2REYXRlIChEOjIwMjYwOTE0MDYzNTI2KzAwJzAwJykgL1Byb2R1Y2VyIChSZXBvcnRMYWIgUERGIExpYnJhcnkgLSBcKG9wZW5zb3VyY2VcKSkgCiAgL1N1YmplY3QgKHVuc3BlY2lmaWVkKSAvVGl0bGUgKHVudGl0bGVkKSAvVHJhcHBlZCAvRmFsc2UKPj4KZW5kb2JqCjYgMCBvYmoKPDwKL0NvdW50IDEgL0tpZHMgWyAzIDAgUiBdIC9UeXBlIC9QYWdlcwo+PgplbmRvYmoKNyAwIG9iago8PAovRmlsdGVyIFsgL0FTQ0lJODVEZWNvZGUgL0ZsYXRlRGVjb2RlIF0gL0xlbmd0aCAxMjEKPj4Kc3RyZWFtCkdhcFFoMEU9RiwwVVxIM1RccE5ZVF5RS2s/dGM+SVAsO1cjVTFeMjNpaFBFTV8/Q1QzIUszSDM9V2tXbFRna0NnIUtocSI4P1JQNko7XW5LQ0omMjFJWl01X09mTGY+Qy4zdVY2OmREL0xfYE9CIVooalJDKVJvfj5lbmRzdHJlYW0KZW5kb2JqCnhyZWYKMCA4CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDA2MSAwMDAwMCBuIAowMDAwMDAwMDkyIDAwMDAwIG4gCjAwMDAwMDAxOTkgMDAwMDAgbiAKMDAwMDAwMDM5MiAwMDAwMCBuIAowMDAwMDAwNDYwIDAwMDAwIG4gCjAwMDAwMDA3MjEgMDAwMDAgbiAKMDAwMDAwMDc4MCAwMDAwMCBuIAp0cmFpbGVyCjw8Ci9JRCAKWzxmZTdlZGMyZDcxMThjMTg1NjVkNDJjOGIxODVjYmEzNT48ZmU3ZWRjMmQ3MTE4YzE4NTY1ZDQyYzhiMTg1Y2JhMzU+XQolIFJlcG9ydExhYiBnZW5lcmF0ZWQgUERGIGRvY3VtZW50IC0tIGRpZ2VzdCAob3BlbnNvdXJjZSkKCi9JbmZvIDUgMCBSCi9Sb290IDQgMCBSCi9TaXplIDgKPj4Kc3RhcnR4cmVmCjk5MQolJUVPRgo=';

function fixturePdfBuffer() {
  return Buffer.from(TEXT_PDF_BASE64, 'base64');
}

test('opens a PDF, edits text inline, and downloads a valid PDF', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'showSaveFilePicker', { value: undefined, configurable: true });
  });
  await page.goto('/');

  const chooserPromise = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Open' }).click();
  const chooser = await chooserPromise;
  await chooser.setFiles({
    name: 'e2e-text.pdf',
    mimeType: 'application/pdf',
    buffer: fixturePdfBuffer(),
  });

  const editButton = page.getByRole('button', { name: 'Edit Text' });
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
  await editor.fill('PDF Editor Verified');
  await editor.press('Enter');
  await expect(page.getByText(/Edited .*PDF Editor Verified.*Click Save PDF/)).toBeVisible();

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
