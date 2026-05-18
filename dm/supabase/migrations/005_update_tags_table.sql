-- Migration: Update tags table structure for tag management system
-- Execute this in Supabase Dashboard -> SQL Editor

-- 1. Drop existing tags table and recreate with new structure
DROP TABLE IF EXISTS public.tags;

-- 2. Create tags table with new structure
CREATE TABLE IF NOT EXISTS public.tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL,              -- 标签类型: identity/homepage/post/group
    icon TEXT,                        -- 图标emoji或图标名
    color TEXT DEFAULT '#E11D48',     -- 标签颜色
    sort_order INTEGER DEFAULT 0,     -- 排序顺序
    is_active BOOLEAN DEFAULT true,   -- 是否启用
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create unique index for type + name combination
CREATE UNIQUE INDEX IF NOT EXISTS idx_tags_type_name ON tags(type, name);

-- 4. Create index for type query
CREATE INDEX IF NOT EXISTS idx_tags_type ON tags(type);

-- 5. Enable RLS
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies for admin access (service role can access all)
CREATE POLICY "Service role full access to tags" ON public.tags
    FOR ALL USING (true) WITH CHECK (true);

-- 7. Insert initial data for all 4 tag types

-- 身份标签 (Identity Tags)
INSERT INTO public.tags (name, type, icon, sort_order) VALUES
    ('基督教', 'identity', '✝️', 1),
    ('伊斯兰教', 'identity', '☪️', 2),
    ('犹太教', 'identity', '✡️', 3),
    ('佛教', 'identity', '☸️', 4),
    ('印度教', 'identity', '🕉️', 5),
    ('道教', 'identity', '☯️', 6),
    ('锡克教', 'identity', '🏴', 7),
    ('巴哈伊教', 'identity', '✦', 8),
    ('摩门教', 'identity', '📿', 9),
    ('耶和华见证人', 'identity', '📖', 10),
    ('琐罗亚斯德教', 'identity', '🔥', 11),
    ('诺斯替', 'identity', '☆', 12),
    ('卡巴拉', 'identity', '🔮', 13),
    ('神道教', 'identity', '⛩️', 14),
    ('耆那教', 'identity', '☸️', 15),
    ('德鲁兹教', 'identity', '🌙', 16),
    ('约鲁巴教', 'identity', '🐍', 17),
    ('伏都教', 'identity', '🦅', 18),
    ('雅兹迪', 'identity', '👼', 19),
    ('曼达安', 'identity', '⭐', 20),
    ('玛雅/阿兹特克', 'identity', '🌵', 21),
    ('毛利宗教', 'identity', '🌺', 22),
    ('天理教', 'identity', '🌸', 23),
    ('天道教', 'identity', '☀️', 24),
    ('高台教', 'identity', '🌈', 25),
    ('宗教研究者', 'identity', '🔍', 26),
    ('经文爱好者', 'identity', '📚', 27),
    ('寻求者', 'identity', '❓', 28);

-- 首页标签 (Homepage Tags)
INSERT INTO public.tags (name, type, icon, sort_order) VALUES
    ('基督教', 'homepage', '✝️', 1),
    ('伊斯兰教', 'homepage', '☪️', 2),
    ('犹太教', 'homepage', '✡️', 3),
    ('佛教', 'homepage', '☸️', 4),
    ('印度教', 'homepage', '🕉️', 5),
    ('道教', 'homepage', '☯️', 6),
    ('锡克教', 'homepage', '🏴', 7),
    ('巴哈伊教', 'homepage', '✦', 8),
    ('摩门教', 'homepage', '📿', 9),
    ('耶和华见证人', 'homepage', '📖', 10),
    ('琐罗亚斯德教', 'homepage', '🔥', 11),
    ('诺斯替', 'homepage', '☆', 12),
    ('卡巴拉', 'homepage', '🔮', 13),
    ('神道教', 'homepage', '⛩️', 14),
    ('耆那教', 'homepage', '☸️', 15),
    ('德鲁兹教', 'homepage', '🌙', 16),
    ('约鲁巴教', 'homepage', '🐍', 17),
    ('伏都教', 'homepage', '🦅', 18),
    ('雅兹迪', 'homepage', '👼', 19),
    ('曼达安', 'homepage', '⭐', 20),
    ('玛雅/阿兹特克', 'homepage', '🌵', 21),
    ('毛利宗教', 'homepage', '🌺', 22),
    ('天理教', 'homepage', '🌸', 23),
    ('天道教', 'homepage', '☀️', 24),
    ('高台教', 'homepage', '🌈', 25);

-- 笔记标签 (Post Tags)
INSERT INTO public.tags (name, type, icon, sort_order) VALUES
    ('基督教', 'post', '✝️', 1),
    ('伊斯兰教', 'post', '☪️', 2),
    ('犹太教', 'post', '✡️', 3),
    ('佛教', 'post', '☸️', 4),
    ('印度教', 'post', '🕉️', 5),
    ('道教', 'post', '☯️', 6),
    ('锡克教', 'post', '🏴', 7),
    ('巴哈伊教', 'post', '✦', 8),
    ('摩门教', 'post', '📿', 9),
    ('耶和华见证人', 'post', '📖', 10),
    ('琐罗亚斯德教', 'post', '🔥', 11),
    ('诺斯替', 'post', '☆', 12),
    ('卡巴拉', 'post', '🔮', 13),
    ('神道教', 'post', '⛩️', 14),
    ('耆那教', 'post', '☸️', 15),
    ('德鲁兹教', 'post', '🌙', 16),
    ('约鲁巴教', 'post', '🐍', 17),
    ('伏都教', 'post', '🦅', 18),
    ('雅兹迪', 'post', '👼', 19),
    ('曼达安', 'post', '⭐', 20),
    ('玛雅/阿兹特克', 'post', '🌵', 21),
    ('毛利宗教', 'post', '🌺', 22),
    ('天理教', 'post', '🌸', 23),
    ('天道教', 'post', '☀️', 24),
    ('高台教', 'post', '🌈', 25);

-- 群聊标签 (Group Tags)
INSERT INTO public.tags (name, type, icon, sort_order) VALUES
    ('基督教', 'group', '✝️', 1),
    ('伊斯兰教', 'group', '☪️', 2),
    ('犹太教', 'group', '✡️', 3),
    ('佛教', 'group', '☸️', 4),
    ('印度教', 'group', '🕉️', 5),
    ('道教', 'group', '☯️', 6),
    ('锡克教', 'group', '🏴', 7),
    ('巴哈伊教', 'group', '✦', 8),
    ('摩门教', 'group', '📿', 9),
    ('耶和华见证人', 'group', '📖', 10),
    ('琐罗亚斯德教', 'group', '🔥', 11),
    ('诺斯替', 'group', '☆', 12),
    ('卡巴拉', 'group', '🔮', 13),
    ('神道教', 'group', '⛩️', 14),
    ('耆那教', 'group', '☸️', 15),
    ('德鲁兹教', 'group', '🌙', 16),
    ('约鲁巴教', 'group', '🐍', 17),
    ('伏都教', 'group', '🦅', 18),
    ('雅兹迪', 'group', '👼', 19),
    ('曼达安', 'group', '⭐', 20),
    ('玛雅/阿兹特克', 'group', '🌵', 21),
    ('毛利宗教', 'group', '🌺', 22),
    ('天理教', 'group', '🌸', 23),
    ('天道教', 'group', '☀️', 24),
    ('高台教', 'group', '🌈', 25);

-- 8. Create function to get tag usage counts
CREATE OR REPLACE FUNCTION get_tag_usage_counts()
RETURNS TABLE(tag_name TEXT, tag_type TEXT, usage_count BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.faith_tag::TEXT as tag_name,
        'identity'::TEXT as tag_type,
        COUNT(*) as usage_count
    FROM public.profiles p
    WHERE p.faith_tag IS NOT NULL AND p.faith_tag != ''
    GROUP BY p.faith_tag
    UNION ALL
    SELECT 
        unnest(p.tags)::TEXT as tag_name,
        CASE 
            WHEN EXISTS (SELECT 1 FROM unnest(p.tags) t WHERE t = '__group_chat__') THEN 'group'
            ELSE 'post'
        END as tag_type,
        COUNT(*) as usage_count
    FROM public.posts p
    WHERE p.tags IS NOT NULL AND array_length(p.tags, 1) > 0
    GROUP BY p.tags;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
