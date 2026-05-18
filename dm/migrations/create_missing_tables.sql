-- ============================================
-- OpenFaith 缺失表创建脚本
-- 执行顺序：在 Supabase SQL Editor 中一次性执行
-- ============================================

-- 1. 评论表
CREATE TABLE IF NOT EXISTS comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  status TEXT DEFAULT 'published' CHECK (status IN ('published', 'hidden', 'deleted')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 举报表
CREATE TABLE IF NOT EXISTS reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID NOT NULL REFERENCES auth.users(id),
  target_type TEXT NOT NULL CHECK (target_type IN ('post', 'comment', 'user')),
  target_id UUID NOT NULL,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  admin_note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. 标签申请表 (用于自定义群聊标签审核)
CREATE TABLE IF NOT EXISTS tag_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  tag_name TEXT NOT NULL,
  tag_type TEXT DEFAULT 'group' CHECK (tag_type IN ('group', 'post', 'identity')),
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. 违规词库表
CREATE TABLE IF NOT EXISTS banned_words (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  word TEXT NOT NULL UNIQUE,
  category TEXT DEFAULT 'general' CHECK (category IN ('general', 'politics', 'violence', 'porn', 'religion', 'other')),
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. 客服工单表
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  admin_reply TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. 排行榜表
CREATE TABLE IF NOT EXISTS rankings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  category TEXT NOT NULL CHECK (category IN ('notes', 'likes', 'comments', 'followers', 'heat')),
  score INTEGER DEFAULT 0,
  period TEXT DEFAULT 'weekly' CHECK (period IN ('daily', 'weekly', 'monthly', 'all_time')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, category, period)
);

-- ============================================
-- RLS 策略 - 允许 anon 读取，service_role 完全访问
-- ============================================

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE tag_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE banned_words ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE rankings ENABLE ROW LEVEL SECURITY;

-- comments: 登录用户可读可写自己的，可读公开的
CREATE POLICY "comments_select" ON comments FOR SELECT USING (true);
CREATE POLICY "comments_insert" ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "comments_update" ON comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "comments_delete" ON comments FOR DELETE USING (auth.uid() = user_id);

-- reports: 登录用户可提交，管理员可管理
CREATE POLICY "reports_select" ON reports FOR SELECT USING (true);
CREATE POLICY "reports_insert" ON reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- tag_requests: 登录用户可提交和查看自己的
CREATE POLICY "tag_requests_select" ON tag_requests FOR SELECT USING (true);
CREATE POLICY "tag_requests_insert" ON tag_requests FOR INSERT WITH CHECK (auth.uid() = user_id);

-- banned_words: 所有人可读
CREATE POLICY "banned_words_select" ON banned_words FOR SELECT USING (true);

-- support_tickets: 登录用户可提交和查看自己的
CREATE POLICY "support_tickets_select" ON support_tickets FOR SELECT USING (true);
CREATE POLICY "support_tickets_insert" ON support_tickets FOR INSERT WITH CHECK (auth.uid() = user_id);

-- rankings: 所有人可读
CREATE POLICY "rankings_select" ON rankings FOR SELECT USING (true);

-- ============================================
-- 给 posts 表添加缺失的列
-- ============================================

-- 添加 tags 列（如果不存在）
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'tags') THEN
    ALTER TABLE posts ADD COLUMN tags TEXT[] DEFAULT '{}';
  END IF;
END $$;

-- 添加 likes_count 列
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'likes_count') THEN
    ALTER TABLE posts ADD COLUMN likes_count INTEGER DEFAULT 0;
  END IF;
END $$;

-- 添加 heat_count 列（加热数）
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'heat_count') THEN
    ALTER TABLE posts ADD COLUMN heat_count INTEGER DEFAULT 0;
  END IF;
END $$;

-- 添加 comments_count 列
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'comments_count') THEN
    ALTER TABLE posts ADD COLUMN comments_count INTEGER DEFAULT 0;
  END IF;
END $$;

-- 添加 faith_tag 列（身份标签）
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'faith_tag') THEN
    ALTER TABLE posts ADD COLUMN faith_tag TEXT;
  END IF;
END $$;

-- ============================================
-- 给 profiles 表添加身份标签列
-- ============================================

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'faith_tag') THEN
    ALTER TABLE profiles ADD COLUMN faith_tag TEXT;
  END IF;
END $$;

-- 给 announcements 表确保结构正确
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'announcements' AND column_name = 'title') THEN
    ALTER TABLE announcements ADD COLUMN title TEXT;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'announcements' AND column_name = 'content') THEN
    ALTER TABLE announcements ADD COLUMN content TEXT;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'announcements' AND column_name = 'status') THEN
    ALTER TABLE announcements ADD COLUMN status TEXT DEFAULT 'published';
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'announcements' AND column_name = 'created_at') THEN
    ALTER TABLE announcements ADD COLUMN created_at TIMESTAMPTZ DEFAULT now();
  END IF;
END $$;

-- ============================================
-- 给 books 表添加 group_id 列
-- ============================================

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'books' AND column_name = 'group_id') THEN
    ALTER TABLE books ADD COLUMN group_id UUID REFERENCES book_groups(id);
  END IF;
END $$;
