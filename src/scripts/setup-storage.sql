-- ============================================
-- Supabase Storage 配置脚本
-- 用于配置头像和背景图片存储桶及 RLS 策略
-- ============================================

-- ============================================
-- 1. 创建 Storage 桶
-- ============================================

-- 创建 avatars 桶（如果不存在）
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;

-- 创建 backgrounds 桶
INSERT INTO storage.buckets (id, name, public) VALUES ('backgrounds', 'backgrounds', true) ON CONFLICT (id) DO NOTHING;


-- ============================================
-- 2. Storage RLS 策略 - avatars 桶
-- ============================================

-- 删除已存在的策略（避免重复）
DROP POLICY IF EXISTS "Anyone can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;

-- 允许所有用户上传头像
CREATE POLICY "Anyone can upload avatars" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars');

-- 允许所有用户更新头像
CREATE POLICY "Anyone can update avatars" ON storage.objects
  FOR UPDATE USING (bucket_id = 'avatars');

-- 允许所有人查看头像
CREATE POLICY "Anyone can view avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');


-- ============================================
-- 3. Storage RLS 策略 - backgrounds 桶
-- ============================================

-- 删除已存在的策略（避免重复）
DROP POLICY IF EXISTS "Anyone can upload backgrounds" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update backgrounds" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view backgrounds" ON storage.objects;

-- 允许所有用户上传背景
CREATE POLICY "Anyone can upload backgrounds" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'backgrounds');

-- 允许所有用户更新背景
CREATE POLICY "Anyone can update backgrounds" ON storage.objects
  FOR UPDATE USING (bucket_id = 'backgrounds');

-- 允许所有人查看背景
CREATE POLICY "Anyone can view backgrounds" ON storage.objects
  FOR SELECT USING (bucket_id = 'backgrounds');


-- ============================================
-- 4. profiles 表 RLS 策略（确保头像/背景 URL 可保存）
-- ============================================

-- 删除已存在的策略（避免重复）
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view profiles" ON profiles;

-- 允许用户更新自己的 profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- 允许所有人查看 profile（公开信息）
CREATE POLICY "Users can view profiles" ON profiles
  FOR SELECT USING (true);


-- ============================================
-- 5. 验证配置
-- ============================================

-- 查看已创建的桶
-- SELECT * FROM storage.buckets WHERE name IN ('avatars', 'backgrounds');

-- 查看已创建的策略
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';
