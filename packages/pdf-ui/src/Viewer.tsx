import React, { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Rect, Text as KonvaText } from 'react-konva';
import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy, type PDFPageProxy } from 'pdfjs-dist';
import {
  pdfCore,
  type Annotation,
  addPageNumbers,
  addWatermark,
  deletePages,
  fillFormFields,
  flattenForm,
  listFormFields,
  mergePdfs,
  optimizePdf,
  reorderPages,
  rotatePage,
  splitPdf,
  updateMetadata,
} from '@pdf-editor/pdf-core';
import TextLayer, { type TextSelection } from './TextLayer';

GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url).toString();

type Props = {
  openFile?: () => Promise<ArrayBuffer | undefined>;
  saveFile?: (bytes: Uint8Array) => Promise<void>;
};
type Tool = 'select' | 'text' | 'highlight' | 'pdf-text';
type Point = { x: number; y: number };
type OcrResult = { type: 'result'; text: string };

const btn: React.CSSProperties = {
  border: '1px solid #cbd5e1',
  background: '#fff',
  color: '#0f172a',
  borderRadius: 7,
  padding: '7px 10px',
  cursor: 'pointer',
  fontSize: 13,
};
const activeBtn: React.CSSProperties = {
  ...btn,
  background: '#e8f0ff',
  borderColor: '#2563eb',
  color: '#1747a6',
};
const primaryBtn: React.CSSProperties = {
  ...btn,
  background: '#2563eb',
  color: '#fff',
  borderColor: '#2563eb',
};

function AnnotationOverlay({
  width,
  height,
  annotations,
  selectedId,
  tool,
  onSelect,
  onMove,
  onAddText,
  onAddHighlight,
}: {
  width: number;
  height: number;
  annotations: Annotation[];
  selectedId: string | null;
  tool: Tool;
  onSelect: (id: string) => void;
  onMove: (id: string, x: number, y: number) => void;
  onAddText: (x: number, y: number) => void;
  onAddHighlight: (x: number, y: number, w: number, h: number) => void;
}) {
  const [start, setStart] = useState<Point | null>(null);
  const [draft, setDraft] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const point = (stage: any): Point => {
    const p = stage.getPointerPosition();
    return {
      x: Math.max(0, Math.min(width, p?.x ?? 0)),
      y: Math.max(0, Math.min(height, p?.y ?? 0)),
    };
  };

  // The PDF text layer sits underneath this canvas. When editing source PDF text,
  // the Konva canvas must not intercept the click.
  const interactive = tool !== 'pdf-text';

  return (
    <Stage
      width={width}
      height={height}
      listening={interactive}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: interactive ? 'auto' : 'none',
        cursor: tool === 'text' ? 'text' : tool === 'highlight' ? 'crosshair' : 'default',
      }}
      onMouseDown={(e: any) => {
        if (tool === 'text') {
          const p = point(e.target.getStage());
          onAddText(p.x, p.y);
        } else if (tool === 'highlight') {
          const p = point(e.target.getStage());
          setStart(p);
          setDraft({ x: p.x, y: p.y, width: 0, height: 0 });
        }
      }}
      onMouseMove={(e: any) => {
        if (!start || tool !== 'highlight') return;
        const p = point(e.target.getStage());
        setDraft({
          x: Math.min(start.x, p.x),
          y: Math.min(start.y, p.y),
          width: Math.abs(p.x - start.x),
          height: Math.abs(p.y - start.y),
        });
      }}
      onMouseUp={() => {
        if (start && draft && draft.width > 8 && draft.height > 8) {
          onAddHighlight(draft.x, draft.y, draft.width, draft.height);
        }
        setStart(null);
        setDraft(null);
      }}
    >
      <Layer>
        {annotations.map((a) => {
          const selected = selectedId === a.id;
          const draggable = tool === 'select';

          if (a.type === 'image') {
            return (
              <Rect
                key={a.id}
                x={a.x}
                y={a.y}
                width={a.width ?? 180}
                height={a.height ?? 80}
                stroke={selected ? '#2563eb' : '#64748b'}
                dash={[4, 3]}
                draggable={draggable}
                onClick={(e) => {
                  e.cancelBubble = true;
                  onSelect(a.id);
                }}
                onDragEnd={(e) => onMove(a.id, e.target.x(), e.target.y())}
              />
            );
          }

          if (a.type === 'rect') {
            return (
              <Rect
                key={a.id}
                x={a.x}
                y={a.y}
                width={a.width ?? 180}
                height={a.height ?? 60}
                fill="rgba(250,204,21,.30)"
                stroke={selected ? '#2563eb' : '#eab308'}
                strokeWidth={selected ? 2.5 : 1}
                draggable={draggable}
                onClick={(e) => {
                  e.cancelBubble = true;
                  onSelect(a.id);
                }}
                onDragEnd={(e) => onMove(a.id, e.target.x(), e.target.y())}
              />
            );
          }

          return (
            <React.Fragment key={a.id}>
              <Rect
                x={a.x}
                y={a.y}
                width={a.width ?? 200}
                height={a.height ?? 45}
                fill={a.type === 'replacement' ? '#fff' : 'rgba(255,255,255,.75)'}
                stroke={selected ? '#2563eb' : 'transparent'}
                strokeWidth={selected ? 2 : 0}
                draggable={draggable}
                onClick={(e) => {
                  e.cancelBubble = true;
                  onSelect(a.id);
                }}
                onDragEnd={(e) => onMove(a.id, e.target.x(), e.target.y())}
              />
              <KonvaText
                x={a.x + 4}
                y={a.y + 3}
                width={Math.max(20, (a.width ?? 200) - 8)}
                text={a.text ?? ''}
                fontSize={Math.max(10, Math.min(18, (a.height ?? 45) * 0.55))}
                fill="#111827"
                listening={false}
              />
            </React.Fragment>
          );
        })}
        {draft && (
          <Rect
            x={draft.x}
            y={draft.y}
            width={draft.width}
            height={draft.height}
            fill="rgba(250,204,21,.18)"
            stroke="#ca8a04"
            dash={[6, 4]}
          />
        )}
      </Layer>
    </Stage>
  );
}

export default function Viewer({ openFile, saveFile }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const thumbRefs = useRef<Record<number, HTMLCanvasElement | null>>({});
  const ocrWorker = useRef<Worker | null>(null);
  const signatureCanvas = useRef<HTMLCanvasElement>(null);

  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [page, setPage] = useState<PDFPageProxy | null>(null);
  const [sourceBytes, setSourceBytes] = useState<Uint8Array | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.15);
  const [rotation, setRotation] = useState(0);
  const [tool, setTool] = useState<Tool>('select');
  const [notes, setNotes] = useState<Annotation[]>([]);
  const [history, setHistory] = useState<Annotation[][]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedPdfText, setSelectedPdfText] = useState<TextSelection | null>(null);
  const [status, setStatus] = useState('Loading sample.pdf…');
  const [search, setSearch] = useState('');
  const [ocrText, setOcrText] = useState('');
  const [showTools, setShowTools] = useState(false);
  const [showSignature, setShowSignature] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);

  const commit = (next: Annotation[]) => {
    setHistory((h) => [...h, notes]);
    setNotes(next);
    setDirty(true);
  };

  async function loadBytes(input: ArrayBuffer | Uint8Array, resetEdits = true) {
    const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
    const pdf = await getDocument({ data: bytes, isEvalSupported: false, disableJavaScript: true }).promise;
    setSourceBytes(bytes);
    setDoc(pdf);
    setPageNumber(1);
    setPageCount(pdf.numPages);
    if (resetEdits) {
      setNotes([]);
      setHistory([]);
      setSelectedId(null);
      setSelectedPdfText(null);
    }
    setDirty(false);
    setStatus(`${pdf.numPages} page${pdf.numPages === 1 ? '' : 's'} loaded`);
  }

  async function render() {
    if (!doc || !canvasRef.current) return;
    const current = await doc.getPage(pageNumber);
    setPage(current);
    const viewport = current.getViewport({ scale, rotation });
    const canvas = canvasRef.current;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.ceil(viewport.width * dpr);
    canvas.height = Math.ceil(viewport.height * dpr);
    canvas.style.width = `${Math.ceil(viewport.width)}px`;
    canvas.style.height = `${Math.ceil(viewport.height)}px`;
    const context = canvas.getContext('2d');
    if (!context) return;
    await current.render({
      canvasContext: context,
      viewport,
      transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined,
    }).promise;
  }

  async function thumbnails() {
    if (!doc) return;
    for (let i = 1; i <= doc.numPages; i += 1) {
      const canvas = thumbRefs.current[i];
      if (!canvas) continue;
      const p = await doc.getPage(i);
      const vp = p.getViewport({ scale: 0.18 });
      canvas.width = Math.ceil(vp.width);
      canvas.height = Math.ceil(vp.height);
      const c = canvas.getContext('2d');
      if (c) await p.render({ canvasContext: c, viewport: vp }).promise;
    }
  }

  useEffect(() => {
    fetch('/assets/sample.pdf')
      .then((r) => r.arrayBuffer())
      .then((bytes) => loadBytes(bytes))
      .catch((e) => setStatus(`Sample load failed: ${String(e)}`));
  }, []);

  useEffect(() => {
    render().catch((e) => setStatus(`Render failed: ${String(e)}`));
  }, [doc, pageNumber, scale, rotation]);

  useEffect(() => {
    thumbnails().catch(() => undefined);
  }, [doc]);

  useEffect(() => {
    try {
      ocrWorker.current = new Worker(new URL('../../pdf-ocr-worker/src/worker.ts', import.meta.url), { type: 'module' });
    } catch {
      ocrWorker.current = null;
    }
    return () => ocrWorker.current?.terminate();
  }, []);

  async function openPdf() {
    try {
      const bytes = await openFile?.();
      if (bytes) await loadBytes(bytes);
    } catch (e) {
      setStatus(`Open failed: ${String(e)}`);
    }
  }

  async function savePdf() {
    if (!sourceBytes) return setStatus('No PDF loaded');
    if (!saveFile) return setStatus('Save is not available in this client');
    setBusy(true);
    try {
      const output = await pdfCore.save(await pdfCore.open(sourceBytes), { annotations: notes });
      await saveFile(output);
      await loadBytes(output);
      setStatus('PDF saved successfully');
    } catch (e) {
      setStatus(`Save failed: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  async function downloadPdf() {
    // Save and Download intentionally use the same local PDF pipeline. The web client
    // downloads a file; Electron opens the native Save dialog.
    await savePdf();
  }

  function addText(x: number, y: number) {
    const text = window.prompt('Text to add:', 'New text');
    if (!text?.trim()) return;
    const note: Annotation = {
      id: crypto.randomUUID(),
      type: 'text',
      page: pageNumber,
      x,
      y,
      width: 240,
      height: 45,
      text: text.trim(),
      viewportWidth: canvasRef.current?.clientWidth,
      viewportHeight: canvasRef.current?.clientHeight,
    };
    commit([...notes, note]);
    setSelectedId(note.id);
    setTool('select');
    setStatus('Text added. Click Save PDF to write it into the PDF.');
  }

  function addHighlight(x: number, y: number, width: number, height: number) {
    const note: Annotation = {
      id: crypto.randomUUID(),
      type: 'rect',
      page: pageNumber,
      x,
      y,
      width,
      height,
      viewportWidth: canvasRef.current?.clientWidth,
      viewportHeight: canvasRef.current?.clientHeight,
    };
    commit([...notes, note]);
    setSelectedId(note.id);
    setTool('select');
    setStatus('Highlight added. Click Save PDF to write it into the PDF.');
  }

  function replaceText(selection: TextSelection) {
    const replacement = window.prompt(`Replace “${selection.text}” with:`, selection.text);
    if (replacement === null) return;
    const note: Annotation = {
      id: crypto.randomUUID(),
      type: 'replacement',
      page: pageNumber,
      x: selection.x,
      y: selection.y,
      width: selection.width,
      height: selection.height,
      text: replacement,
      originalText: selection.text,
      viewportWidth: canvasRef.current?.clientWidth,
      viewportHeight: canvasRef.current?.clientHeight,
    };
    commit([...notes, note]);
    setSelectedId(note.id);
    setSelectedPdfText(null);
    setTool('select');
    setStatus(`Text replaced on screen. Click Save PDF to commit “${replacement}”.`);
  }

  function handlePdfTextSelect(selection: TextSelection) {
    setSelectedPdfText(selection);
    setStatus(`Selected “${selection.text}”. Opening the editor…`);
    // Single-click editing: this is the behavior users expect from an Edit Text tool.
    replaceText(selection);
  }

  function editSelected() {
    if (!selectedId) return setStatus('Select an added/replaced annotation first');
    const item = notes.find((n) => n.id === selectedId);
    if (!item || !['text', 'replacement'].includes(item.type)) {
      return setStatus('Select a text annotation to edit');
    }
    const text = window.prompt('Edit text:', item.text ?? '');
    if (text === null) return;
    commit(notes.map((n) => (n.id === selectedId ? { ...n, text } : n)));
    setStatus('Annotation updated. Click Save PDF to commit it.');
  }

  function removeSelected() {
    if (!selectedId) return setStatus('Select an annotation first');
    commit(notes.filter((n) => n.id !== selectedId));
    setSelectedId(null);
    setStatus('Annotation deleted. Click Save PDF to commit the deletion.');
  }

  function moveAnnotation(id: string, x: number, y: number) {
    commit(notes.map((n) => (n.id === id ? { ...n, x, y } : n)));
    setStatus('Annotation moved. Click Save PDF to commit it.');
  }

  function undo() {
    const previous = history.at(-1);
    if (!previous) return setStatus('Nothing to undo');
    setNotes(previous);
    setHistory((h) => h.slice(0, -1));
    setSelectedId(null);
    setDirty(true);
    setStatus('Undo complete. Click Save PDF to commit the current state.');
  }

  async function ocr() {
    if (!canvasRef.current) return;
    setStatus('Running local OCR…');
    setOcrText('');
    const worker = ocrWorker.current;
    if (!worker) {
      const text = page
        ? (await page.getTextContent()).items.map((i: any) => ('str' in i ? i.str : '')).join(' ')
        : '';
      setOcrText(text);
      setStatus('OCR worker unavailable; extracted embedded PDF text instead');
      return;
    }
    const result = await new Promise<string>((resolve) => {
      const handler = (event: MessageEvent<OcrResult>) => {
        if (event.data?.type !== 'result') return;
        worker.removeEventListener('message', handler);
        resolve(event.data.text);
      };
      worker.addEventListener('message', handler);
      worker.postMessage({ type: 'ocr', pageImage: canvasRef.current!.toDataURL('image/png') });
    });
    setOcrText(result);
    setStatus('OCR completed locally');
  }

  async function find() {
    if (!doc || !search.trim()) return setStatus('Enter text to search');
    const q = search.toLowerCase();
    for (let i = 1; i <= doc.numPages; i += 1) {
      const text = (await (await doc.getPage(i)).getTextContent()).items
        .map((x: any) => ('str' in x ? x.str : ''))
        .join(' ')
        .toLowerCase();
      if (text.includes(q)) {
        setPageNumber(i);
        setStatus(`Found “${search}” on page ${i}`);
        return;
      }
    }
    setStatus(`“${search}” not found`);
  }

  async function transform(action: () => Promise<Uint8Array>) {
    setBusy(true);
    try {
      const output = await action();
      await loadBytes(output);
      setStatus('PDF updated successfully. Click Save PDF to save this version.');
    } catch (e) {
      setStatus(`Operation failed: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  async function merge() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/pdf';
    input.multiple = true;
    input.onchange = async () => {
      const files = [...(input.files ?? [])];
      if (files.length < 2) return setStatus('Select at least two PDFs to merge');
      const buffers = await Promise.all(files.map((f) => f.arrayBuffer()));
      await transform(() => mergePdfs(buffers));
    };
    input.click();
  }

  async function split() {
    if (!sourceBytes) return setStatus('No PDF loaded');
    const value = window.prompt('Pages to extract, e.g. 1-3,5:', `1-${pageCount}`);
    if (!value) return;
    const ranges = value
      .split(',')
      .map((part) => {
        const [a, b] = part.trim().split('-').map(Number);
        return { start: a, end: b || a };
      })
      .filter((r) => Number.isFinite(r.start));
    await transform(() => splitPdf(sourceBytes, ranges));
  }

  async function deleteCurrent() {
    if (!sourceBytes || pageCount <= 1) return setStatus('Cannot delete the only page');
    if (!window.confirm(`Delete page ${pageNumber}?`)) return;
    await transform(() => deletePages(sourceBytes, [pageNumber]));
  }

  async function movePage(delta: number) {
    if (!sourceBytes) return setStatus('No PDF loaded');
    const target = pageNumber + delta;
    if (target < 1 || target > pageCount) return setStatus('Page cannot move further in that direction');
    const order = Array.from({ length: pageCount }, (_, i) => i + 1);
    [order[pageNumber - 1], order[target - 1]] = [order[target - 1], order[pageNumber - 1]];
    await transform(() => reorderPages(sourceBytes, order));
  }

  async function rotateCurrent() {
    if (!sourceBytes) return setStatus('No PDF loaded');
    await transform(() => rotatePage(sourceBytes, pageNumber, 90));
  }

  async function watermark() {
    if (!sourceBytes) return setStatus('No PDF loaded');
    const text = window.prompt('Watermark text:', 'CONFIDENTIAL');
    if (text) await transform(() => addWatermark(sourceBytes, text));
  }

  async function numberPages() {
    if (!sourceBytes) return setStatus('No PDF loaded');
    await transform(() => addPageNumbers(sourceBytes));
  }

  async function metadata() {
    if (!sourceBytes) return setStatus('No PDF loaded');
    const title = window.prompt('PDF title:', '');
    if (title === null) return;
    const author = window.prompt('Author:', '');
    if (author === null) return;
    await transform(() => updateMetadata(sourceBytes, { title, author }));
  }

  async function optimize() {
    if (!sourceBytes) return setStatus('No PDF loaded');
    await transform(() => optimizePdf(sourceBytes));
  }

  async function forms() {
    if (!sourceBytes) return setStatus('No PDF loaded');
    try {
      const fields = await listFormFields(sourceBytes);
      if (!fields.length) return setStatus('This PDF has no AcroForm fields');
      const values: Record<string, string | boolean> = {};
      for (const field of fields) {
        const value = window.prompt(`${field.name} (${field.type}) — leave blank to skip:`, '');
        if (value !== null && value !== '') values[field.name] = value;
      }
      const output = await fillFormFields(sourceBytes, values);
      await loadBytes(output);
      setStatus(`Filled ${Object.keys(values).length} form field(s). Click Save PDF to save it.`);
    } catch (e) {
      setStatus(`Form operation failed: ${String(e)}`);
    }
  }

  async function flatten() {
    if (!sourceBytes) return setStatus('No PDF loaded');
    await transform(() => flattenForm(sourceBytes));
  }

  function signaturePointer(e: React.PointerEvent<HTMLCanvasElement>) {
    const c = signatureCanvas.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const r = c.getBoundingClientRect();
    const x = ((e.clientX - r.left) * c.width) / r.width;
    const y = ((e.clientY - r.top) * c.height) / r.height;
    if (e.type === 'pointerdown') {
      ctx.beginPath();
      ctx.moveTo(x, y);
      c.setPointerCapture(e.pointerId);
    } else if (e.type === 'pointermove' && e.buttons) {
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  }

  function clearSignature() {
    const c = signatureCanvas.current;
    const ctx = c?.getContext('2d');
    if (c && ctx) ctx.clearRect(0, 0, c.width, c.height);
  }

  function applySignature() {
    const c = signatureCanvas.current;
    if (!c || !sourceBytes) return;
    const note: Annotation = {
      id: crypto.randomUUID(),
      type: 'image',
      page: pageNumber,
      x: 80,
      y: 80,
      width: 220,
      height: 90,
      imageData: c.toDataURL('image/png'),
      viewportWidth: canvasRef.current?.clientWidth,
      viewportHeight: canvasRef.current?.clientHeight,
    };
    commit([...notes, note]);
    setSelectedId(note.id);
    setShowSignature(false);
    setStatus('Signature added. Drag it into position, then click Save PDF.');
  }

  function addImage() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const note: Annotation = {
          id: crypto.randomUUID(),
          type: 'image',
          page: pageNumber,
          x: 70,
          y: 70,
          width: 220,
          height: 140,
          imageData: String(reader.result),
          viewportWidth: canvasRef.current?.clientWidth,
          viewportHeight: canvasRef.current?.clientHeight,
        };
        commit([...notes, note]);
        setSelectedId(note.id);
        setStatus('Image added. Drag it into position, then click Save PDF.');
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }

  const currentAnnotations = notes.filter((n) => n.page === pageNumber);
  const viewport = page?.getViewport({ scale, rotation });
  const width = viewport?.width ?? 600;
  const height = viewport?.height ?? 800;

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#eef2f7', fontFamily: 'Inter, Segoe UI, system-ui, sans-serif', color: '#172033' }}>
      <header style={{ background: '#101828', color: '#fff', padding: '11px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div><strong style={{ fontSize: 18 }}>PDF Editor</strong><div style={{ fontSize: 11, color: '#98a2b3' }}>Private • local-first • open source</div></div>
        <span style={{ fontSize: 12, color: dirty ? '#fdb022' : '#d0d5dd' }}>{dirty ? '● Unsaved changes' : status}</span>
      </header>

      <nav style={{ background: '#fff', borderBottom: '1px solid #d0d5dd', padding: 7, display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
        <button style={btn} onClick={openPdf} disabled={busy}>📂 Open</button>
        <button style={tool === 'select' ? activeBtn : btn} onClick={() => setTool('select')} disabled={busy}>↖ Select</button>
        <button style={tool === 'pdf-text' ? activeBtn : btn} onClick={() => { setTool('pdf-text'); setStatus('Edit Text is active. Click any existing PDF text.'); }} disabled={busy}>✏️ Edit Text</button>
        <button style={tool === 'text' ? activeBtn : btn} onClick={() => setTool('text')} disabled={busy}>T Add Text</button>
        <button style={tool === 'highlight' ? activeBtn : btn} onClick={() => setTool('highlight')} disabled={busy}>🖍 Highlight</button>
        <button style={btn} onClick={() => selectedPdfText && replaceText(selectedPdfText)} disabled={!selectedPdfText || busy}>Replace Text</button>
        <button style={btn} onClick={editSelected} disabled={!selectedId || busy}>Edit Selected</button>
        <button style={btn} onClick={removeSelected} disabled={!selectedId || busy}>🗑 Delete</button>
        <button style={btn} onClick={undo} disabled={!history.length || busy}>↶ Undo</button>
        <button style={btn} onClick={() => setScale((s) => Math.max(.5, +(s - .1).toFixed(2)))} disabled={busy}>−</button>
        <span style={{ minWidth: 42, textAlign: 'center', fontSize: 12 }}>{Math.round(scale * 100)}%</span>
        <button style={btn} onClick={() => setScale((s) => Math.min(3, +(s + .1).toFixed(2)))} disabled={busy}>+</button>
        <button style={btn} onClick={() => setScale(1)} disabled={busy}>100%</button>
        <button style={btn} onClick={() => setRotation((r) => (r + 90) % 360)} disabled={busy}>↻ View Rotate</button>
        <button style={btn} onClick={ocr} disabled={busy}>🔎 OCR</button>
        <button style={primaryBtn} onClick={savePdf} disabled={busy || !sourceBytes}>{busy ? 'Saving…' : '💾 Save PDF'}</button>
        <button style={{ ...btn, background: dirty ? '#fff7ed' : '#fff' }} onClick={downloadPdf} disabled={busy || !sourceBytes}>⬇ Download</button>
        <button style={btn} onClick={() => setShowTools((v) => !v)} disabled={busy}>🧰 Tools</button>
      </nav>

      {showTools && (
        <div style={{ background: '#fff', borderBottom: '1px solid #d0d5dd', padding: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button style={btn} onClick={merge} disabled={busy}>Merge PDFs</button>
          <button style={btn} onClick={split} disabled={busy}>Split / Extract</button>
          <button style={btn} onClick={deleteCurrent} disabled={busy}>Delete Page</button>
          <button style={btn} onClick={() => movePage(-1)} disabled={busy}>Move Page ←</button>
          <button style={btn} onClick={() => movePage(1)} disabled={busy}>Move Page →</button>
          <button style={btn} onClick={rotateCurrent} disabled={busy}>Rotate Page</button>
          <button style={btn} onClick={addImage} disabled={busy}>Add Image</button>
          <button style={btn} onClick={() => setShowSignature(true)} disabled={busy}>✍ Sign</button>
          <button style={btn} onClick={watermark} disabled={busy}>Watermark</button>
          <button style={btn} onClick={numberPages} disabled={busy}>Page Numbers</button>
          <button style={btn} onClick={metadata} disabled={busy}>Metadata</button>
          <button style={btn} onClick={forms} disabled={busy}>Fill Forms</button>
          <button style={btn} onClick={flatten} disabled={busy}>Flatten Forms</button>
          <button style={btn} onClick={optimize} disabled={busy}>Optimize PDF</button>
        </div>
      )}

      <div style={{ background: '#fff', borderBottom: '1px solid #d0d5dd', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <button style={btn} disabled={pageNumber <= 1 || busy} onClick={() => setPageNumber((p) => p - 1)}>‹</button>
        <span style={{ fontSize: 13 }}>Page</span>
        <input type="number" min={1} max={pageCount || 1} value={pageNumber} onChange={(e) => setPageNumber(Math.max(1, Math.min(pageCount || 1, Number(e.target.value) || 1)))} style={{ width: 58, padding: 6, border: '1px solid #cbd5e1', borderRadius: 6 }} />
        <span style={{ fontSize: 13 }}>of {pageCount}</span>
        <button style={btn} disabled={pageNumber >= pageCount || busy} onClick={() => setPageNumber((p) => p + 1)}>›</button>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search PDF…" style={{ marginLeft: 'auto', width: 210, padding: 7, border: '1px solid #cbd5e1', borderRadius: 6 }} />
        <button style={btn} onClick={find} disabled={busy}>Find</button>
      </div>

      {ocrText && <div style={{ background: '#fff', borderBottom: '1px solid #d0d5dd', padding: 8, maxHeight: 90, overflow: 'auto', fontSize: 12 }}><strong>OCR / extracted text:</strong> {ocrText}</div>}

      <main style={{ minHeight: 0, flex: 1, display: 'flex' }}>
        <aside style={{ width: 155, background: '#fff', borderRight: '1px solid #d0d5dd', overflow: 'auto', padding: 9 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#667085', marginBottom: 9 }}>PAGES</div>
          {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
            <button key={n} onClick={() => setPageNumber(n)} style={{ width: '100%', background: n === pageNumber ? '#eff6ff' : '#fff', border: n === pageNumber ? '2px solid #2563eb' : '1px solid #d0d5dd', borderRadius: 7, padding: 5, marginBottom: 9, cursor: 'pointer' }}>
              <canvas ref={(el) => { thumbRefs.current[n] = el; }} style={{ width: '100%', height: 'auto', display: 'block' }} />
              <div style={{ fontSize: 11, padding: 4 }}>Page {n}</div>
            </button>
          ))}
        </aside>

        <section style={{ flex: 1, minWidth: 0, overflow: 'auto', background: '#dfe6ef', padding: 28, display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
          <div style={{ position: 'relative', width, height, background: '#fff', boxShadow: '0 10px 35px rgba(16,24,40,.2)' }}>
            <canvas ref={canvasRef} style={{ display: 'block' }} />
            {page && viewport && (
              <TextLayer
                page={page}
                viewport={viewport}
                enabled={tool === 'pdf-text'}
                onSelect={handlePdfTextSelect}
              />
            )}
            <AnnotationOverlay
              width={width}
              height={height}
              annotations={currentAnnotations}
              selectedId={selectedId}
              tool={tool}
              onSelect={setSelectedId}
              onMove={moveAnnotation}
              onAddText={addText}
              onAddHighlight={addHighlight}
            />
          </div>
        </section>
      </main>

      <footer style={{ background: '#fff', borderTop: '1px solid #d0d5dd', padding: '6px 12px', display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#667085' }}>
        <span>{notes.length} unsaved edit(s) • {dirty ? 'Save required' : 'All changes saved'}</span>
        <span>No uploads • No account • No paid API</span>
      </footer>

      {showSignature && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(16,24,40,.55)', display: 'grid', placeItems: 'center', zIndex: 20 }}>
          <div style={{ background: '#fff', padding: 18, borderRadius: 12, width: 470, boxShadow: '0 20px 60px rgba(0,0,0,.3)' }}>
            <h3 style={{ marginTop: 0 }}>Draw signature</h3>
            <canvas ref={signatureCanvas} width={430} height={170} style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: 8, background: '#fff', touchAction: 'none' }} onPointerDown={signaturePointer} onPointerMove={signaturePointer} />
            <div style={{ display: 'flex', gap: 8, marginTop: 10, justifyContent: 'flex-end' }}>
              <button style={btn} onClick={clearSignature}>Clear</button>
              <button style={btn} onClick={() => setShowSignature(false)}>Cancel</button>
              <button style={primaryBtn} onClick={applySignature}>Apply Signature</button>
            </div>
          </div>
        </div>
      )}
  </div>
  );
}
