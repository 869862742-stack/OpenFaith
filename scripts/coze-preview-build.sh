#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"
rm -rf .webpack-cache 2>/dev/null || true
pnpm install 2>/dev/null || true
npx webpack --mode development
