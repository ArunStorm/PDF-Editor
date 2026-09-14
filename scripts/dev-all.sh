#!/usr/bin/env bash
set -euo pipefail
pnpm install
pnpm --filter @pdf-editor/web dev
