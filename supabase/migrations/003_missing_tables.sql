-- OpenFaith 补充建表脚本（仅创建缺失的表）
-- 在 Supabase Dashboard → SQL Editor 中执行

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

-- 3. 创建 announcements 表
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    is_pinned BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 创建 admins 表
CREATE TABLE IF NOT EXISTS public.admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'admin',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建 RPC 函数
CREATE OR REPLACE FUNCTION get_book_chapters_count()
RETURNS TABLE(book_id TEXT, count BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT c.book_id, COUNT(*)::BIGINT
    FROM chapters c
    GROUP BY c.book_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS 策略
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.religions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read" ON public.tags FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON public.religions FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON public.announcements FOR SELECT USING (true);

CREATE POLICY "Allow authenticated insert" ON public.tags FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON public.tags FOR UPDATE USING (true);
CREATE POLICY "Allow authenticated delete" ON public.tags FOR DELETE USING (true);

CREATE POLICY "Allow authenticated insert" ON public.announcements FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON public.announcements FOR UPDATE USING (true);
CREATE POLICY "Allow authenticated delete" ON public.announcements FOR DELETE USING (true);

CREATE POLICY "Admin access" ON public.admins FOR ALL USING (true);

-- 完成
SELECT 'Tables created successfully!' AS message;
