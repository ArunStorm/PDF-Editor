import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

/** Shared PDF domain types. Heavy rendering stays in PDF.js; editing is local via pdf-lib. */
export type PdfInput = ArrayBuffer | Uint8Array | string;
export type PdfHandle = { bytes: Uint8Array; document?: PDFDocument; source?: string };

export type Annotation = {
  id: string;
  type: 'rect' | 'text';
  page: number;
  x: number;
  y: number;
  width?: number;
  height?: number;
  text?: string;
  /** Viewer canvas dimensions used to convert top-left UI coordinates to PDF points. */
  viewportWidth?: number;
  viewportHeight?: number;
};

export type SaveOptions = { annotations?: Annotation[] };

export async function open(input: PdfInput): Promise<PdfHandle> {
  if (typeof input === 'string') {
    // TODO: Electron host adapter can resolve local filesystem paths before calling this package.
    throw new Error('Path input is intentionally delegated to the host adapter.');
  }
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  return { bytes, document: await PDFDocument.load(bytes, { updateMetadata: false }) };
}

export async function renderPage(handle: PdfHandle, page: number, scale = 1): Promise<{ page: number; scale: number; bytes: Uint8Array }> {
  // TODO: PDF.js owns rasterization in the UI. Keep this API for future native/server renderers.
  if (page < 1 || scale <= 0) throw new Error('Invalid page or scale');
  return { page, scale, bytes: handle.bytes };
}

export function annotate(handle: PdfHandle, annotation: Annotation): PdfHandle {
  // Keep the handle immutable-friendly; the UI passes the annotation collection to save().
  void annotation;
  return handle;
}

/** Save the current PDF and, when supplied, merge simple local annotations with pdf-lib. */
export async function save(handle: PdfHandle, options: SaveOptions = {}): Promise<Uint8Array> {
  const document = handle.document ?? await PDFDocument.load(handle.bytes, { updateMetadata: false });
  const annotations = options.annotations ?? [];

  // TODO: Expand this renderer with arrows, highlights, freehand paths, images, links and form fields.
  if (annotations.length > 0) {
    const font = await document.embedFont(StandardFonts.Helvetica);

    for (const annotation of annotations) {
      const page = document.getPage(annotation.page - 1);
      if (!page) continue;

      const size = page.getSize();
      const viewportWidth = annotation.viewportWidth || size.width;
      const viewportHeight = annotation.viewportHeight || size.height;
      const sx = size.width / viewportWidth;
      const sy = size.height / viewportHeight;
      const x = annotation.x * sx;
      const width = (annotation.width ?? 160) * sx;
      const height = (annotation.height ?? 60) * sy;
      // Viewer coordinates are top-left; PDF coordinates are bottom-left.
      const y = size.height - (annotation.y + (annotation.height ?? 60)) * sy;

      if (annotation.type === 'rect') {
        page.drawRectangle({
          x,
          y,
          width,
          height,
          borderWidth: 1.5,
          borderColor: rgb(0.12, 0.35, 0.85),
          color: rgb(0.12, 0.35, 0.85),
          opacity: 0.08,
          borderOpacity: 0.95,
        });
      }

      if (annotation.type === 'text' && annotation.text) {
        page.drawText(annotation.text, {
          x: x + 6 * sx,
          y: y + Math.max(8, height - 20 * sy),
          size: Math.max(10, 14 * sx),
          font,
          color: rgb(0.08, 0.08, 0.12),
          maxWidth: Math.max(40, width - 12 * sx),
        });
      }
    }
  }

  return document.save();
}

export async function ocrPage(handle: PdfHandle, page: number): Promise<string> {
  // TODO: Render the requested page with PDF.js and call pdf-ocr-worker with its image data.
  void handle;
  return `OCR placeholder for page ${page}`;
}
