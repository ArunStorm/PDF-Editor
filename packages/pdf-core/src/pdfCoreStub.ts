import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

/** Shared PDF domain types. Rendering stays in PDF.js; local editing/export uses pdf-lib. */
export type PdfInput = ArrayBuffer | Uint8Array | string;
export type PdfHandle = { bytes: Uint8Array; document?: PDFDocument; source?: string };

export type Annotation = {
  id: string;
  type: 'rect' | 'text' | 'replacement' | 'image';
  page: number;
  x: number;
  y: number;
  width?: number;
  height?: number;
  text?: string;
  originalText?: string;
  imageData?: string;
  viewportWidth?: number;
  viewportHeight?: number;
  fontName?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string;
  fontStyle?: string;
};

export type SaveOptions = { annotations?: Annotation[] };

export async function open(input: PdfInput): Promise<PdfHandle> {
  if (typeof input === 'string') {
    throw new Error('Path input is intentionally delegated to the host adapter.');
  }
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  return { bytes, document: await PDFDocument.load(bytes, { updateMetadata: false }) };
}

export async function renderPage(handle: PdfHandle, page: number, scale = 1): Promise<{ page: number; scale: number; bytes: Uint8Array }> {
  if (page < 1 || scale <= 0) throw new Error('Invalid page or scale');
  return { page, scale, bytes: handle.bytes };
}

export function annotate(handle: PdfHandle, annotation: Annotation): PdfHandle {
  void annotation;
  return handle;
}

function chooseStandardFont(annotation: Annotation) {
  const name = `${annotation.fontName ?? ''} ${annotation.fontFamily ?? ''}`.toLowerCase();
  const bold = annotation.fontWeight === 'bold' || annotation.fontWeight === '700' || /bold|black|heavy/.test(name);
  const italic = annotation.fontStyle === 'italic' || /italic|oblique/.test(name);

  if (/courier|mono/.test(name)) {
    if (bold && italic) return StandardFonts.CourierBoldOblique;
    if (bold) return StandardFonts.CourierBold;
    if (italic) return StandardFonts.CourierOblique;
    return StandardFonts.Courier;
  }
  if (/times|serif/.test(name)) {
    if (bold && italic) return StandardFonts.TimesRomanBoldItalic;
    if (bold) return StandardFonts.TimesRomanBold;
    if (italic) return StandardFonts.TimesRomanItalic;
    return StandardFonts.TimesRoman;
  }
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

  const getFont = async (annotation: Annotation) => {
    const standard = chooseStandardFont(annotation);
    if (!fontCache.has(standard)) fontCache.set(standard, await document.embedFont(standard));
    return fontCache.get(standard)!;
  };

  for (const annotation of annotations) {
    const page = document.getPage(annotation.page - 1);
    if (!page) continue;

    const size = page.getSize();
    const viewportWidth = annotation.viewportWidth || size.width;
    const viewportHeight = annotation.viewportHeight || size.height;
    const sx = size.width / viewportWidth;
    const sy = size.height / viewportHeight;
    const width = (annotation.width ?? 160) * sx;
    const height = (annotation.height ?? 60) * sy;
    const x = annotation.x * sx;
    const y = size.height - (annotation.y + (annotation.height ?? 60)) * sy;

    if (annotation.type === 'rect') {
      page.drawRectangle({
        x, y, width, height,
        borderWidth: 1.2,
        borderColor: rgb(0.85, 0.55, 0),
        color: rgb(1, 0.85, 0.15),
        opacity: 0.28,
        borderOpacity: 0.9,
      });
    }

    if (annotation.type === 'text' && annotation.text) {
      page.drawText(annotation.text, {
        x: x + 6 * sx,
        y: y + Math.max(8, height - 20 * sy),
        size: Math.max(10, 14 * sx),
        font: defaultFont,
        color: rgb(0.08, 0.08, 0.12),
        maxWidth: Math.max(40, width - 12 * sx),
      });
    }

    if (annotation.type === 'replacement' && annotation.text) {
      // Cover only the original text box, then redraw using the closest standard
      // font family/weight/style reported by PDF.js. This keeps the replacement
      // on the same line and visually close to the source formatting.
      page.drawRectangle({ x, y, width, height, color: rgb(1, 1, 1), opacity: 1, borderWidth: 0 });
      const font = await getFont(annotation);
      const fontSize = Math.max(6, (annotation.fontSize ?? 14) * sx);
      const baseline = y + Math.max(1, height - font.heightAtSize(fontSize));
      page.drawText(annotation.text, {
        x,
        y: baseline,
        size: fontSize,
        font,
        color: rgb(0.05, 0.05, 0.05),
      });
    }

    if (annotation.type === 'image' && annotation.imageData) {
      const image = annotation.imageData.startsWith('data:image/png')
        ? await document.embedPng(annotation.imageData)
        : await document.embedJpg(annotation.imageData);
      page.drawImage(image, { x, y, width, height });
    }
  }

  return document.save({ useObjectStreams: true });
}

export async function ocrPage(handle: PdfHandle, page: number): Promise<string> {
  void handle;
  return `OCR placeholder for page ${page}`;
}
