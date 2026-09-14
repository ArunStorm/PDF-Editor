import { contextBridge, ipcRenderer } from 'electron';

type Api = {
  openFile: () => Promise<ArrayBuffer | undefined>;
  saveFile: (bytes: Uint8Array) => Promise<string | undefined>;
  renderPageRequest: (payload: unknown) => Promise<unknown>;
  annotateRequest: (payload: unknown) => Promise<unknown>;
  ocrRequest: (payload: unknown) => Promise<unknown>;
};

const api: Api = {
  openFile: () => ipcRenderer.invoke('openFile'),
  saveFile: (bytes) => ipcRenderer.invoke('saveFile', bytes),
  renderPageRequest: (payload) => ipcRenderer.invoke('renderPageRequest', payload),
  annotateRequest: (payload) => ipcRenderer.invoke('annotateRequest', payload),
  ocrRequest: (payload) => ipcRenderer.invoke('ocrRequest', payload)
};
contextBridge.exposeInMainWorld('pdfEditor', api);
