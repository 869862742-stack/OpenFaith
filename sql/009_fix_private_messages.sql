-- Migration: Fix private_messages message_type constraint
-- Run this SQL in Supabase Dashboard -> SQL Editor
-- Date: 2026-01-20

-- 扩展 message_type 以支持 voice 和 faith_bubble 等类型
-- 原有约束只允许 ('text', 'image', 'system')，但代码会发送 'voice', 'faith_bubble', 'note_share', 'scripture_share' 等类型

ALTER TABLE private_messages DROP CONSTRAINT IF EXISTS private_messages_message_type_check;
ALTER TABLE private_messages ADD CONSTRAINT private_messages_message_type_check 
  CHECK (message_type IN ('text', 'image', 'system', 'voice', 'faith_bubble', 'note_share', 'scripture_share'));

-- 验证修改
SELECT 'message_type constraint updated successfully' AS status;
