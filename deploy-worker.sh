#!/bin/bash
# Cloudflare Worker 部署脚本
# 用法: bash deploy-worker.sh <CF_API_TOKEN>
#
# API Token 需要以下权限：
# - Zone:Edit (用于创建 Worker Route)
# - Worker Scripts:Edit (用于部署 Worker)

set -e

API_TOKEN="$1"

if [ -z "$API_TOKEN" ]; then
  echo "错误: 请提供 Cloudflare API Token"
  echo "用法: bash deploy-worker.sh <CF_API_TOKEN>"
  exit 1
fi

ZONE_ID="c34e90a17f0308919565926026e0c1fe"
ACCOUNT_ID=$(curl -s -X GET "https://api.cloudflare.com/client/v4/user/tokens/verify" \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" | grep -o '"account_id":"[^"]*"' | cut -d'"' -f4)

if [ -z "$ACCOUNT_ID" ]; then
  echo "错误: 无法验证 API Token，请检查权限"
  exit 1
fi

echo "Account ID: $ACCOUNT_ID"
echo "Zone ID: $ZONE_ID"

# 创建 Worker 脚本
echo "创建 Worker 脚本..."
curl -s -X PUT "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/workers/scripts/openfaith-sb-proxy" \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/javascript" \
  --data '@cloudflare-worker/index.js'

# 创建 Worker Route (绑定到 openfaithhub.com/sb-api/*)
echo "创建 Worker Route..."
curl -s -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/workers/routes" \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "pattern": "openfaithhub.com/sb-api/*",
    "script": "openfaith-sb-proxy"
  }'

# 验证部署
echo ""
echo "验证 Worker..."
curl -I "https://openfaithhub.com/sb-api/rest/v1/profiles?apikey=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkaHdtZWl0dGdkb3Nta3h0cGFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxMzI0OTIsImV4cCI6MjA5MzcwODQ5Mn0.ID9gk1K754zT_Pbc2wO7tGvm7EGEzlHdpBxu8aD3Dlc"

echo ""
echo "部署完成!"
