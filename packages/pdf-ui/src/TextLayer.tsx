import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

type TextStyle = { fontFamily?: string; ascent?: number; descent?: number; vertical?: boolean };
type TextItem = { str: string; transform: number[]; width: number; height?: number; fontName?: string; style?: TextStyle };
export type TextSelection = { text: string; x: number; y: number; width: number; height: number; fontSize: number; fontName?: string; fontFamily?: string; fontWeight?: string; fontStyle?: string };

const toolbarButton: React.CSSProperties = { border: '1px solid #d0d5dd', background: '#fff', color: '#101828', borderRadius: 4, minWidth: 26, height: 26, padding: '0 6px', cursor: 'pointer', fontSize: 12 };
const toolbarInput: React.CSSProperties = { border: '1px solid #d0d5dd', borderRadius: 4, height: 26, padding: '0 5px', fontSize: 12, background: '#fff', color: '#101828' };

function typography(fontName = '', pdfFamily = '') {
  const name = fontName.toLowerCase();
  const family = pdfFamily || (/times|serif/.test(name) ? 'Times New Roman, serif' : /courier|mono/.test(name) ? 'Courier New, monospace' : 'Arial, Helvetica, sans-serif');
  return {
    family,
    fontWeight: /bold|black|heavy/.test(name) ? '700' : '400',
    fontStyle: /italic|oblique/.test(name) ? 'italic' : 'normal',
  };
}

function supportedFamily(family: string) {
  if (/times|serif/i.test(family)) return 'Times New Roman, serif';
  if (/courier|mono/i.test(family)) return 'Courier New, monospace';
  return 'Arial, Helvetica, sans-serif';
}

export default function TextLayer({ page, viewport, enabled, onEdit }: { page: pdfjsLib.PDFPageProxy; viewport: pdfjsLib.PageViewport; enabled: boolean; onEdit: (selection: TextSelection, replacement: string) => void }) {
  const [items, setItems] = useState<TextItem[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editFontSize, setEditFontSize] = useState(0);
  const [editFontFamily, setEditFontFamily] = useState('Arial, Helvetica, sans-serif');
  const [editFontWeight, setEditFontWeight] = useState('400');
  const [editFontStyle, setEditFontStyle] = useState('normal');
  const inputRef = useRef<HTMLDivElement>(null);
  const committedEditRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    setEditingIndex(null);
    setItems([]);

    const loadText = async () => {
      for (let attempt = 0; attempt < 8 && !cancelled; attempt += 1) {
        try {
          const streamed: any[] = [];
          const reader = page.streamTextContent({ includeMarkedContent: false }).getReader();
          while (!cancelled) {
            const { value, done } = await reader.read();
            if (done) break;
            if (value?.items) streamed.push(...value.items);
          }
          const textItems = streamed
            .filter((item: any) => typeof item.str === 'string' && item.str.trim().length > 0)
            .map((item: any) => ({ ...item })) as TextItem[];

          if (!cancelled && textItems.length > 0) {
            const content = await page.getTextContent({ includeMarkedContent: false });
            const styles = content.styles ?? {};
            setItems(textItems.map((item) => ({ ...item, style: styles[item.fontName ?? ''] })));
            return;
          }
        } catch (error) {
          if (attempt === 7) console.error('[PDF Editor] text layer failed:', error);
        }
        await new Promise((resolve) => window.setTimeout(resolve, 150));
      }
      if (!cancelled) setItems([]);
    };

    void loadText();
    return () => { cancelled = true; };
  }, [page, enabled]);

  useEffect(() => {
    if (editingIndex === null || !inputRef.current) return;
    const item = items[editingIndex];
    if (!item) return;
    const transform = pdfjsLib.Util.transform(viewport.transform, item.transform);
    const initialFontSize = Math.max(5, Math.hypot(transform[2], transform[3]));
    const type = typography(item.fontName, item.style?.fontFamily);
    setEditFontSize(initialFontSize);
    setEditFontFamily(supportedFamily(type.family));
    setEditFontWeight(type.fontWeight);
    setEditFontStyle(type.fontStyle);
    committedEditRef.current = false;
    inputRef.current.focus();
    const range = document.createRange();
    range.selectNodeContents(inputRef.current);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }, [editingIndex, items, viewport.scale, viewport.rotation]);

  if (!enabled) return <div aria-label="PDF text layer" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />;

  return (
    <div aria-label="PDF text layer" data-text-item-count={items.length} style={{ position: 'absolute', inset: 0, overflow: 'visible', pointerEvents: 'auto' }}>
      {items.map((item, index) => {
        const transform = pdfjsLib.Util.transform(viewport.transform, item.transform);
        const fontSize = Math.max(5, Math.hypot(transform[2], transform[3]));
        const baseline = transform[5];
        const type = typography(item.fontName, item.style?.fontFamily);
        // PDF.js exposes ascent/descent for the actual PDF font. Using those metrics
        // instead of baseline - fontSize removes the vertical drift visible with
        // Arial/Helvetica substitutions and keeps the edit box on the original baseline.
        const ascent = Math.max(0.55, item.style?.ascent ?? 0.9);
        const descent = Math.min(-0.05, item.style?.descent ?? -0.2);
        const lineHeight = Math.max(fontSize * 1.05, fontSize * (ascent - descent));
        const left = transform[4];
        const top = baseline - fontSize * ascent;
        const width = Math.max(2, item.width * viewport.scale);
        const height = lineHeight;
        const editing = editingIndex === index;
        const activeFontSize = editing && editFontSize > 0 ? editFontSize : fontSize;
        const activeFamily = editing ? editFontFamily : type.family;
        const activeWeight = editing ? editFontWeight : type.fontWeight;
        const activeStyle = editing ? editFontStyle : type.fontStyle;
        const activeHeight = Math.max(activeFontSize * 1.05, activeFontSize * (ascent - descent));
        const activeTop = baseline - activeFontSize * ascent;
        const selection: TextSelection = {
          text: item.str,
          x: left,
          y: activeTop,
          width,
          height: activeHeight,
          fontSize: activeFontSize,
          fontName: item.fontName,
          fontFamily: activeFamily,
          fontWeight: activeWeight,
          fontStyle: activeStyle,
        };

        if (editing) {
          const commitEdit = (value: string) => {
            if (committedEditRef.current) return;
            const replacement = value.trim();
            if (replacement && (replacement !== item.str || activeFontSize !== fontSize || activeFamily !== type.family || activeWeight !== type.fontWeight || activeStyle !== type.fontStyle)) {
              committedEditRef.current = true;
              onEdit(selection, replacement);
            }
            setEditingIndex(null);
          };
          return (
            <React.Fragment key={`${index}-${item.str}`}>
              <div
                role="toolbar"
                aria-label="PDF text formatting"
                onMouseDown={(event) => event.preventDefault()}
                style={{ position: 'absolute', left, top: activeTop - 34, display: 'flex', alignItems: 'center', gap: 4, padding: 4, background: '#fff', border: '1px solid #d0d5dd', borderRadius: 6, boxShadow: '0 6px 18px rgba(16,24,40,.16)', zIndex: 20, whiteSpace: 'nowrap' }}
              >
                <select aria-label="Font" value={activeFamily} onChange={(event) => setEditFontFamily(event.target.value)} style={{ ...toolbarInput, width: 130 }}>
                  <option value="Arial, Helvetica, sans-serif">Arial / Helvetica</option>
                  <option value="Times New Roman, serif">Times New Roman</option>
                  <option value="Courier New, monospace">Courier New</option>
                </select>
                <input aria-label="Font size" type="number" min={4} max={96} step={1} value={Math.round(activeFontSize)} onChange={(event) => setEditFontSize(Math.max(4, Math.min(96, Number(event.target.value) || fontSize)))} style={{ ...toolbarInput, width: 48 }} />
                <button type="button" aria-label="Bold" aria-pressed={activeWeight === '700'} onClick={() => setEditFontWeight((value) => value === '700' ? '400' : '700')} style={{ ...toolbarButton, fontWeight: 700, background: activeWeight === '700' ? '#e8f0ff' : '#fff' }}>B</button>
                <button type="button" aria-label="Italic" aria-pressed={activeStyle === 'italic'} onClick={() => setEditFontStyle((value) => value === 'italic' ? 'normal' : 'italic')} style={{ ...toolbarButton, fontStyle: 'italic', background: activeStyle === 'italic' ? '#e8f0ff' : '#fff' }}>I</button>
                <span style={{ fontSize: 10, color: '#667085', padding: '0 3px' }}>Enter = apply</span>
              </div>
              <div
                ref={inputRef}
                contentEditable
                suppressContentEditableWarning
                role="textbox"
                aria-label={`Edit PDF text: ${item.str}`}
                onBlur={(event) => commitEdit(event.currentTarget.textContent ?? '')}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    commitEdit(event.currentTarget.textContent ?? '');
                  } else if (event.key === 'Escape') {
                    event.preventDefault();
                    committedEditRef.current = true;
                    setEditingIndex(null);
                  }
                }}
                style={{
                  position: 'absolute',
                  left,
                  top: activeTop,
                  width: Math.max(width, 40),
                  minHeight: activeHeight,
                  height: activeHeight,
                  padding: 0,
                  margin: 0,
                  border: '1px solid #2563eb',
                  borderRadius: 2,
                  outline: 'none',
                  background: 'rgba(255,255,255,.96)',
                  color: '#111827',
                  fontFamily: activeFamily,
                  fontSize: activeFontSize,
                  fontWeight: activeWeight,
                  fontStyle: activeStyle,
                  lineHeight: `${activeHeight}px`,
                  whiteSpace: 'pre',
                  overflow: 'visible',
                  boxSizing: 'border-box',
                  cursor: 'text',
                  zIndex: 5,
                }}
              >{item.str}</div>
            </React.Fragment>
          );
        }

        return (
          <span
            key={`${index}-${item.str}`}
            data-pdf-text-item="true"
            title="Click to edit this PDF text"
            onClick={(event) => {
              event.stopPropagation();
              committedEditRef.current = false;
              setEditingIndex(index);
            }}
            style={{
              position: 'absolute',
              left,
              top,
              width,
              height,
              color: 'transparent',
              background: 'rgba(37,99,235,.035)',
              border: '1px solid rgba(37,99,235,.10)',
              cursor: 'text',
              userSelect: 'none',
              whiteSpace: 'pre',
              overflow: 'hidden',
              boxSizing: 'border-box',
            }}
          >{item.str}</span>
        );
      })}
    </div>
  );
}
