#!/bin/bash
cd "$(dirname "$0")/.."
pnpm install 2>/dev/null || true
rm -rf .webpack-cache 2>/dev/null || true
npx webpack --mode development
