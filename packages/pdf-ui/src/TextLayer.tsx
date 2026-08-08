import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

type TextItem = {
  str: string;
  transform: number[];
  width: number;
  height?: number;
  fontName?: string;
};

export type TextSelection = {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontName?: string;
  fontFamily?: string;
  fontWeight?: string;
  fontStyle?: string;
};

function typography(fontName = '') {
  const name = fontName.toLowerCase();
  const family = /times|serif/.test(name) ? 'Times New Roman, serif' : /courier|mono/.test(name) ? 'Courier New, monospace' : 'Arial, Helvetica, sans-serif';
  const fontWeight = /bold|black|heavy/.test(name) ? '700' : '400';
  const fontStyle = /italic|oblique/.test(name) ? 'italic' : 'normal';
  return { family, fontWeight, fontStyle };
}

export default function TextLayer({ page, viewport, enabled, onEdit }: {
  page: pdfjsLib.PDFPageProxy;
  viewport: pdfjsLib.PageViewport;
  enabled: boolean;
  onEdit: (selection: TextSelection, replacement: string) => void;
}) {
  const [items, setItems] = useState<TextItem[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setEditingIndex(null);
    page.getTextContent().then((content) => {
      const textItems = content.items.filter((item: any) => typeof item.str === 'string' && item.str.trim().length > 0) as TextItem[];
      if (!cancelled) setItems(textItems);
    });
    return () => { cancelled = true; };
  }, [page]);

  useEffect(() => {
    if (editingIndex === null || !inputRef.current) return;
    inputRef.current.focus();
    const range = document.createRange();
    range.selectNodeContents(inputRef.current);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }, [editingIndex]);

  if (!enabled) {
    return <div aria-label="PDF text layer" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />;
  }

  return (
    <div aria-label="PDF text layer" style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'auto' }}>
      {items.map((item, index) => {
        const transform = pdfjsLib.Util.transform(viewport.transform, item.transform);
        const fontSize = Math.max(5, Math.hypot(transform[2], transform[3]));
        const left = transform[4];
        const top = transform[5] - fontSize;
        const width = Math.max(2, item.width * viewport.scale);
        const height = Math.max(fontSize * 1.15, item.height ?? fontSize);
        const type = typography(item.fontName);
        const selection: TextSelection = {
          text: item.str,
          x: left,
          y: top,
          width,
          height,
          fontSize,
          fontName: item.fontName,
          fontFamily: type.family,
          fontWeight: type.fontWeight,
          fontStyle: type.fontStyle,
        };
        const editing = editingIndex === index;

        return editing ? (
          <div
            key={`${index}-${item.str}`}
            ref={inputRef}
            contentEditable
            suppressContentEditableWarning
            role="textbox"
            onInput={(event) => setDraft(event.currentTarget.textContent ?? '')}
            onBlur={() => {
              const value = draft.trim();
              if (value && value !== item.str) onEdit(selection, value);
              setEditingIndex(null);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                const value = (event.currentTarget.textContent ?? '').trim();
                if (value && value !== item.str) onEdit(selection, value);
                setEditingIndex(null);
              }
              if (event.key === 'Escape') {
                event.preventDefault();
                setEditingIndex(null);
              }
            }}
            style={{
              position: 'absolute',
              left,
              top,
              width: Math.max(width, 40),
              minHeight: height,
              padding: 0,
              margin: 0,
              border: '1px solid #2563eb',
              outline: 'none',
              background: '#fff',
              color: '#111827',
              fontFamily: type.family,
              fontSize,
              fontWeight: type.fontWeight,
              fontStyle: type.fontStyle,
              lineHeight: `${height}px`,
              whiteSpace: 'pre',
              overflow: 'hidden',
              boxSizing: 'border-box',
              cursor: 'text',
            }}
          >
            {item.str}
          </div>
        ) : (
          <span
            key={`${index}-${item.str}`}
            title="Click to edit this PDF text"
            onClick={(event) => {
              event.stopPropagation();
              setDraft(item.str);
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
          >
            {item.str}
          </span>
        );
      })}
    </div>
  );
}
