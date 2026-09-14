import { test, expect } from '@playwright/test';

const TEXT_PDF_BASE64 = 'JVBERi0xLjMKJZOMi54gUmVwb3J0TGFiIEdlbmVyYXRlZCBQREYgZG9jdW1lbnQgKG9wZW5zb3VyY2UpCjEgMCBvYmoKPDwKL0YxIDIgMCBSCj4+CmVuZG9iagoyIDAgb2JqCjw8Ci9CYXNlRm9udCAvSGVsdmV0aWNhIC9FbmNvZGluZyAvV2luQW5zaUVuY29kaW5nIC9OYW1lIC9GMSAvU3VidHlwZSAvVHlwZTEgL1R5cGUgL0ZvbnQKPj4KZW5kb2JqCjMgMCBvYmoKPDwKL0NvbnRlbnRzIDcgMCBSIC9NZWRpYUJveCBbIDAgMCA2MTIgNzkyIF0gL1BhcmVudCA2IDAgUiAvUmVzb3VyY2VzIDw8Ci9Gb250IDEgMCBSIC9Qcm9jU2V0IFsgL1BERiAvVGV4dCAvSW1hZ2VCIC9JbWFnZUMgL0ltYWdlSSBdCj4+IC9Sb3RhdGUgMCAvVHJhbnMgPDwKCj4+IAogIC9UeXBlIC9QYWdlCj4+CmVuZG9iago0IDAgb2JqCjw8Ci9QYWdlTW9kZSAvVXNlTm9uZSAvUGFnZXMgNiAwIFIgL1R5cGUgL0NhdGFsb2cKPj4KZW5kb2JqCjUgMCBvYmoKPDwKL0F1dGhvciAoYW5vbnltb3VzKSAvQ3JlYXRpb25EYXRlIChEOjIwMjYwOTE0MDYzNTI2KzAwJzAwJykgL0NyZWF0b3IgKGFub255bW91cykgL0tleXdvcmRzICgpIC9Nb2REYXRlIChEOjIwMjYwOTE0MDYzNTI2KzAwJzAwJykgL1Byb2R1Y2VyIChSZXBvcnRMYWIgUERGIExpYnJhcnkgLSBcKG9wZW5zb3VyY2VcKSkgCiAgL1N1YmplY3QgKHVuc3BlY2lmaWVkKSAvVGl0bGUgKHVudGl0bGVkKSAvVHJhcHBlZCAvRmFsc2UKPj4KZW5kb2JqCjYgMCBvYmoKPDwKL0NvdW50IDEgL0tpZHMgWyAzIDAgUiBdIC9UeXBlIC9QYWdlcwo+PgplbmRvYmoKNyAwIG9iago8PAovRmlsdGVyIFsgL0FTQ0lJODVEZWNvZGUgL0ZsYXRlRGVjb2RlIF0gL0xlbmd0aCAxMjEKPj4Kc3RyZWFtCkdhcFFoMEU9RiwwVVxIM1RccE5ZVF5RS2s/dGM+SVAsO1cjVTFeMjNpaFBFTV8/Q1QzIUszSDM9V2tXbFRna0NnIUtocSI4P1JQNko7XW5LQ0omMjFJWl01X09mTGY+Qy4zdVY2OmREL0xfYE9CIVooalJDKVJvfj5lbmRzdHJlYW0KZW5kb2JqCnhyZWYKMCA4CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDA2MSAwMDAwMCBuIAowMDAwMDAwMDkyIDAwMDAwIG4gCjAwMDAwMDAxOTkgMDAwMDAgbiAKMDAwMDAwMDM5MiAwMDAwMCBuIAowMDAwMDAwNDYwIDAwMDAwIG4gCjAwMDAwMDA3MjEgMDAwMDAgbiAKMDAwMDAwMDc4MCAwMDAwIG4gCnRyYWlsZXIKPDwKL0lEIFs8ZmU3ZWRjMmQ3MTE4YzE4NTY1ZDQyYzhiMTg1Y2JhMzU+PGZlN2VkYzJkNzExOGMxODU2NWQ0MmM4YjE4NWNiYTM1Pl0KL0luZm8gNSAwIFIKL1Jvb3QgNCAwIFIKL1NpemUgOAo+PgpzdGFydHhyZWYKMzk1CiUlRU9G';
const BLOCK_PDF_BASE64 = 'JVBERi0xLjMKJZOMi54gUmVwb3J0TGFiIEdlbmVyYXRlZCBQREYgZG9jdW1lbnQgKG9wZW5zb3VyY2UpCjEgMCBvYmoKPDwKL0YxIDIgMCBSCj4+CmVuZG9iagoyIDAgb2JqCjw8Ci9CYXNlRm9udCAvSGVsdmV0aWNhIC9FbmNvZGluZyAvV2luQW5zaUVuY29kaW5nIC9OYW1lIC9GMSAvU3VidHlwZSAvVHlwZTEgL1R5cGUgL0ZvbnQKPj4KZW5kb2JqCjMgMCBvYmoKPDwKL0NvbnRlbnRzIDcgMCBSIC9NZWRpYUJveCBbIDAgMCA2MDAgODAwIF0gL1BhcmVudCA2IDAgUiAvUmVzb3VyY2VzIDw8Ci9Gb250IDEgMCBSIC9Qcm9jU2V0IFsgL1BERiAvVGV4dCAvSW1hZ2VCIC9JbWFnZUMgL0ltYWdlSSBdCj4+IC9Sb3RhdGUgMCAvVHJhbnMgPDwKCj4+IAogIC9UeXBlIC9QYWdlCj4+CmVuZG9iago0IDAgb2JqCjw8Ci9QYWdlTW9kZSAvVXNlTm9uZSAvUGFnZXMgNiAwIFIgL1R5cGUgL0NhdGFsb2cKPj4KZW5kb2JqCjUgMCBvYmoKPDwKL0F1dGhvciAoYW5vbnltb3VzKSAvQ3JlYXRpb25EYXRlIChEOjIwMjYwOTE0MDcxMzQxKzAwJzAwJykgL0NyZWF0b3IgKGFub255bW91cykgL0tleXdvcmRzICgpIC9Nb2REYXRlIChEOjIwMjYwOTE0MDcxMzQxKzAwJzAwJykgL1Byb2R1Y2VyIChSZXBvcnRMYWIgUERGIExpYnJhcnkgLSBcKG9wZW5zb3VyY2VcKSkgCiAgL1N1YmplY3QgKHVuc3BlY2lmaWVkKSAvVGl0bGUgKHVudGl0bGVkKSAvVHJhcHBlZCAvRmFsc2UKPj4KZW5kb2JqCjYgMCBvYmoKPDwKL0NvdW50IDEgL0tpZHMgWyAzIDAgUiBdIC9UeXBlIC9QYWdlcwo+PgplbmRvYmoKNyAwIG9iago8PAovRmlsdGVyIFsgL0FTQ0lJODVEZWNvZGUgL0ZsYXRlRGVjb2RlIF0gL0xlbmd0aCAzMTAKPj4Kc3RyZWFtCkdhczMxXytrKFUmLWgnPlQ0M2ddJzRrNHNYaytvZV8wQElgNWozO09tNFIvLzdkXHNCPGtDMiNhLGs2Xz9baGJOIj5wViNiZT02Xz4nTzNxP2liRVVXI21uTDJkImJkNU84KGBAMilbNUpTakBgNlwyai8jQz9HdHMrZTpUT2hKPk0yaVkmX0MpKEluNnBfa0daTWBYMDVIUDo6V2Q1NiNGI0laTzBobyFKQiI/OCllYTk1KkJndEZdLV0xVTZQP2RgcFwhNEI0Kiw8JUtRK0YyYk1XV3FGbWkhcF9cRVE7UVZnKyloS0w6MmVyR3NcZGtEcG0qTmxtOzdTUHI9ZEUvLypeajwwZz5uKE1rQFZrMVI1Vl9OWmE5N0B0LUJKLlhlNVAhc1g5bGg2W1pTLl5RWypBfj5lbmRzdHJlYW0KZW5kb2JqCnhyZWYKMCA4CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDA2MSAwMDAwMCBuIAowMDAwMDAwMDkyIDAwMDAwIG4gCjAwMDAwMDAxOTkgMDAwMDAgbiAKMDAwMDAwMDM5MiAwMDAwMCBuIAowMDAwMDAwNDYwIDAwMDAwIG4gCjAwMDAwMDA3MjEgMDAwMDAgbiAKMDAwMDAwMDc4MCAwMDAwIG4gCnRyYWlsZXIKPDwKL0lEIFs8MmM4ZmMzMDIzYWRmMGRiMTMyZDg3NjVlMzQwOGI5ZGI+PGI4ZmMzMDIzYWRmMGRiMTMyZDg3NjVlMzQwOGI5ZGI+XQovSW5mbyA1IDAgUgovUm9vdCA0IDAgUgovU2l6ZSA4Cj4+CnN0YXJ0eHJlZgoxMTgwCiUlRU9G';

function fixturePdfBuffer() { return Buffer.from(TEXT_PDF_BASE64, 'base64'); }
function blockFixturePdfBuffer() { return Buffer.from(BLOCK_PDF_BASE64, 'base64'); }

async function openPdf(page: import('@playwright/test').Page, buffer: Buffer, name = 'e2e-text.pdf') {
  const chooserPromise = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Open' }).click();
  const chooser = await chooserPromise;
  await chooser.setFiles({ name, mimeType: 'application/pdf', buffer });
}

test('opens a PDF, groups text into an editable block, edits inline, and downloads a valid PDF', async ({ page }) => {
  await page.addInitScript(() => { Object.defineProperty(window, 'showSaveFilePicker', { value: undefined, configurable: true }); });
  await page.goto('/');
  await openPdf(page, blockFixturePdfBuffer(), 'block-text.pdf');
  const editButton = page.getByRole('button', { name: 'Edit Text' });
  await expect(editButton).toBeEnabled({ timeout: 20000 });
  await editButton.click();
  const textLayer = page.locator('[aria-label="PDF text layer"]');
  await expect(textLayer).toBeVisible({ timeout: 20000 });
  await expect(textLayer).toHaveAttribute('data-text-item-count', /[1-9]\d*/, { timeout: 20000 });
  await expect(textLayer).toHaveAttribute('data-text-block-count', /[1-9]\d*/, { timeout: 20000 });
  const itemCount = Number(await textLayer.getAttribute('data-text-item-count'));
  const blockCount = Number(await textLayer.getAttribute('data-text-block-count'));
  expect(itemCount).toBeGreaterThan(blockCount);
  const textTarget = textLayer.locator('[data-pdf-text-block="true"]').first();
  await expect(textTarget).toBeVisible();
  await textTarget.click();
  const editor = page.locator('[contenteditable="true"]').first();
  await expect(editor).toBeVisible();
  await expect(page.getByRole('toolbar', { name: 'PDF text formatting' })).toBeVisible();
  await editor.fill('Senior Java Developer\nwith 8+ years');
  await editor.press('Enter');
  await expect(editor).toBeHidden();
  await expect(page.getByText('● Unsaved changes')).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe('edited.pdf');
  expect(await file.path()).toBeTruthy();
});

test('opens a simple text PDF and edits a single text block', async ({ page }) => {
  await page.addInitScript(() => { Object.defineProperty(window, 'showSaveFilePicker', { value: undefined, configurable: true }); });
  await page.goto('/');
  await openPdf(page, fixturePdfBuffer());
  await page.getByRole('button', { name: 'Edit Text' }).click();
  const textLayer = page.locator('[aria-label="PDF text layer"]');
  await expect(textLayer).toHaveAttribute('data-text-item-count', /[1-9]\d*/, { timeout: 20000 });
  const textTarget = textLayer.locator('[data-pdf-text-block="true"]').first();
  await textTarget.click();
  const editor = page.locator('[contenteditable="true"]').first();
  await editor.fill('PDF Editor Verified');
  await editor.press('Enter');
  await expect(editor).toBeHidden();
  await expect(page.getByText('● Unsaved changes')).toBeVisible();
});

test('Save PDF uses the same valid PDF pipeline', async ({ page }) => {
  await page.addInitScript(() => { Object.defineProperty(window, 'showSaveFilePicker', { value: undefined, configurable: true }); });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Save PDF' })).toBeEnabled({ timeout: 20000 });
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save PDF' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe('edited.pdf');
  expect(await file.path()).toBeTruthy();
});
