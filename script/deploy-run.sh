#!/usr/bin/env bash
set -euo pipefail
cd /workspace/projects/dm
export PORT=5000
fuser -k 5000/tcp 2>/dev/null || true
sleep 1
pnpm build
exec node server.js
