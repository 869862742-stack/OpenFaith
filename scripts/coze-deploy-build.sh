#!/bin/bash
rm -rf .webpack-cache 2>/dev/null || true
pnpm install --frozen-lockfile 2>/dev/null || pnpm install
npx webpack --mode production
