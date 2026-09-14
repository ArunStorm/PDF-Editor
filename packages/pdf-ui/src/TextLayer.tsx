import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

type TextItem = { str: string; transform: number[]; width: number; height?: number; fontName?: string; style?: { fontFamily?: string } };
export type TextSelection = { text: string; x: number; y: number; width: number; height: number; fontSize: number; fontName?: string; fontFamily?: string; fontWeight?: string; fontStyle?: string };

function typography(fontName = '', pdfFamily = '') {
  const name = fontName.toLowerCase();
  const family = pdfFamily || (/times|serif/.test(name) ? 'Times New Roman, serif' : /courier|mono/.test(name) ? 'Courier New, monospace' : 'Arial, Helvetica, sans-serif');
  return { family, fontWeight: /bold|black|heavy/.test(name) ? '700' : '400', fontStyle: /italic|oblique/.test(name) ? 'italic' : 'normal' };
}

export default function TextLayer({ page, viewport, enabled, onEdit }: { page: pdfjsLib.PDFPageProxy; viewport: pdfjsLib.PageViewport; enabled: boolean; onEdit: (selection: TextSelection, replacement: string) => void }) {
  const [items, setItems] = useState<TextItem[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const inputRef = useRef<HTMLDivElement>(null);
  const committedEditRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    setEditingIndex(null);
    setItems([]);

    // streamTextContent is the PDF.js display-layer primitive and is more reliable
    // for incremental/large documents than waiting for one complete text payload.
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
            // Fetch styles separately so the inline editor can approximate the PDF typography.
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
    committedEditRef.current = false;
    inputRef.current.focus();
    const range = document.createRange();
    range.selectNodeContents(inputRef.current);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }, [editingIndex]);

  if (!enabled) return <div aria-label="PDF text layer" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />;

  return (
    <div aria-label="PDF text layer" data-text-item-count={items.length} style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'auto' }}>
      {items.map((item, index) => {
        const transform = pdfjsLib.Util.transform(viewport.transform, item.transform);
        const fontSize = Math.max(5, Math.hypot(transform[2], transform[3]));
        const left = transform[4];
        const top = transform[5] - fontSize;
        const width = Math.max(2, item.width * viewport.scale);
        const height = Math.max(fontSize * 1.15, item.height ?? fontSize);
        const type = typography(item.fontName, item.style?.fontFamily);
        const selection: TextSelection = { text: item.str, x: left, y: top, width, height, fontSize, fontName: item.fontName, fontFamily: type.family, fontWeight: type.fontWeight, fontStyle: type.fontStyle };
        const editing = editingIndex === index;

        if (editing) {
          const commitEdit = (value: string) => {
            if (committedEditRef.current) return;
            const replacement = value.trim();
            if (replacement && replacement !== item.str) {
              committedEditRef.current = true;
              onEdit(selection, replacement);
            }
            setEditingIndex(null);
          };
          return (
            <div key={`${index}-${item.str}`} ref={inputRef} contentEditable suppressContentEditableWarning role="textbox" aria-label={`Edit PDF text: ${item.str}`}
              onBlur={(event) => commitEdit(event.currentTarget.textContent ?? '')}
              onKeyDown={(event) => {
                if (event.key === 'Enter') { event.preventDefault(); commitEdit(event.currentTarget.textContent ?? ''); }
                else if (event.key === 'Escape') { event.preventDefault(); committedEditRef.current = true; setEditingIndex(null); }
              }}
              style={{ position: 'absolute', left, top, width: Math.max(width, 40), minHeight: height, padding: 0, margin: 0, border: '2px solid #2563eb', outline: 'none', background: '#fff', color: '#111827', fontFamily: type.family, fontSize, fontWeight: type.fontWeight, fontStyle: type.fontStyle, lineHeight: `${height}px`, whiteSpace: 'pre', overflow: 'hidden', boxSizing: 'border-box', cursor: 'text' }}
            >{item.str}</div>
          );
        }

        return (
          <span key={`${index}-${item.str}`} data-pdf-text-item="true" title="Click to edit this PDF text"
            onClick={(event) => { event.stopPropagation(); committedEditRef.current = false; setEditingIndex(index); }}
            style={{ position: 'absolute', left, top, width, height, color: 'transparent', background: 'rgba(37,99,235,.035)', border: '1px solid rgba(37,99,235,.10)', cursor: 'text', userSelect: 'none', whiteSpace: 'pre', overflow: 'hidden', boxSizing: 'border-box' }}
          >{item.str}</span>
        );
      })}
    </div>
  );
}
