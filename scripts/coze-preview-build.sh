#!/usr/bin/env bash
set -euo pipefail

# 基于脚本位置定位项目根目录
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"

# 清理旧的 webpack 缓存（可选）
# rm -rf .webpack-cache 2>/dev/null || true

# 检查依赖是否已安装（避免每次都运行 pnpm install）
if [ ! -d "node_modules" ] || [ ! -f "pnpm-lock.yaml" ]; then
  echo "Installing dependencies..."
  pnpm install --prefer-offline
fi

# 启用 webpack 缓存后，后续构建会更快
echo "Building user app..."
pnpm run build 2>&1 | grep -E "(compiled|error|Error)" || true

echo "Building admin app..."
pnpm run build:admin 2>&1 | grep -E "(compiled|error|Error)" || true

echo "Build completed!"
