#!/usr/bin/env bash
set -euo pipefail

# 基于脚本位置定位项目根目录
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

# 显式声明关键环境变量
export PORT=5000

echo "Starting preview server in: $(pwd)"
echo "PORT=$PORT"

# 清理端口残留进程
pkill -f "node.*server.js" 2>/dev/null || true
sleep 0.5

# 确保 dist 目录存在
if [ ! -d "dist" ] || [ ! -f "dist/index.html" ]; then
  echo "dist directory not found or incomplete, running build..."
  pnpm build && pnpm build:admin
fi

# 使用自定义服务器（支持静态文件和 Mock Auth API）
echo "Starting server.js..."
exec node server.js
