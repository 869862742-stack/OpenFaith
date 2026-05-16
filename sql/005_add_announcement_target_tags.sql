-- 公告表增加目标身份标签字段
-- target_tags 为空数组或null时表示全员可见
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS target_tags text[] DEFAULT '{}';
