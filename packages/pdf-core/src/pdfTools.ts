import { PDFDocument, StandardFonts, degrees, rgb } from 'pdf-lib';

export type PageRange = { start: number; end: number };

/** Merge complete PDFs locally. No network or server is involved. */
export async function mergePdfs(inputs: ArrayBuffer[] | Uint8Array[]): Promise<Uint8Array> {
  const output = await PDFDocument.create();
  for (const input of inputs) {
    const source = await PDFDocument.load(input);
    const pages = await output.copyPages(source, source.getPageIndices());
    pages.forEach((page) => output.addPage(page));
  }
  return output.save({ useObjectStreams: true });
}

/** Extract selected pages (1-based inclusive ranges) into a new PDF. */
export async function splitPdf(input: ArrayBuffer | Uint8Array, ranges: PageRange[]): Promise<Uint8Array> {
  const source = await PDFDocument.load(input);
  const indexes = ranges.flatMap(({ start, end }) => {
    const first = Math.max(1, Math.min(start, source.getPageCount()));
    const last = Math.max(first, Math.min(end, source.getPageCount()));
    return Array.from({ length: last - first + 1 }, (_, i) => first - 1 + i);
  });
  const output = await PDFDocument.create();
  const pages = await output.copyPages(source, indexes);
  pages.forEach((page) => output.addPage(page));
  return output.save({ useObjectStreams: true });
}

/** Reorder pages by a 1-based page order, e.g. [2, 1, 3]. */
export async function reorderPages(input: ArrayBuffer | Uint8Array, order: number[]): Promise<Uint8Array> {
  const source = await PDFDocument.load(input);
  const indexes = order.map((page) => page - 1).filter((index) => index >= 0 && index < source.getPageCount());
  const output = await PDFDocument.create();
  const pages = await output.copyPages(source, indexes);
  pages.forEach((page) => output.addPage(page));
  return output.save({ useObjectStreams: true });
}

/** Delete 1-based page numbers. The document must keep at least one page. */
export async function deletePages(input: ArrayBuffer | Uint8Array, pagesToDelete: number[]): Promise<Uint8Array> {
  const source = await PDFDocument.load(input);
  const remove = new Set(pagesToDelete.map((page) => page - 1));
  const keep = source.getPageIndices().filter((index) => !remove.has(index));
  if (!keep.length) throw new Error('A PDF must contain at least one page.');
  const output = await PDFDocument.create();
  const pages = await output.copyPages(source, keep);
  pages.forEach((page) => output.addPage(page));
  return output.save({ useObjectStreams: true });
}

/** Rotate one page by a multiple of 90 degrees. */
export async function rotatePage(input: ArrayBuffer | Uint8Array, pageNumber: number, angle = 90): Promise<Uint8Array> {
  const document = await PDFDocument.load(input);
  const page = document.getPage(pageNumber - 1);
  const current = page.getRotation().angle;
  page.setRotation(degrees((current + angle) % 360));
  return document.save({ useObjectStreams: true });
}

export type MetadataOptions = {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string[];
  creator?: string;
};

export async function updateMetadata(input: ArrayBuffer | Uint8Array, options: MetadataOptions): Promise<Uint8Array> {
  const document = await PDFDocument.load(input);
  if (options.title !== undefined) document.setTitle(options.title);
  if (options.author !== undefined) document.setAuthor(options.author);
  if (options.subject !== undefined) document.setSubject(options.subject);
  if (options.keywords !== undefined) document.setKeywords(options.keywords);
  if (options.creator !== undefined) document.setCreator(options.creator);
  document.setModificationDate(new Date());
  return document.save({ useObjectStreams: true });
}

/** Add a light text watermark to every page. */
export async function addWatermark(input: ArrayBuffer | Uint8Array, text: string, opacity = 0.18): Promise<Uint8Array> {
  const document = await PDFDocument.load(input);
  const font = await document.embedFont(StandardFonts.HelveticaBold);
  for (const page of document.getPages()) {
    const { width, height } = page.getSize();
    page.drawText(text, {
      x: width * 0.2,
      y: height * 0.45,
      size: Math.max(18, Math.min(width, height) / 12),
      font,
      color: rgb(0.35, 0.35, 0.35),
      opacity: Math.max(0.03, Math.min(1, opacity)),
      rotate: degrees(35),
    });
  }
  return document.save({ useObjectStreams: true });
}

/** Add simple page numbers using the built-in Helvetica font. */
export async function addPageNumbers(input: ArrayBuffer | Uint8Array, format = 'Page {page} of {total}'): Promise<Uint8Array> {
  const document = await PDFDocument.load(input);
  const font = await document.embedFont(StandardFonts.Helvetica);
  const total = document.getPageCount();
  document.getPages().forEach((page, index) => {
    const label = format.replace('{page}', String(index + 1)).replace('{total}', String(total));
    const { width } = page.getSize();
    const textWidth = font.widthOfTextAtSize(label, 9);
    page.drawText(label, { x: Math.max(12, (width - textWidth) / 2), y: 12, size: 9, font, color: rgb(0.25, 0.25, 0.25) });
  });
  return document.save({ useObjectStreams: true });
}

/** Local save optimization. It uses object streams; it is not lossy image compression. */
export async function optimizePdf(input: ArrayBuffer | Uint8Array): Promise<Uint8Array> {
  const document = await PDFDocument.load(input);
  return document.save({ useObjectStreams: true, addDefaultPage: false });
}
