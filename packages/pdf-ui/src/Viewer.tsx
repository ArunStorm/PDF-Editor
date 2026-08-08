import React, { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Rect, Text as KonvaText } from 'react-konva';
import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy } from 'pdfjs-dist';
import { pdfCore, type Annotation } from '@pdf-editor/pdf-core';

GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url).toString();

type Props = { openFile?: () => Promise<ArrayBuffer | undefined>; saveFile?: (bytes: Uint8Array) => Promise<void>) => void };
