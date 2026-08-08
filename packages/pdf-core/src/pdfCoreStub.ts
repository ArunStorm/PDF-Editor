import { PDFDocument } from 'pdf-lib';

export type PdfInput = ArrayBuffer | Uint8Array | string;
export type PdfHandle = { bytes: Uint8Array; document?: PDFDocument; source?: string };
export type Annotation = { id: string; type: 'rect' | 'text'; page: number; x: number; y: number; width?: number; height?: number; text?: string };
export type SaveOptions = { annotations?: Annotation[] };

export async function open(input: PdfInput): Promise<PdfHandle> {
  if (typeof input === 'string') {
    // TODO: Use fs/promises in the Electron main process for local paths.
    throw new Error('Path input is intentionally delegated to the host adapter.');
  }
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  return { bytes, document: await PDFDocument.load(bytes, { updateMetadata: false }) };
}

export async function renderPage(handle: PdfHandle, page: number, scale = 1): Promise<{ page: number; scale: number; bytes: Uint8Array }> {
  // TODO: PDF.js owns rasterization in the UI. This API is the stable boundary for future native/server renderers.
  if (page < 1 || scale <= 0) throw new Error('Invalid page or scale');
  return { page, scale, bytes: handle.bytes };
}

export function annotate(handle: PdfHandle, annotation: Annotation): PdfHandle {
  // TODO: Persist annotations in a document model and apply them with pdf-lib during save().
  void annotation;
  return handle;
}

export async function save(handle: PdfHandle, options: SaveOptions = {}): Promise<Uint8Array> {
  const document = handle.document ?? await PDFDocument.load(handle.bytes, { updateMetadata: false });
  // TODO: Draw text/rect annotations onto PDF pages using pdf-lib.
  void options;
  return document.save();
}

export async function ocrPage(handle: PdfHandle, page: number): Promise<string> {
  // TODO: Extract the rendered page image and call the pdf-ocr-worker Tesseract worker.
  void handle;
  return `OCR placeholder for page ${page}`;
}
