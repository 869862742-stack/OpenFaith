-- 为 profiles 表添加 last_online_at 字段，用于在线状态追踪
-- last_online_at 记录用户最后活跃时间

-- 1. 添加 last_online_at 字段
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_online_at timestamptz DEFAULT now();

-- 2. 为现有用户设置初始值（当前时间）
UPDATE profiles SET last_online_at = now() WHERE last_online_at IS NULL;

-- 3. 创建索引以优化在线人数查询性能
CREATE INDEX IF NOT EXISTS idx_profiles_last_online_at ON profiles (last_online_at);

-- 4. 创建自动更新 last_online_at 的触发器函数
CREATE OR REPLACE FUNCTION update_last_online()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_online_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. 创建触发器：当 profiles 表更新时自动更新 last_online_at
-- 注意：这个触发器会在任何更新时更新时间戳
DROP TRIGGER IF EXISTS trigger_update_last_online ON profiles;
CREATE TRIGGER trigger_update_last_online
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_last_online();
