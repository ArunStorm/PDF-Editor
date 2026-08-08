import { PDFDocument, StandardFonts } from 'pdf-lib';
import { open, save, type Annotation } from './pdfCoreStub';

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

  it('round-trips an unchanged PDF without annotations', async () => {
    const source = await PDFDocument.create();
    source.addPage([300, 400]);
    const sourceBytes = await source.save();
    const output = await save(await open(sourceBytes));
    const reopened = await PDFDocument.load(output);
    expect(reopened.getPageCount()).toBe(1);
  });
});
