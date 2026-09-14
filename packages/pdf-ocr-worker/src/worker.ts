import { createWorker } from 'tesseract.js';

type OcrRequest = { type: 'ocr'; pageImage: string };
type OcrResult = { type: 'result'; text: string };

self.onmessage = async (event: MessageEvent<OcrRequest>) => {
  if (event.data?.type !== 'ocr') return;
  try {
    const worker = await createWorker('eng');
    const result = await worker.recognize(event.data.pageImage);
    const message: OcrResult = { type: 'result', text: result.data.text };
    self.postMessage(message);
    await worker.terminate();
  } catch (error) {
    self.postMessage({ type: 'result', text: `OCR demo error: ${String(error)}` } satisfies OcrResult);
  }
};
