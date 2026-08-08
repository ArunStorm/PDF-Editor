import React, { useEffect, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

type TextItem = { str: string; transform: number[]; width: number; height?: number };

export type TextSelection = { text: string; x: number; y: number; width: number; height: number; fontSize: number };

export default function TextLayer({ page, viewport, enabled, onSelect }: {
  page: pdfjsLib.PDFPageProxy;
  viewport: pdfjsLib.PageViewport;
  enabled: boolean;
  onSelect: (selection: TextSelection) => void;
}) {
  const [items, setItems] = useState<TextItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    page.getTextContent().then((content) => {
      const textItems = content.items.filter((item: any) => typeof item.str === 'string' && item.str.trim().length > 0) as TextItem[];
      if (!cancelled) setItems(textItems);
    });
    return () => { cancelled = true; };
  }, [page]);

  return <div aria-label="PDF text layer" style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: enabled ? 'auto' : 'none' }}>
    {items.map((item, index) => {
      const transform = pdfjsLib.Util.transform(viewport.transform, item.transform);
      const fontSize = Math.max(5, Math.hypot(transform[2], transform[3]));
      const left = transform[4];
      const top = transform[5] - fontSize;
      const width = Math.max(2, item.width * viewport.scale);
      const height = Math.max(fontSize * 1.15, item.height ?? fontSize);
      return <span key={`${index}-${item.str}`} title="Click to edit this PDF text"
        onClick={(event) => { event.stopPropagation(); onSelect({ text: item.str, x: left, y: top, width, height, fontSize }); }}
        onDoubleClick={(event) => { event.stopPropagation(); onSelect({ text: item.str, x: left, y: top, width, height, fontSize }); }}
        style={{ position: 'absolute', left, top, width, height, color: 'transparent', background: enabled ? 'rgba(37,99,235,.04)' : 'transparent', border: enabled ? '1px solid rgba(37,99,235,.12)' : 'none', cursor: enabled ? 'text' : 'default', userSelect: enabled ? 'text' : 'none', whiteSpace: 'pre', overflow: 'hidden' }}>
        {item.str}
      </span>;
    })}
  </div>;
}
