#!/bin/bash
# 数据库初始化脚本
# 添加地区字段到 profiles 表

SUPABASE_URL="https://rdhwmeittgdosmkxtpak.supabase.co"
SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkaHdtZWl0dGdkb3Nta3h0cGFrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODEzMjQ5MiwiZXhwIjoyMDkzNzA4NDkyfQ.bPatiu7NXaE2k48aTkjAGQsba6NzXlIdq2k_gGLYLBE"

echo "开始初始化数据库字段..."

# 使用 curl 发送 PATCH 请求来添加字段
# 注意：Supabase REST API 不支持直接 ALTER TABLE
# 这里我们需要通过 Supabase Dashboard 或 psql 来执行

echo ""
echo "请在 Supabase Dashboard -> SQL Editor 中执行以下 SQL:"
echo ""
cat << 'EOF'
-- 添加地区字段到 profiles 表

-- 1. 添加 continent 字段
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS continent TEXT DEFAULT 'Unknown';

-- 2. 添加 country 字段
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'Unknown';

-- 3. 添加 region 字段
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS region TEXT DEFAULT 'Unknown';

-- 4. 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_profiles_continent ON public.profiles(continent);
CREATE INDEX IF NOT EXISTS idx_profiles_country ON public.profiles(country);
CREATE INDEX IF NOT EXISTS idx_profiles_faith_tag ON public.profiles(faith_tag);

-- 输出成功消息
SELECT 'Profile location fields added successfully!' AS message;
EOF

echo ""
echo "执行完上述 SQL 后，数据库将支持地区分布统计功能。"
echo ""

# 尝试检查当前字段状态
echo "检查当前 profiles 表结构..."
curl -s -X POST "${SUPABASE_URL}/rest/v1/profiles?select=continent,country,region&limit=1" \
  -H "apikey: ${SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" | head -100

echo ""
echo "数据库初始化检查完成。"
