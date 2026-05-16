#!/usr/bin/env bash
set -euo pipefail

# 基于脚本位置定位项目根目录
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"

# 安装依赖
pnpm install

# 构建管理端（先生成 admin-dashboard.html）
pnpm build:admin

# 构建用户端
pnpm build
