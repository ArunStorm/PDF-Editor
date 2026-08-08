# PDF Editor — local-first, zero-cost OSS

A cross-platform PDF workspace inspired by the usability of Adobe Acrobat and the broad tool coverage of PDFLeader, but designed around a different promise: **no account, no paid API, and no document upload is required for core editing**.

Reference products:
- PDFLeader — broad PDF conversion, organization and editing workflow.
- Adobe Acrobat — mature editing, annotation, forms, signing and page-management UX.

This project uses those products as feature/UX references; it does not copy proprietary code, assets, branding, or services.

## Product principles

1. **No fake buttons.** A toolbar action is either implemented, clearly labelled as a limitation, or hidden.
2. **Local first.** PDF bytes stay in the browser/Electron process for the core workflow.
3. **One workspace.** Editing, annotation, pages, forms, OCR and export should not require jumping between unrelated websites.
4. **Desktop + web parity.** Shared React UI and `pdf-core` behavior are used by both clients.
5. **Graceful degradation.** A feature that cannot safely modify a particular PDF must report the reason instead of silently corrupting it.

## Current functional feature set

### Viewer

- PDF.js rendering with PDF JavaScript disabled.
- Page thumbnails.
- Page number navigation.
- Zoom controls.
- View rotation.
- Text extraction/search.
- Selectable PDF text layer for edit/replacement workflows.

### Editing and annotation

- Add text.
- Select/move/delete staged annotations.
- Highlight by drag selection.
- Replace selected existing PDF text using a deterministic cover-and-redraw strategy.
- Undo annotation changes.
- Add PNG/JPEG images.
- Draw a signature locally and place it on a page.
- Export annotations and replacements through pdf-lib.

### Page organization

- Merge multiple PDFs.
- Split/extract page ranges.
- Delete pages.
- Move pages left/right.
- Rotate individual pages.
- Page numbering.

### Document utilities

- Watermark every page.
- Edit title/author metadata.
- Fill common AcroForm text, checkbox, dropdown and radio fields.
- Flatten AcroForms.
- Local object-stream optimization.
- OCR through a Tesseract.js WebWorker, with embedded-text extraction fallback.

### File workflow

- Electron native Open/Save dialogs.
- Browser file input fallback.
- Download modified PDFs directly from the web app.
- No server is required for the core workflow.

## Important technical limitations

This is intentionally a serious engineering project rather than a claim that `pdf-lib` magically provides every Acrobat capability.

### Existing PDF text editing

PDF.js renders the document and exposes text geometry; it does not turn arbitrary PDF content streams into mutable HTML. The current editor therefore uses:

```text
PDF.js text layer
      ↓
user selects source text
      ↓
replacement annotation
      ↓
cover source region + draw replacement with pdf-lib
      ↓
new PDF
```

This is reliable for many ordinary text PDFs, but it does **not** guarantee preservation of the source font, kerning, ligatures, background color, or complex content-stream semantics. A future native content-stream editing engine will be conservative and refuse unsafe edits rather than corrupting the document.

### Password/encrypted PDFs

The current `pdf-lib` version does not provide full encrypted-PDF modification support. The app must not pretend that a password-protected PDF is editable when the underlying library cannot safely process it. Password/encryption support belongs in a dedicated local PDF engine before shipping that feature.

### Compression

`Optimize PDF` uses object streams and serialization optimization. It is **not** equivalent to lossy image compression. A true compressor requires image downsampling/re-encoding and content-stream analysis and will be added as a separate local worker rather than misleading users.

## Requirements

- Node.js 22+
- pnpm 10+
- Git
- No API keys or paid services

## Install

If Corepack is unavailable on Windows, install pnpm directly:

```powershell
npm install -g pnpm
```

Then:

```powershell
pnpm install
```

If pnpm reports ignored native build scripts, review them with:

```powershell
pnpm approve-builds
```

## Run locally

Web:

```powershell
pnpm dev:web
```

Open `http://127.0.0.1:5173`.

Desktop:

```powershell
pnpm dev:desktop
```

The Electron shell uses `contextIsolation=true`, `nodeIntegration=false`, sandboxed renderer defaults and a minimal typed preload bridge.

## Verification workflow

Run these after pulling the latest branch:

```powershell
pnpm install
pnpm test
pnpm --filter @pdf-editor/pdf-core typecheck
pnpm build:web
pnpm build:desktop
```

Then manually verify:

1. Open `sample.pdf`.
2. Select an existing text span with **Edit Text**.
3. Replace it.
4. Add text and move it.
5. Drag a highlight.
6. Add and move a signature.
7. Delete/reorder/rotate a page.
8. Merge two PDFs.
9. Extract a page range.
10. Fill a form PDF if it contains AcroForm fields.
11. Download and reopen the resulting PDF in an independent PDF reader.

## Architecture

```text
apps/desktop-electron
        │
        ├── Electron main + secure preload
        └── React renderer
                 │
apps/web ─────────┤
                 ▼
          packages/pdf-ui
                 │
                 ├── PDF.js viewer/text layer
                 ├── Konva annotation layer
                 └── Tesseract worker bridge
                 │
                 ▼
          packages/pdf-core
                 │
                 └── pdf-lib local document operations
```

Optional `backend/` and Docker files are retained for future heavy local services. They are not required for normal editing.

## Free deployment

### GitHub Pages

Build the SPA and publish `apps/web/dist` from a GitHub Actions workflow. GitHub Pages is suitable for the static client because the core workflow executes locally in the browser.

### Vercel

Use the free tier with:

```text
Build: pnpm install --no-frozen-lockfile && pnpm --filter @pdf-editor/web build
Output: apps/web/dist
```

No paid API or server-side PDF service is required.

## Security

- PDF.js JavaScript execution is disabled.
- Electron renderer has no Node integration.
- IPC is allowlisted through preload.
- Core browser processing does not upload PDF bytes.
- Cryptographic operations remain local.
- No remote signing provider is required.
- Encrypted/hostile PDFs are treated as a dedicated hardening problem rather than silently processed with unsafe options.

## Roadmap to a genuinely advanced editor

### Phase 1 — foundation

- [x] Viewer, thumbnails, navigation, zoom and rotation
- [x] Local open/save
- [x] Text layer
- [x] Annotation/export pipeline
- [x] Page organization
- [x] Forms
- [x] OCR worker

### Phase 2 — professional editing

- [ ] Conservative native content-stream text replacement
- [ ] Font detection and font embedding
- [ ] Rich text formatting
- [ ] Freehand pen/line/arrow/shape tools
- [ ] Sticky notes/comments
- [ ] Redaction with irreversible flattening
- [ ] Image crop/resize/replace
- [ ] Link creation/editing
- [ ] Headers/footers
- [ ] Better form designer

### Phase 3 — document engineering

- [ ] True image compression/downsampling
- [ ] PDF/A validation/export
- [ ] Bookmarks/outline editor
- [ ] Attachments
- [ ] Metadata/XMP editor
- [ ] Accessibility tags and reading order
- [ ] Password/encryption using a dedicated local PDF engine
- [ ] Local digital-signature implementation with certificate validation

### Phase 4 — quality and scale

- [ ] Continuous multi-page virtualization
- [ ] Large-PDF memory management
- [ ] Visual regression suite
- [ ] Cross-browser E2E matrix
- [ ] Electron Windows/macOS/Linux packaging
- [ ] Offline PWA caching
- [ ] Crash-safe autosave/session recovery

## License

MIT. See `LICENSE`.
