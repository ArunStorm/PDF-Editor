import Viewer from '@pdf-editor/pdf-ui';

async function downloadBytes(bytes: Uint8Array, fileName: string) {
  if (!bytes.byteLength) throw new Error('Cannot download an empty PDF');
  const blob = new Blob([new Uint8Array(bytes)], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  window.setTimeout(() => {
    anchor.remove();
    URL.revokeObjectURL(url);
  }, 1500);
}

async function saveBytes(bytes: Uint8Array) {
  if (!bytes.byteLength) throw new Error('Cannot save an empty PDF');
  const picker = (window as any).showSaveFilePicker as undefined | ((options?: any) => Promise<any>);
  if (picker) {
    const handle = await picker({
      suggestedName: 'edited.pdf',
      types: [{ description: 'PDF document', accept: { 'application/pdf': ['.pdf'] } }],
    });
    const writable = await handle.createWritable();
    await writable.write(new Uint8Array(bytes));
    await writable.close();
    return;
  }
  await downloadBytes(bytes, 'edited.pdf');
}

export default function App() {
  return <Viewer
    openFile={async () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'application/pdf';
      return new Promise((resolve) => {
        input.onchange = async () => resolve(input.files?.[0] ? input.files[0].arrayBuffer() : undefined);
        input.click();
      });
    }}
    saveFile={saveBytes}
    downloadFile={(bytes) => downloadBytes(bytes, 'edited.pdf')}
  />;
}
