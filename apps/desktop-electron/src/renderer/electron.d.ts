/// <reference types="vite/client" />
interface Window { pdfEditor: { openFile: () => Promise<ArrayBuffer | undefined>; saveFile: (bytes: Uint8Array) => Promise<string | undefined>; renderPageRequest: (payload: unknown) => Promise<unknown>; annotateRequest: (payload: unknown) => Promise<unknown>; ocrRequest: (payload: unknown) => Promise<unknown>; }; }
