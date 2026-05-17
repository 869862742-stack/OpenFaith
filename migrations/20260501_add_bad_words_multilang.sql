-- ============================================
-- OpenFaith 违规词过滤系统迁移脚本
-- 添加多语言支持
-- ============================================

-- 1. 给 banned_words 表添加 language 字段
ALTER TABLE IF EXISTS banned_words ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'all' CHECK (language IN ('all', 'zh-CN', 'en-US', 'fr-FR', 'es-ES', 'ru-RU'));

-- 2. 给 banned_words 表添加变体字段（用于存储常见变体/谐音）
ALTER TABLE IF EXISTS banned_words ADD COLUMN IF NOT EXISTS variants TEXT[] DEFAULT '{}';

-- 3. 给 banned_words 表添加描述字段
ALTER TABLE IF EXISTS banned_words ADD COLUMN IF NOT EXISTS description TEXT;

-- 4. 创建索引以提升查询性能
CREATE INDEX IF NOT EXISTS idx_banned_words_language ON banned_words(language);
CREATE INDEX IF NOT EXISTS idx_banned_words_category ON banned_words(category);

-- 5. 更新现有数据的 language 字段为 'all'
UPDATE banned_words SET language = 'all' WHERE language IS NULL;
