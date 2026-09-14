import { PDFDocument, StandardFonts } from 'pdf-lib';
import { open, save, type Annotation } from './pdfCoreStub.js';

describe('PDF save pipeline', () => {
  it('creates a valid PDF and writes a formatted replacement', async () => {
    const source = await PDFDocument.create();
    const page = source.addPage([600, 800]);
    const font = await source.embedFont(StandardFonts.HelveticaBold);
    page.drawText('Java Full Stack Engineer', { x: 50, y: 700, size: 16, font });
    const sourceBytes = await source.save();
    const annotation: Annotation = { id: 'replacement-1', type: 'replacement', page: 1, x: 50, y: 80, width: 220, height: 20, text: 'Java Full Stack Developer', originalText: 'Java Full Stack Engineer', fontName: 'Helvetica-Bold', fontFamily: 'Arial, Helvetica, sans-serif', fontSize: 16, fontWeight: '700', fontStyle: 'normal', viewportWidth: 600, viewportHeight: 800 };
    const output = await save(await open(sourceBytes), { annotations: [annotation] });
    expect(output.byteLength).toBeGreaterThan(sourceBytes.byteLength);
    const reopened = await PDFDocument.load(output);
    expect(reopened.getPageCount()).toBe(1);
    expect(reopened.getPage(0).getWidth()).toBe(600);
    expect(reopened.getPage(0).getHeight()).toBe(800);
  });

  it('exports a multiline replacement inside one logical text block', async () => {
    const source = await PDFDocument.create();
    const page = source.addPage([600, 800]);
    const font = await source.embedFont(StandardFonts.Helvetica);
    page.drawText('Original paragraph line one', { x: 50, y: 700, size: 12, font });
    page.drawText('line two', { x: 50, y: 684, size: 12, font });
    const sourceBytes = await source.save();
    const annotation: Annotation = { id: 'replacement-multiline', type: 'replacement', page: 1, x: 50, y: 92, width: 250, height: 36, text: 'Updated paragraph\nwith a second line', originalText: 'Original paragraph line one\nline two', fontName: 'Helvetica', fontFamily: 'Arial, Helvetica, sans-serif', fontSize: 12, fontWeight: '400', fontStyle: 'normal', lineHeight: 14, viewportWidth: 600, viewportHeight: 800 };
    const output = await save(await open(sourceBytes), { annotations: [annotation] });
    const reopened = await PDFDocument.load(output);
    expect(reopened.getPageCount()).toBe(1);
    expect(output.byteLength).toBeGreaterThan(sourceBytes.byteLength);
  });

  it('round-trips an unchanged PDF without annotations', async () => {
    const source = await PDFDocument.create();
    source.addPage([300, 400]);
    const sourceBytes = await source.save();
    const output = await save(await open(sourceBytes));
    const reopened = await PDFDocument.load(output);
    expect(reopened.getPageCount()).toBe(1);
  });
});
