#!/usr/bin/env bash
set -euo pipefail
cd /workspace/projects/dm
pnpm install
pnpm build:admin
pnpm build
