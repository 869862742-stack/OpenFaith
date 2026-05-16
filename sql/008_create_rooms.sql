-- OpenFaith 静默陪伴房间功能（一期）
-- 执行方式：在 Supabase Dashboard -> SQL Editor 中执行，或使用 supabase CLI

-- ============================================
-- 1. 创建 rooms 表
-- ============================================
CREATE TABLE IF NOT EXISTS rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  creator_id uuid NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  ambient_sound text DEFAULT 'silence' CHECK (ambient_sound IN ('silence', 'rain', 'ocean', 'forest', 'wind', 'piano', 'custom')),
  custom_audio_url text,
  tags text[] DEFAULT '{}',
  user_count integer DEFAULT 0,
  max_display_sentences integer DEFAULT 3,
  last_activity_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- 2. 创建 room_participants 表
-- ============================================
CREATE TABLE IF NOT EXISTS room_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  status text DEFAULT 'quiet' CHECK (status IN ('quiet', 'reading', 'reflecting', 'meditating', 'praying', 'grateful')),
  is_owner boolean DEFAULT false,
  joined_at timestamptz DEFAULT now(),
  last_active_at timestamptz DEFAULT now(),
  UNIQUE(room_id, user_id)
);

-- ============================================
-- 3. 创建 room_sentences 表
-- ============================================
CREATE TABLE IF NOT EXISTS room_sentences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  content text NOT NULL CHECK (char_length(content) <= 30),
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- 4. 创建索引
-- ============================================
CREATE INDEX IF NOT EXISTS idx_rooms_last_activity ON rooms(last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_rooms_created ON rooms(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rooms_user_count ON rooms(user_count DESC);

CREATE INDEX IF NOT EXISTS idx_participants_room ON room_participants(room_id);
CREATE INDEX IF NOT EXISTS idx_participants_user ON room_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_participants_active ON room_participants(last_active_at DESC);

CREATE INDEX IF NOT EXISTS idx_sentences_room ON room_sentences(room_id);
CREATE INDEX IF NOT EXISTS idx_sentences_created ON room_sentences(created_at DESC);

-- ============================================
-- 5. RLS 策略
-- ============================================
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_sentences ENABLE ROW LEVEL SECURITY;

-- rooms: 所有人可读取，认证用户可创建，房主可更新/删除
CREATE POLICY "rooms_read_all" ON rooms FOR SELECT USING (true);
CREATE POLICY "rooms_insert_auth" ON rooms FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "rooms_update_owner" ON rooms FOR UPDATE USING (auth.uid() = creator_id);
CREATE POLICY "rooms_delete_owner" ON rooms FOR DELETE USING (auth.uid() = creator_id);

-- room_participants: 房间内成员可读取，认证用户可加入/离开
CREATE POLICY "participants_read_room" ON room_participants FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM room_participants rp2 
    WHERE rp2.room_id = room_participants.room_id 
    AND rp2.user_id = auth.uid()
  ));
CREATE POLICY "participants_insert_auth" ON room_participants FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "participants_update_self" ON room_participants FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "participants_delete_self" ON room_participants FOR DELETE USING (auth.uid() = user_id);

-- room_sentences: 房间内成员可读取，认证用户可发言
CREATE POLICY "sentences_read_room" ON room_sentences FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM room_participants rp 
    WHERE rp.room_id = room_sentences.room_id 
    AND rp.user_id = auth.uid()
  ));
CREATE POLICY "sentences_insert_auth" ON room_sentences FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 6. 触发器：自动更新房间在线人数
-- ============================================
CREATE OR REPLACE FUNCTION update_room_user_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE rooms SET user_count = user_count + 1, last_activity_at = now() WHERE id = NEW.room_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE rooms SET user_count = GREATEST(0, user_count - 1) WHERE id = OLD.room_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_participant_join ON room_participants;
CREATE TRIGGER on_participant_join
  AFTER INSERT ON room_participants
  FOR EACH ROW EXECUTE FUNCTION update_room_user_count();

DROP TRIGGER IF EXISTS on_participant_leave ON room_participants;
CREATE TRIGGER on_participant_leave
  AFTER DELETE ON room_participants
  FOR EACH ROW EXECUTE FUNCTION update_room_user_count();

-- ============================================
-- 7. 触发器：自动更新最后活跃时间
-- ============================================
CREATE OR REPLACE FUNCTION update_participant_active()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_active_at = now();
  UPDATE rooms SET last_activity_at = now() WHERE id = NEW.room_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_participant_active ON room_participants;
CREATE TRIGGER on_participant_active
  AFTER UPDATE OF status ON room_participants
  FOR EACH ROW EXECUTE FUNCTION update_participant_active();

-- ============================================
-- 8. 清理过期句子（30分钟前的句子自动删除）
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_old_sentences()
RETURNS void AS $$
BEGIN
  DELETE FROM room_sentences WHERE created_at < now() - interval '30 minutes';
END;
$$ LANGUAGE plpgsql;

-- 注意：这个清理函数需要通过 pg_cron 或外部定时任务调用
-- 示例：SELECT cron.schedule('cleanup-sentences', '*/5 * * * *', 'SELECT cleanup_old_sentences()');

-- ============================================
-- 9. 标记解散房间的函数
-- ============================================
CREATE OR REPLACE FUNCTION mark_inactive_rooms()
RETURNS void AS $$
BEGIN
  -- 超过24小时无活动的房间标记（这里用 status 字段标记，或者可以用 soft delete）
  -- 由于 rooms 表没有 status 字段，这里只是示例，实际可以通过删除或添加标记字段
  -- DELETE FROM rooms WHERE last_activity_at < now() - interval '24 hours';
  RAISE NOTICE 'Room cleanup check completed. Rooms inactive for 24+ hours can be marked or deleted.';
END;
$$ LANGUAGE plpgsql;
