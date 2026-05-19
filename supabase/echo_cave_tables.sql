-- ============================================
-- 树洞回声 (Echo Cave) 数据表
-- 执行位置: Supabase SQL Editor
-- ============================================

-- 1. 创建回声分享表 (匿名分享)
CREATE TABLE IF NOT EXISTS echo_shares (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL CHECK (char_length(content) <= 200),
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_echo_shares_created_at ON echo_shares(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_echo_shares_user_id ON echo_shares(user_id);

-- 2. 创建回声回应表 (匿名回应)
CREATE TABLE IF NOT EXISTS echo_echoes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  share_id UUID NOT NULL REFERENCES echo_shares(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) <= 100),
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_echo_echoes_share_id ON echo_echoes(share_id);
CREATE INDEX IF NOT EXISTS idx_echo_echoes_created_at ON echo_echoes(created_at DESC);

-- 3. 创建回声反应表 (轻互动)
CREATE TABLE IF NOT EXISTS echo_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  share_id UUID NOT NULL REFERENCES echo_shares(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('resonated', 'understand', 'with_you', 'quiet_support')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(share_id, user_id, reaction_type)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_echo_reactions_share_id ON echo_reactions(share_id);
CREATE INDEX IF NOT EXISTS idx_echo_reactions_user_id ON echo_reactions(user_id);

-- ============================================
-- RLS (行级安全策略) - 匿名功能，不需要严格的用户验证
-- ============================================

-- echo_shares 表策略
ALTER TABLE echo_shares ENABLE ROW LEVEL SECURITY;

-- 允许任何人读取
CREATE POLICY "echo_shares_select" ON echo_shares
  FOR SELECT USING (true);

-- 允许已登录用户创建分享
CREATE POLICY "echo_shares_insert" ON echo_shares
  FOR INSERT WITH CHECK (true);

-- 允许用户删除自己的分享
CREATE POLICY "echo_shares_delete_own" ON echo_shares
  FOR DELETE USING (auth.uid() = user_id);

-- echo_echoes 表策略
ALTER TABLE echo_echoes ENABLE ROW LEVEL SECURITY;

-- 允许任何人读取回应
CREATE POLICY "echo_echoes_select" ON echo_echoes
  FOR SELECT USING (true);

-- 允许已登录用户创建回应
CREATE POLICY "echo_echoes_insert" ON echo_echoes
  FOR INSERT WITH CHECK (true);

-- echo_reactions 表策略
ALTER TABLE echo_reactions ENABLE ROW LEVEL SECURITY;

-- 允许任何人读取反应
CREATE POLICY "echo_reactions_select" ON echo_reactions
  FOR SELECT USING (true);

-- 允许已登录用户添加反应
CREATE POLICY "echo_reactions_insert" ON echo_reactions
  FOR INSERT WITH CHECK (true);

-- 允许用户删除自己的反应
CREATE POLICY "echo_reactions_delete_own" ON echo_reactions
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 完成后验证
-- ============================================
SELECT 'Tables created successfully!' as status;
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'echo_%';
