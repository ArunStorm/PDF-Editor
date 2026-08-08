import React, { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Rect, Text } from 'react-konva';
import * as pdfjsLib from 'pdfjs-dist';
import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy } from 'pdfjs-dist';
import { pdfCore } from '@pdf-editor/pdf-core';

GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url).toString();

type Props = { openFile?: () => Promise<ArrayBuffer | undefined>; saveFile?: (bytes: Uint8Array) => Promise<void> };
type Note = { id: string; page: number; x: number; y: number; width: number; height: number; text: string };

export function AnnotationOverlay({ width, height, annotations, onChange }: { width: number; height: number; annotations: Note[]; onChange: (items: Note[]) => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  return <Stage width={width} height={height} style={{ position: 'absolute', inset: 0 }}>
    <Layer>
      {annotations.map((a) => <React.Fragment key={a.id}>
        <Rect x={a.x} y={a.y} width={a.width} height={a.height} stroke={selected === a.id ? '#2563eb' : '#dc2626'} strokeWidth={2} draggable
          onClick={() => setSelected(a.id)} onDragEnd={(e) => onChange(annotations.map(x => x.id === a.id ? { ...x, x: e.target.x(), y: e.target.y() } : x))} />
        <Text x={a.x + 4} y={a.y + 4} text={a.text} fontSize={14} />
      </React.Fragment>)}
    </Layer>
  </Stage>;
}

export default function Viewer({ openFile, saveFile }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [scale] = useState(1.2);
  const [notes, setNotes] = useState<Note[]>([]);
  const [status, setStatus] = useState('Loading sample.pdf…');

  async function loadBytes(bytes: ArrayBuffer) {
    const task = getDocument({ data: bytes, isEvalSupported: false, disableAutoFetch: false });
    const pdf = await task.promise;
    setDoc(pdf); setPageCount(pdf.numPages); setStatus(`Loaded ${pdf.numPages} page(s)`);
  }

  async function renderFirstPage(pdf = doc) {
    if (!pdf || !canvasRef.current) return;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale });
    const canvas = canvasRef.current; canvas.width = viewport.width; canvas.height = viewport.height;
    await page.render({ canvasContext: canvas.getContext('2d')!, viewport }).promise;
  }

  useEffect(() => { fetch('/assets/sample.pdf').then(r => r.arrayBuffer()).then(loadBytes).catch(e => setStatus(`Sample load failed: ${e}`)); }, []);
  useEffect(() => { renderFirstPage(); }, [doc]);

  async function open() {
    const bytes = await openFile?.(); if (bytes) await loadBytes(bytes);
  }
  async function save() {
    if (!doc) return; const bytes = new Uint8Array(await (await fetch('/assets/sample.pdf')).arrayBuffer());
    const handle = await pdfCore.open(bytes); const output = await pdfCore.save(handle, { annotations: notes });
    await saveFile?.(output); setStatus('Saved PDF');
  }
  async function ocr() {
    setStatus('OCR worker demo ready — pass canvas.toDataURL() to the worker.');
    // TODO: Instantiate /assets/ocr-worker.js and post { type: 'ocr', pageImage: canvas.toDataURL() }.
  }
  function addAnnotation() {
    const note = { id: crypto.randomUUID(), page: 1, x: 40, y: 40, width: 180, height: 60, text: 'Annotation' };
    setNotes([...notes, note]);
  }
  function deleteSelected() { setNotes(notes.slice(0, -1)); }

  return <div style={{ fontFamily: 'system-ui', padding: 16 }}>
    <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
      <button onClick={open}>Open</button><button onClick={save}>Save</button><button onClick={ocr}>OCR Page</button><button onClick={addAnnotation}>Add Annotation</button><button onClick={deleteSelected}>Delete Last Annotation</button>
    </div>
    <div>{status} · {pageCount} pages</div>
    <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
      <aside style={{ width: 100 }}>{Array.from({ length: pageCount }, (_, i) => <div key={i} style={{ border: '1px solid #ccc', padding: 6, marginBottom: 6 }}>Page {i + 1}</div>)}</aside>
      <div style={{ position: 'relative', display: 'inline-block' }}><canvas ref={canvasRef} /><AnnotationOverlay width={canvasRef.current?.width ?? 600} height={canvasRef.current?.height ?? 800} annotations={notes} onChange={setNotes} /></div>
    </div>
    <small>Annotation serialization: {JSON.stringify(notes)}</small>
  </div>;
}
