-- Migration: Add audio_tracks column to rooms table
-- Date: 2024

-- 添加 audio_tracks JSONB 字段用于存储音频播放列表
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS audio_tracks JSONB DEFAULT '[]'::jsonb;

-- 添加 last_activity_at 字段用于房间自动解散
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ DEFAULT NOW();

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_rooms_last_activity_at ON rooms(last_activity_at);
CREATE INDEX IF NOT EXISTS idx_rooms_user_count ON rooms(user_count);

-- 创建自动更新 last_activity_at 的触发器
CREATE OR REPLACE FUNCTION update_last_activity()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_activity_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_last_activity ON room_participants;
CREATE TRIGGER trg_update_last_activity
  AFTER INSERT OR UPDATE ON room_participants
  FOR EACH ROW
  EXECUTE FUNCTION update_last_activity();

-- 添加房间表的 RLS 策略（如果需要）
-- ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow service role to update rooms" ON rooms
--   FOR ALL USING (auth.role() = 'service_role');
