-- ============================================
-- OpenFaith Supabase 表权限补全脚本
-- 用途：确保所有 public schema 表在 Supabase 新安全策略（2026年10月30日强制）下仍可通过 Data API 访问
-- 执行位置：Supabase Dashboard → SQL Editor
-- ============================================

-- 1. admins 表
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admins TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admins TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admins TO service_role;

-- 2. announcements 表
GRANT SELECT ON public.announcements TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO service_role;

-- 3. banned_words 表
GRANT SELECT ON public.banned_words TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.banned_words TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.banned_words TO service_role;

-- 4. book_groups 表
GRANT SELECT ON public.book_groups TO anon;
GRANT SELECT ON public.book_groups TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_groups TO service_role;

-- 5. books 表
GRANT SELECT ON public.books TO anon;
GRANT SELECT ON public.books TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.books TO service_role;

-- 6. chapters 表
GRANT SELECT ON public.chapters TO anon;
GRANT SELECT ON public.chapters TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chapters TO service_role;

-- 7. comments 表
GRANT SELECT ON public.comments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comments TO service_role;

-- 8. favorites 表
GRANT SELECT, INSERT, DELETE ON public.favorites TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.favorites TO service_role;

-- 9. follows 表
GRANT SELECT, INSERT, DELETE ON public.follows TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.follows TO service_role;

-- 10. posts 表
GRANT SELECT ON public.posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.posts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.posts TO service_role;

-- 11. profiles 表
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO service_role;

-- 12. rankings 表
GRANT SELECT ON public.rankings TO anon;
GRANT SELECT ON public.rankings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rankings TO service_role;

-- 13. religions 表
GRANT SELECT ON public.religions TO anon;
GRANT SELECT ON public.religions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.religions TO service_role;

-- 14. reports 表
GRANT INSERT ON public.reports TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reports TO service_role;

-- 15. support_tickets 表
GRANT SELECT, INSERT, UPDATE ON public.support_tickets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_tickets TO service_role;

-- 16. tag_requests 表
GRANT SELECT, INSERT ON public.tag_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tag_requests TO service_role;

-- 17. tags 表
GRANT SELECT ON public.tags TO anon;
GRANT SELECT ON public.tags TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tags TO service_role;

-- ============================================
-- 权限说明：
-- - anon（未登录用户）：只读公开内容（帖子、书籍、宗教、公告等）
-- - authenticated（已登录用户）：可读写自己相关的数据（评论、收藏、关注、发帖等）
-- - service_role（服务端）：完全访问权限
-- ============================================
