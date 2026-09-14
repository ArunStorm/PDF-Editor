import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

/** Shared PDF domain types. Rendering stays in PDF.js; local editing/export uses pdf-lib. */
export type PdfInput = ArrayBuffer | Uint8Array | string;
export type PdfHandle = { bytes: Uint8Array; document?: PDFDocument; source?: string };
export type Annotation = { id: string; type: 'rect' | 'text' | 'replacement' | 'image'; page: number; x: number; y: number; width?: number; height?: number; text?: string; originalText?: string; imageData?: string; viewportWidth?: number; viewportHeight?: number; fontName?: string; fontFamily?: string; fontSize?: number; fontWeight?: string; fontStyle?: string; lineHeight?: number };
export type SaveOptions = { annotations?: Annotation[] };

export async function open(input: PdfInput): Promise<PdfHandle> {
  if (typeof input === 'string') throw new Error('Path input is intentionally delegated to the host adapter.');
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  return { bytes, document: await PDFDocument.load(bytes, { updateMetadata: false }) };
}
export async function renderPage(handle: PdfHandle, page: number, scale = 1): Promise<{ page: number; scale: number; bytes: Uint8Array }> { if (page < 1 || scale <= 0) throw new Error('Invalid page or scale'); return { page, scale, bytes: handle.bytes }; }
export function annotate(handle: PdfHandle, annotation: Annotation): PdfHandle { void annotation; return handle; }

function chooseStandardFont(annotation: Annotation) {
  const name = `${annotation.fontName ?? ''} ${annotation.fontFamily ?? ''}`.toLowerCase();
  const bold = annotation.fontWeight === 'bold' || annotation.fontWeight === '700' || /bold|black|heavy/.test(name);
  const italic = annotation.fontStyle === 'italic' || /italic|oblique/.test(name);
  if (/courier|mono/.test(name)) { if (bold && italic) return StandardFonts.CourierBoldOblique; if (bold) return StandardFonts.CourierBold; if (italic) return StandardFonts.CourierOblique; return StandardFonts.Courier; }
  if (/times|roman|serif/.test(name) && !/sans|arial|helvetica/.test(name)) { if (bold && italic) return StandardFonts.TimesRomanBoldItalic; if (bold) return StandardFonts.TimesRomanBold; if (italic) return StandardFonts.TimesRomanItalic; return StandardFonts.TimesRoman; }
  if (bold && italic) return StandardFonts.HelveticaBoldOblique;
  if (bold) return StandardFonts.HelveticaBold;
  if (italic) return StandardFonts.HelveticaOblique;
  return StandardFonts.Helvetica;
}

/** Save the PDF and merge local annotations/replacements/images using pdf-lib. */
export async function save(handle: PdfHandle, options: SaveOptions = {}): Promise<Uint8Array> {
  const document = handle.document ?? await PDFDocument.load(handle.bytes, { updateMetadata: false });
  const annotations = options.annotations ?? [];
  const defaultFont = await document.embedFont(StandardFonts.Helvetica);
  const fontCache = new Map<string, Awaited<ReturnType<PDFDocument['embedFont']>>>();
  const getFont = async (annotation: Annotation) => { const standard = chooseStandardFont(annotation); if (!fontCache.has(standard)) fontCache.set(standard, await document.embedFont(standard)); return fontCache.get(standard)!; };

  for (const annotation of annotations) {
    const page = document.getPage(annotation.page - 1); if (!page) continue;
    const size = page.getSize();
    const viewportWidth = annotation.viewportWidth || size.width; const viewportHeight = annotation.viewportHeight || size.height;
    const sx = size.width / viewportWidth; const sy = size.height / viewportHeight;
    const sourceWidth = Math.max(4, (annotation.width ?? 160) * sx); const sourceHeight = Math.max(4, (annotation.height ?? 60) * sy);
    const x = annotation.x * sx; const y = size.height - (annotation.y + (annotation.height ?? 60)) * sy;

    if (annotation.type === 'rect') page.drawRectangle({ x, y, width: sourceWidth, height: sourceHeight, borderWidth: 1.2, borderColor: rgb(0.85, 0.55, 0), color: rgb(1, 0.85, 0.15), opacity: 0.28, borderOpacity: 0.9 });
    if (annotation.type === 'text' && annotation.text) page.drawText(annotation.text, { x: x + 6 * sx, y: y + Math.max(8, sourceHeight - 20 * sy), size: Math.max(10, 14 * sx), font: defaultFont, color: rgb(0.08, 0.08, 0.12), maxWidth: Math.max(40, sourceWidth - 12 * sx) });

    if (annotation.type === 'replacement') {
      const coverPad = Math.min(1.2, Math.min(sourceWidth, sourceHeight) * 0.08);
      const coverX = Math.max(0, x - coverPad); const coverY = Math.max(0, y - coverPad);
      const coverWidth = Math.min(size.width - coverX, sourceWidth + coverPad * 2); const coverHeight = Math.min(size.height - coverY, sourceHeight + coverPad * 2);
      page.drawRectangle({ x: coverX, y: coverY, width: coverWidth, height: coverHeight, color: rgb(1, 1, 1), opacity: 1, borderWidth: 0 });
      if (annotation.text) {
        const font = await getFont(annotation); const requestedSize = Math.max(6, (annotation.fontSize ?? 14) * sx); const lines = annotation.text.replace(/\r/g, '').split('\n');
        const estimatedLineHeight = sourceHeight / Math.max(1, lines.length);
        const requestedLineHeight = Math.max(requestedSize * 1.08, (annotation.lineHeight ?? estimatedLineHeight) * sy);
        const naturalWidth = Math.max(...lines.map((line) => font.widthOfTextAtSize(line, requestedSize)), 0);
        const widthRatio = naturalWidth > sourceWidth && sourceWidth > 0 ? sourceWidth / naturalWidth : 1;
        const requestedGlyphHeight = font.heightAtSize(requestedSize); const naturalHeight = requestedGlyphHeight + Math.max(0, lines.length - 1) * requestedLineHeight;
        const heightRatio = naturalHeight > sourceHeight && sourceHeight > 0 ? sourceHeight / naturalHeight : 1;
        const fitRatio = Math.min(1, widthRatio, heightRatio); const fontSize = Math.max(6, requestedSize * fitRatio); const lineHeight = Math.max(fontSize * 1.08, requestedLineHeight * fitRatio);
        const glyphHeight = font.heightAtSize(fontSize); const totalTextHeight = glyphHeight + Math.max(0, lines.length - 1) * lineHeight;
        const firstBaseline = y + Math.min(sourceHeight - glyphHeight * 0.15, Math.max(glyphHeight, sourceHeight - totalTextHeight + glyphHeight));
        lines.forEach((line, index) => page.drawText(line, { x, y: firstBaseline - index * lineHeight, size: fontSize, font, color: rgb(0.05, 0.05, 0.05), maxWidth: Math.max(4, sourceWidth) }));
      }
    }
    if (annotation.type === 'image' && annotation.imageData) { const image = annotation.imageData.startsWith('data:image/png') ? await document.embedPng(annotation.imageData) : await document.embedJpg(annotation.imageData); page.drawImage(image, { x, y, width: sourceWidth, height: sourceHeight }); }
  }
  return document.save({ useObjectStreams: true });
}
export async function ocrPage(handle: PdfHandle, page: number): Promise<string> { void handle; return `OCR placeholder for page ${page}`; }
