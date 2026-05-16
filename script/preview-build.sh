#!/usr/bin/env bash
set -euo pipefail
cd /workspace/projects/dm
if [ ! -d "node_modules" ] || [ ! -f "pnpm-lock.yaml" ]; then
  pnpm install --prefer-offline
fi
pnpm run build
pnpm run build:admin
