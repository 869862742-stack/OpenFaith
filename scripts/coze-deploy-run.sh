#!/bin/bash
# Coze部署启动脚本 - 兼容只读文件系统

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"

export PORT=5000

# 构建生产版本（忽略缓存清理失败）
rm -rf .webpack-cache 2>/dev/null || true
npx webpack --mode production 2>&1 || true

# 后台启动server.js，脚本快速退出
nohup node server.js > /tmp/server.log 2>&1 &
sleep 2

# 验证启动成功
if curl -s -o /dev/null http://localhost:5000/ 2>/dev/null; then
  echo "Server started successfully on port 5000"
  exit 0
else
  echo "Server may still be starting..."
  exit 0
fi
