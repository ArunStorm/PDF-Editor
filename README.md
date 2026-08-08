# PDF Editor — zero-cost OSS starter

Cross-platform PDF editor monorepo: Electron + React desktop, React/Vite web SPA, shared `pdf-core`, PDF.js rendering, pdf-lib editing boundary, Tesseract.js OCR worker, and Konva annotations.

## Requirements

- Node.js 22+
- pnpm 10+
- Git
- No API keys, SaaS accounts, or paid services are required.

## Install

```bash
corepack enable
corepack prepare pnpm@10.15.0 --activate
pnpm install
```

## Run locally

Web:

```bash
pnpm dev:web
```

Open `http://127.0.0.1:5173`. The SPA loads `public/assets/sample.pdf`, renders page 1 with PDF.js, shows thumbnails, and supports browser file open/save.

Desktop:

```bash
pnpm dev:desktop
```

The Electron main process uses secure defaults: `contextIsolation=true`, `nodeIntegration=false`, sandbox enabled, and a minimal typed `contextBridge` API. Development loads the Vite server; packaged builds load the renderer HTML.

## Build and package

```bash
pnpm build:web
pnpm build:desktop
pnpm dist
```

`electron-builder --dir` creates an unpacked local distribution. Code signing is intentionally not configured.

## Tests

```bash
pnpm test
pnpm test:e2e
```

The E2E test expects the web dev server at `http://127.0.0.1:5173`; start it separately before running Playwright.

## Optional backend

The Express backend is deliberately non-essential. Run locally:

```bash
pnpm --filter @pdf-editor/backend dev
```

or:

```bash
docker compose up --build
```

Heavy OCR/rendering services can remain local in Docker. No external service is required.

## Free web deployment

### GitHub Pages

Build with `pnpm build:web`, then publish `apps/web/dist` using GitHub Pages. For a project page, configure Vite `base` to `/<repository-name>/` before the build if needed. GitHub Pages is free for public repositories.

### Vercel

Import the repository into Vercel, set the root/build configuration to the web app, and use:

- Build command: `pnpm install --no-frozen-lockfile && pnpm --filter @pdf-editor/web build`
- Output directory: `apps/web/dist`

Vercel has a free tier; this project does not require a paid feature.

## Architecture

- `apps/desktop-electron`: Electron main/preload + Vite React renderer.
- `apps/web`: browser SPA with file-input fallback.
- `packages/pdf-core`: stable typed API: `open`, `renderPage`, `annotate`, `save`, `ocrPage`.
- `packages/pdf-ui`: shared viewer and Konva annotation overlay used by both frontends.
- `packages/pdf-ocr-worker`: separate Tesseract.js WebWorker protocol.
- `backend`: optional local Express microservice.

## Security notes

PDF.js JavaScript execution is disabled with `isEvalSupported: false`. Electron does not expose Node integration to renderer code. IPC is allowlisted through the preload bridge. Keep untrusted PDF processing inside isolated workers/processes as the implementation grows.

Cryptographic/signing operations are expected to remain local. Do not add remote signing providers or upload documents without an explicit user-controlled feature.

## TODO roadmap

1. Replace the `pdf-core` path adapter with Electron-safe filesystem access.
2. Implement real annotation drawing with pdf-lib and flatten/export support.
3. Add page navigation, zoom, rotation, continuous scrolling, and real thumbnail canvases.
4. Bundle `pdf-ocr-worker` through Vite/worker entrypoints and stream progress events.
5. Add encrypted/password-protected PDF workflows and local cryptographic primitives.
6. Add robust PDF sanitization and renderer isolation for hostile documents.
7. Add visual regression tests and multi-page E2E coverage.

## License

MIT. See `LICENSE`.
