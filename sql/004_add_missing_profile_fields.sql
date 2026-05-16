-- 为 profiles 表添加缺失的会员/等级相关字段

-- 曝光卡：VIP每月1张，可设置1篇笔记曝光2小时
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS exposure_cards integer DEFAULT 0;
-- 置顶卡：VIP每月1张，可置顶1篇笔记2小时
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS sticky_cards integer DEFAULT 0;
-- 下载次数
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS downloads_count integer DEFAULT 0;
-- 主题色
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS theme_color text DEFAULT '#E11D48';
-- 主题模式
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS theme_mode text DEFAULT 'light';
-- VIP经验倍率
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS vip_exp_multiplier real DEFAULT 1.0;
-- 动态头像（已有 is_animated_avatar，但补充字段以保持一致）
-- 热度值
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS hot_points integer DEFAULT 5;

-- 更新已有VIP用户的默认值
UPDATE profiles SET vip_exp_multiplier = 2.0 WHERE is_vip = true;
UPDATE profiles SET exposure_cards = 1 WHERE is_vip = true;
UPDATE profiles SET sticky_cards = 1 WHERE is_vip = true;

-- 更新已有用户的热点默认值（如果为0或null则设为5）
UPDATE profiles SET hot_points = 5 WHERE hot_points IS NULL OR hot_points = 0;
