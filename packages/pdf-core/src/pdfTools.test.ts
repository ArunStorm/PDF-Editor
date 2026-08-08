import { PDFDocument } from 'pdf-lib';
import { addPageNumbers, mergePdfs, rotatePage, splitPdf, updateMetadata } from './pdfTools';

async function samplePdf(pageCount: number): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  for (let i = 0; i < pageCount; i += 1) pdf.addPage([400, 600]);
  return pdf.save();
}

describe('pdfTools', () => {
  it('merges PDFs', async () => {
    const a = await samplePdf(2); const b = await samplePdf(1);
    const merged = await mergePdfs([a, b]); const doc = await PDFDocument.load(merged);
    expect(doc.getPageCount()).toBe(3);
  });
  it('splits selected pages', async () => {
    const source = await samplePdf(4); const result = await splitPdf(source, [{ start: 2, end: 3 }]); const doc = await PDFDocument.load(result);
    expect(doc.getPageCount()).toBe(2);
  });
  it('rotates a page and updates metadata', async () => {
    const source = await samplePdf(1); const rotated = await rotatePage(source, 1, 90); const withMetadata = await updateMetadata(rotated, { title: 'PDF Editor Test', author: 'PDF Editor' }); const doc = await PDFDocument.load(withMetadata);
    expect(doc.getPage(0).getRotation().angle).toBe(90); expect(doc.getTitle()).toBe('PDF Editor Test');
  });
  it('adds page numbers without changing page count', async () => {
    const source = await samplePdf(3); const result = await addPageNumbers(source); const doc = await PDFDocument.load(result);
    expect(doc.getPageCount()).toBe(3);
  });
});
