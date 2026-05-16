#!/usr/bin/env bash
set -euo pipefail
cd /workspace/projects/dm
export PORT=5000
pkill -f "node.*server.js" 2>/dev/null || true
sleep 0.5
if [ ! -d "dist" ] || [ ! -f "dist/index.html" ]; then
  pnpm build && pnpm build:admin
fi
exec node server.js
