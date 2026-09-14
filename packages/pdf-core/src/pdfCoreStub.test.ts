import { PDFDocument } from 'pdf-lib';
import { open, renderPage } from './pdfCoreStub.js';

test('open accepts valid PDF bytes', async () => {
  const document = await PDFDocument.create();
  document.addPage([300, 400]);
  const bytes = await document.save();
  const handle = await open(bytes);
  expect(handle.bytes).toHaveLength(bytes.length);
  expect(handle.document?.getPageCount()).toBe(1);
});

test('renderPage validates page and scale', async () => {
  const handle = { bytes: new Uint8Array() };
  await expect(renderPage(handle, 0, 1)).rejects.toThrow();
  await expect(renderPage(handle, 1, 1)).resolves.toMatchObject({ page: 1, scale: 1 });
});
