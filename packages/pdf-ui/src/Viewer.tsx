import React, { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Rect, Text as KonvaText } from 'react-konva';
import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy } from 'pdfjs-dist';
import { pdfCore, type Annotation } from '@pdf-editor/pdf-core';

GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url).toString();

type Props = {
  openFile?: () => Promise<ArrayBuffer | undefined>;
  saveFile?: (bytes: Uint8Array) => Promise<void>;
};

type Tool = 'select' | 'text' | 'rectangle';
type Note = Annotation & { selected?: boolean };

const buttonStyle: React.CSSProperties = {
  border: '1px solid #cbd5e1',
  background: '#fff',
  color: '#0f172a',
  borderRadius: 6,
  padding: '7px 10px',
  cursor: 'pointer',
  fontSize: 13,
};

function AnnotationOverlay({
  width,
  height,
  annotations,
  selectedId,
  onSelect,
  onMove,
}: {
  width: number;
  height: number;
  annotations: Note[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onMove: (id: string, x: number, y: number) => void;
}) {
  return (
    <Stage width={width} height={height} style={{ position: 'absolute', inset: 0 }}>
      <Layer>
        {annotations.map((a) => {
          const selected = selectedId === a.id;
          if (a.type === 'text') {
            return (
              <KonvaText
                key={a.id}
                x={a.x}
                y={a.y}
                width={a.width ?? 180}
                height={a.height ?? 50}
                text={a.text ?? 'Text'}
                fontSize={16}
                padding={6}
                fill="#111827"
                stroke={selected ? '#2563eb' : undefined}
                strokeWidth={selected ? 1 : 0}
                draggable
                onClick={() => onSelect(a.id)}
                onTap={() => onSelect(a.id)}
                onDragEnd={(e) => onMove(a.id, e.target.x(), e.target.y())}
              />
            );
          }
          return (
            <Rect
              key={a.id}
              x={a.x}
              y={a.y}
              width={a.width ?? 180}
              height={a.height ?? 60}
              fill="rgba(37,99,235,0.08)"
              stroke={selected ? '#2563eb' : '#64748b'}
              strokeWidth={selected ? 2.5 : 1.5}
              draggable
              onClick={() => onSelect(a.id)}
              onTap={() => onSelect(a.id)}
              onDragEnd={(e) => onMove(a.id, e.target.x(), e.target.y())}
            />
          );
        })}
      </Layer>
    </Stage>
  );
}

export default function Viewer({ openFile, saveFile }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const thumbRefs = useRef<Record<number, HTMLCanvasElement | null>>({});
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [sourceBytes, setSourceBytes] = useState<Uint8Array | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.15);
  const [rotation, setRotation] = useState(0);
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tool, setTool] = useState<Tool>('select');
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState('Loading sample.pdf…');
  const [search, setSearch] = useState('');

  async function loadBytes(input: ArrayBuffer | Uint8Array) {
    const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
    const task = getDocument({ data: bytes, isEvalSupported: false, disableAutoFetch: false });
    const pdf = await task.promise;
    setSourceBytes(bytes);
    setDoc(pdf);
    setPageCount(pdf.numPages);
    setPageNumber(1);
    setStatus(`${pdf.numPages} page${pdf.numPages === 1 ? '' : 's'} loaded`);
  }

  async function renderPage(target = pageNumber, targetScale = scale) {
    if (!doc || !canvasRef.current) return;
    const page = await doc.getPage(target);
    const viewport = page.getViewport({ scale: targetScale, rotation });
    const canvas = canvasRef.current;
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const context = canvas.getContext('2d');
    if (!context) return;
    await page.render({ canvasContext: context, viewport }).promise;
  }

  async function renderThumbnails() {
    if (!doc) return;
    for (let i = 1; i <= doc.numPages; i += 1) {
      const canvas = thumbRefs.current[i];
      if (!canvas) continue;
      const page = await doc.getPage(i);
      const viewport = page.getViewport({ scale: 0.18 });
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const context = canvas.getContext('2d');
      if (context) await page.render({ canvasContext: context, viewport }).promise;
    }
  }

  useEffect(() => {
    fetch('/assets/sample.pdf')
      .then((r) => r.arrayBuffer())
      .then(loadBytes)
      .catch((e) => setStatus(`Sample load failed: ${String(e)}`));
  }, []);

  useEffect(() => {
    renderPage().catch((e) => setStatus(`Render failed: ${String(e)}`));
  }, [doc, pageNumber, scale, rotation]);

  useEffect(() => {
    renderThumbnails().catch(() => undefined);
  }, [doc]);

  async function handleOpen() {
    const bytes = await openFile?.();
    if (bytes) await loadBytes(bytes);
  }

  async function handleDownload() {
    if (!sourceBytes) return;
    const handle = await pdfCore.open(sourceBytes);
    const output = await pdfCore.save(handle, { annotations: notes });
    await saveFile?.(output);
    setStatus('PDF exported successfully');
  }

  async function handleOcr() {
    setStatus(`OCR queued for page ${pageNumber}.`);
    // TODO: Send canvas.toDataURL() to the real Tesseract.js worker and show returned text.
  }

  function addAnnotation(kind: 'text' | 'rect') {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const note: Note = {
      id: crypto.randomUUID(),
      type: kind,
      page: pageNumber,
      x: Math.max(20, canvas.width / 2 - 90),
      y: Math.max(20, canvas.height / 3),
      width: kind === 'text' ? 220 : 180,
      height: kind === 'text' ? 46 : 70,
      text: kind === 'text' ? 'Double-click: edit text' : undefined,
      viewportWidth: canvas.width,
      viewportHeight: canvas.height,
    };
    setNotes((current) => [...current, note]);
    setSelectedId(note.id);
    setEditing(true);
  }

  function deleteSelected() {
    if (!selectedId) return;
    setNotes((current) => current.filter((n) => n.id !== selectedId));
    setSelectedId(null);
  }

  function updateSelectedText() {
    if (!selectedId) return;
    const current = notes.find((n) => n.id === selectedId);
    if (!current || current.type !== 'text') return;
    const text = window.prompt('Edit annotation text', current.text ?? '');
    if (text !== null) setNotes((items) => items.map((n) => n.id === selectedId ? { ...n, text } : n));
  }

  function updateSelectedPosition(id: string, x: number, y: number) {
    setNotes((items) => items.map((n) => n.id === id ? { ...n, x, y } : n));
  }

  function undo() {
    setNotes((current) => current.slice(0, -1));
    setSelectedId(null);
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#f1f5f9', color: '#0f172a', fontFamily: 'Inter, Segoe UI, system-ui, sans-serif' }}>
      <header style={{ background: '#0f172a', color: '#fff', padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 750 }}>PDF Editor</div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>Local-first PDF workspace</div>
        </div>
        <div style={{ fontSize: 12, color: '#cbd5e1' }}>{status}</div>
      </header>

      <div style={{ background: '#fff', borderBottom: '1px solid #dbe3ec', padding: 8, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        <button style={buttonStyle} onClick={handleOpen}>📂 Open</button>
        <button style={{ ...buttonStyle, background: editing ? '#dbeafe' : '#fff', borderColor: editing ? '#60a5fa' : '#cbd5e1' }} onClick={() => setEditing((v) => !v)}>✏️ Edit</button>
        <button style={buttonStyle} onClick={() => addAnnotation('text')} disabled={!editing}>T Text</button>
        <button style={buttonStyle} onClick={() => addAnnotation('rect')} disabled={!editing}>▣ Highlight</button>
        <button style={buttonStyle} onClick={updateSelectedText} disabled={!selectedId}>Edit selected</button>
        <button style={buttonStyle} onClick={deleteSelected} disabled={!selectedId}>🗑 Delete</button>
        <button style={buttonStyle} onClick={undo} disabled={!notes.length}>↶ Undo</button>
        <span style={{ width: 1, height: 26, background: '#e2e8f0', margin: '0 4px' }} />
        <button style={buttonStyle} onClick={() => setScale((v) => Math.max(0.5, +(v - 0.1).toFixed(2)))}>−</button>
        <span style={{ minWidth: 48, textAlign: 'center', fontSize: 12 }}>{Math.round(scale * 100)}%</span>
        <button style={buttonStyle} onClick={() => setScale((v) => Math.min(3, +(v + 0.1).toFixed(2)))}>+</button>
        <button style={buttonStyle} onClick={() => setScale(1)}>100%</button>
        <button style={buttonStyle} onClick={() => setRotation((v) => (v + 90) % 360)}>↻ Rotate</button>
        <button style={buttonStyle} onClick={handleOcr}>🔎 OCR</button>
        <button style={{ ...buttonStyle, background: '#2563eb', color: '#fff', borderColor: '#2563eb' }} onClick={handleDownload}>⬇ Download PDF</button>
      </div>

      <div style={{ background: '#fff', borderBottom: '1px solid #dbe3ec', padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button style={buttonStyle} disabled={pageNumber <= 1} onClick={() => setPageNumber((p) => Math.max(1, p - 1))}>‹</button>
        <span style={{ fontSize: 13 }}>Page</span>
        <input value={pageNumber} min={1} max={pageCount || 1} type="number" onChange={(e) => setPageNumber(Math.min(pageCount || 1, Math.max(1, Number(e.target.value) || 1)))} style={{ width: 58, padding: 6, border: '1px solid #cbd5e1', borderRadius: 5 }} />
        <span style={{ fontSize: 13 }}>of {pageCount}</span>
        <button style={buttonStyle} disabled={pageNumber >= pageCount} onClick={() => setPageNumber((p) => Math.min(pageCount, p + 1))}>›</button>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: '#64748b' }}>Tool: {tool}</span>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search PDF…" style={{ width: 180, padding: 7, border: '1px solid #cbd5e1', borderRadius: 5 }} />
        <button style={buttonStyle} onClick={() => setStatus(search ? `Search requested: “${search}”` : 'Enter text to search')}>Find</button>
      </div>

      <main style={{ minHeight: 0, flex: 1, display: 'flex' }}>
        <aside style={{ width: 150, background: '#fff', borderRight: '1px solid #dbe3ec', overflow: 'auto', padding: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', margin: '4px 6px 10px' }}>PAGES</div>
          {Array.from({ length: pageCount }, (_, i) => i + 1).map((page) => (
            <button key={page} onClick={() => setPageNumber(page)} style={{ display: 'block', width: '100%', border: page === pageNumber ? '2px solid #2563eb' : '1px solid #dbe3ec', background: page === pageNumber ? '#eff6ff' : '#fff', borderRadius: 6, marginBottom: 10, padding: 6, cursor: 'pointer' }}>
              <canvas ref={(el) => { thumbRefs.current[page] = el; }} style={{ display: 'block', width: '100%', height: 'auto', background: '#fff' }} />
              <div style={{ fontSize: 11, paddingTop: 5, color: '#475569' }}>Page {page}</div>
            </button>
          ))}
        </aside>

        <section style={{ flex: 1, minWidth: 0, overflow: 'auto', background: '#e2e8f0', padding: 28, display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
          <div style={{ position: 'relative', display: 'inline-block', boxShadow: '0 8px 28px rgba(15,23,42,.18)', background: '#fff' }}>
            <canvas ref={canvasRef} style={{ display: 'block', maxWidth: 'none' }} />
            {canvasRef.current && (
              <AnnotationOverlay
                width={canvasRef.current.width}
                height={canvasRef.current.height}
                annotations={notes.filter((n) => n.page === pageNumber)}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onMove={updateSelectedPosition}
              />
            )}
          </div>
        </section>
      </main>

      <footer style={{ background: '#fff', borderTop: '1px solid #dbe3ec', padding: '7px 14px', display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b' }}>
        <span>{notes.length} annotation{notes.length === 1 ? '' : 's'} · PDF.js + pdf-lib + Konva</span>
        <span>Local processing · No paid service required</span>
      </footer>
    </div>
  );
}
