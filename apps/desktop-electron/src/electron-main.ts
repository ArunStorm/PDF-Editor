import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = process.env.ELECTRON_DEV === '1' || !app.isPackaged;

function createWindow() {
  const win = new BrowserWindow({
    width: 1280, height: 900,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, preload: path.join(__dirname, 'preload.js') }
  });
  win.webContents.session.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
  if (isDev) win.loadURL(process.env.VITE_DEV_SERVER_URL ?? 'http://127.0.0.1:5173');
  else win.loadFile(path.join(__dirname, '../dist/index.html'));
}

ipcMain.handle('openFile', async () => {
  const result = await dialog.showOpenDialog({ properties: ['openFile'], filters: [{ name: 'PDF', extensions: ['pdf'] }] });
  if (result.canceled || !result.filePaths[0]) return undefined;
  return fs.readFile(result.filePaths[0]);
});
ipcMain.handle('saveFile', async (_event, bytes: Uint8Array) => {
  const result = await dialog.showSaveDialog({ defaultPath: 'edited.pdf', filters: [{ name: 'PDF', extensions: ['pdf'] }] });
  if (!result.canceled && result.filePath) await fs.writeFile(result.filePath, Buffer.from(bytes));
  return result.filePath;
});
ipcMain.handle('renderPageRequest', async (_event, payload) => payload); // TODO: delegate to pdf-core/native renderer.
ipcMain.handle('annotateRequest', async (_event, payload) => payload); // TODO: validate and persist annotation commands.
ipcMain.handle('ocrRequest', async (_event, payload) => ({ text: 'OCR worker request accepted', payload })); // TODO: route to worker.

app.whenReady().then(() => { createWindow(); app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); }); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
