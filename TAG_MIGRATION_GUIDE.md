# OpenFaith 标签管理系统数据库配置指南

## 概述

本指南用于配置 OpenFaith APP 的标签管理系统。需要更新 `tags` 表结构并插入初始数据。

## 步骤

### 1. 在 Supabase Dashboard 中执行 SQL

登录 Supabase Dashboard (https://supabase.com/dashboard)，进入你的项目，然后：

1. 点击左侧菜单 **SQL Editor**
2. 点击 **New Query**
3. 粘贴以下 SQL 并执行：

```sql
-- Migration: Update tags table structure for tag management system

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
```

### 2. 插入初始标签数据

在 **SQL Editor** 中创建新的 Query，粘贴以下 SQL 并执行：

```sql
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
```

## 验证

执行完 SQL 后，在 **SQL Editor** 中运行以下查询验证数据：

```sql
-- 查看各类型标签数量
SELECT type, COUNT(*) as count FROM public.tags GROUP BY type ORDER BY type;
```

预期结果：
| type | count |
|------|-------|
| identity | 28 |
| homepage | 25 |
| post | 25 |
| group | 25 |

## 标签类型说明

| 类型 | 用途 | 存储位置 |
|------|------|----------|
| identity | 用户信仰身份 | profiles.faith_tag |
| homepage | 首页标签筛选 | posts.tags |
| post | 笔记标签 | posts.tags |
| group | 群聊标签 | posts.tags |

## 注意事项

1. 执行 SQL 时请确保在正确的数据库中
2. DROP TABLE 会删除现有数据，如果有重要数据请先备份
3. Service Role Key 已在前端代码中硬编码，RLS 策略允许 service role 完全访问
