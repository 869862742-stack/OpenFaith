-- 添加地区字段到 profiles 表
-- 在 Supabase Dashboard -> SQL Editor 中执行此脚本

-- 添加洲字段
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS continent TEXT DEFAULT 'Unknown';

-- 添加国家字段
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'Unknown';

-- 添加 region 字段（具体地区/省份）
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS region TEXT DEFAULT 'Unknown';

-- 更新现有数据（可选，根据实际情况设置默认值）
-- UPDATE public.profiles SET continent = 'Unknown', country = 'Unknown', region = 'Unknown' WHERE continent IS NULL;

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_profiles_continent ON public.profiles(continent);
CREATE INDEX IF NOT EXISTS idx_profiles_country ON public.profiles(country);
CREATE INDEX IF NOT EXISTS idx_profiles_faith_tag ON public.profiles(faith_tag);

-- 输出成功消息
SELECT 'Profile location fields added successfully!' AS message;
