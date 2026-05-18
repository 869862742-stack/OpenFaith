#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"
export PORT=5000
nohup node server.js > /tmp/server.log 2>&1 &
sleep 2
exit 0
