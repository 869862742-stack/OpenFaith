#!/bin/bash
cd "$(dirname "$0")/.."
pnpm install --frozen-lockfile 2>/dev/null || pnpm install
rm -rf .webpack-cache 2>/dev/null || true
npx webpack --mode production
