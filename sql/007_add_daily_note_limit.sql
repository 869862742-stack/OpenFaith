-- ============================================================
-- 007: 每日笔记发布限制 + 笔记申请工单 + 通知系统
-- ============================================================

-- -------------------------------------------------------
-- 1. profiles 表：新增每日笔记限制相关字段
-- -------------------------------------------------------

-- 今日已发布笔记数（每日重置）
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS daily_note_count integer DEFAULT 0;

-- 最后发布日期（用于判断是否需要重置计数）
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS daily_note_date date DEFAULT null;

-- 管理员审核通过后额外增加的笔记额度（每次申请通过+1，发布后-1）
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS extra_note_granted integer DEFAULT 0;

-- 为现有用户初始化默认值（空值设为0）
UPDATE profiles SET daily_note_count = 0 WHERE daily_note_count IS NULL;
UPDATE profiles SET extra_note_granted = 0 WHERE extra_note_granted IS NULL;

-- 创建索引优化查询
CREATE INDEX IF NOT EXISTS idx_profiles_daily_note_date ON profiles (daily_note_date);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles (user_id);

-- -------------------------------------------------------
-- 2. note_requests 表：笔记发布申请工单
-- -------------------------------------------------------

CREATE TABLE IF NOT EXISTS note_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_note text,
  reviewed_by uuid REFERENCES profiles(user_id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- 索引优化
CREATE INDEX IF NOT EXISTS idx_note_requests_user_id ON note_requests (user_id);
CREATE INDEX IF NOT EXISTS idx_note_requests_status ON note_requests (status);
CREATE INDEX IF NOT EXISTS idx_note_requests_created_at ON note_requests (created_at DESC);

-- -------------------------------------------------------
-- 3. notifications 表：用户通知
-- -------------------------------------------------------

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  type text NOT NULL
    CHECK (type IN ('note_request_approved', 'note_request_rejected', 'system')),
  title text NOT NULL,
  content text,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- 索引优化
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications (is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications (created_at DESC);

-- -------------------------------------------------------
-- 4. RLS 策略（Row Level Security）
-- -------------------------------------------------------

-- note_requests: 用户只能看自己的申请，管理员可看所有
ALTER TABLE note_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "note_requests_select_own"
  ON note_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "note_requests_admin_all"
  ON note_requests FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- notifications: 用户只能看自己的通知
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_select_own"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "notifications_insert_own"
  ON notifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "notifications_update_own"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- -------------------------------------------------------
-- 5. profiles 每日重置触发器（可选：如果用应用层逻辑可跳过）
-- 每次登录时检查 daily_note_date != today 则重置 daily_note_count=0
-- （应用层在 PublishNote 中已做检查，此触发器作为双保险）
-- -------------------------------------------------------

-- 确保 profiles 表的字段可被触发器修改
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'daily_note_count'
  ) THEN
    ALTER TABLE profiles ADD COLUMN daily_note_count integer DEFAULT 0;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'daily_note_date'
  ) THEN
    ALTER TABLE profiles ADD COLUMN daily_note_date date DEFAULT null;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'extra_note_granted'
  ) THEN
    ALTER TABLE profiles ADD COLUMN extra_note_granted integer DEFAULT 0;
  END IF;
END $$;
