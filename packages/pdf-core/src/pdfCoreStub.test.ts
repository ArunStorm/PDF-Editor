jest.mock('pdf-lib', () => ({ PDFDocument: { load: jest.fn(async (bytes: Uint8Array) => ({ bytes })) } }));
import { open, renderPage } from './pdfCoreStub.js';

test('open accepts PDF bytes', async () => { const handle = await open(new Uint8Array([37, 80, 68, 70])); expect(handle.bytes).toHaveLength(4); });
test('renderPage validates page and scale', async () => { const handle = { bytes: new Uint8Array() }; await expect(renderPage(handle, 0, 1)).rejects.toThrow(); await expect(renderPage(handle, 1, 1)).resolves.toMatchObject({ page: 1, scale: 1 }); });
