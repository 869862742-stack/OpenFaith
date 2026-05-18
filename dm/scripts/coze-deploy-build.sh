#!/bin/bash
cd "$(dirname "$0")/.."
pnpm install && pnpm build && pnpm build:admin
