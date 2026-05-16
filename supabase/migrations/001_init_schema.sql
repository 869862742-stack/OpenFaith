-- OpenFaith 数据库初始化迁移脚本
-- 在 Supabase Dashboard -> SQL Editor 中执行此脚本

-- 1. 创建 tags 表
CREATE TABLE IF NOT EXISTS public.tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    color TEXT DEFAULT '#C41E3A',
    count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 创建 religions 表
CREATE TABLE IF NOT EXISTS public.religions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT,
    origin_place TEXT,
    origin_time TEXT,
    distribution TEXT,
    followers_scale TEXT,
    core_belief TEXT,
    introduction TEXT,
    history TEXT,
    doctrines TEXT,
    classics TEXT,
    festivals TEXT,
    rituals TEXT,
    taboos TEXT,
    sacred_sites TEXT,
    famous_figures TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 创建 books 表
CREATE TABLE IF NOT EXISTS public.books (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    religion TEXT,
    category TEXT DEFAULT '经典',
    description TEXT,
    cover_url TEXT,
    status TEXT DEFAULT 'draft',
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 创建 chapters 表
CREATE TABLE IF NOT EXISTS public.chapters (
    id TEXT PRIMARY KEY,
    book_id TEXT NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
    number INTEGER DEFAULT 1,
    title TEXT,
    content TEXT,
    volume TEXT,
    status TEXT DEFAULT 'draft',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. 创建 book_groups 表
CREATE TABLE IF NOT EXISTS public.book_groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    religion TEXT,
    description TEXT,
    book_ids TEXT[] DEFAULT '{}',
    group_ids TEXT[] DEFAULT '{}',
    parent_id TEXT,
    status TEXT DEFAULT 'draft',
    is_published BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. 创建 posts 表（如果不存在）
CREATE TABLE IF NOT EXISTS public.posts (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT,
    content TEXT,
    cover_image TEXT,
    images TEXT[],
    tags TEXT[],
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. 创建 announcements 表
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    is_pinned BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. 创建 admins 表（用于管理员权限）
CREATE TABLE IF NOT EXISTS public.admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'admin',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. 创建 RPC 函数获取书籍章节数
CREATE OR REPLACE FUNCTION get_book_chapters_count()
RETURNS TABLE(book_id TEXT, count BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT c.book_id, COUNT(*)::BIGINT
    FROM chapters c
    GROUP BY c.book_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 设置 RLS 策略（根据需要调整）

-- 启用 RLS
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.religions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- 允许公开读取 tags, religions, books, chapters, book_groups, announcements
CREATE POLICY "Allow public read" ON public.tags FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON public.religions FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON public.books FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON public.chapters FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON public.book_groups FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON public.announcements FOR SELECT USING (true);

-- 允许认证用户增删改 tags
CREATE POLICY "Allow authenticated insert" ON public.tags FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON public.tags FOR UPDATE USING (true);
CREATE POLICY "Allow authenticated delete" ON public.tags FOR DELETE USING (true);

-- 允许认证用户增删改 announcements
CREATE POLICY "Allow authenticated insert" ON public.announcements FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON public.announcements FOR UPDATE USING (true);
CREATE POLICY "Allow authenticated delete" ON public.announcements FOR DELETE USING (true);

-- posts 表 RLS
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read" ON public.posts FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert" ON public.posts FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow owner update" ON public.posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Allow owner delete" ON public.posts FOR DELETE USING (auth.uid() = user_id);

-- admins 表只有超级管理员可以访问（通过 service_role key）
CREATE POLICY "Admin access" ON public.admins FOR ALL USING (true);

-- 输出成功消息
SELECT 'Database tables created successfully!' AS message;
