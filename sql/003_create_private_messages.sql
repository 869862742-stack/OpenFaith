-- Migration: Create private_messages table for user-to-user chat
-- Run this SQL in Supabase Dashboard -> SQL Editor
-- Date: 2026-01-16

-- 1. Create private_messages table
CREATE TABLE IF NOT EXISTS private_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'system')),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_private_messages_sender ON private_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_private_messages_receiver ON private_messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_private_messages_conversation ON private_messages(
  LEAST(sender_id, receiver_id), 
  GREATEST(sender_id, receiver_id), 
  created_at DESC
);

-- 3. Enable Row Level Security
ALTER TABLE private_messages ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
-- Allow users to view their own messages (sent or received)
CREATE POLICY "Users can view their own private messages" ON private_messages
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Allow users to insert messages they send
CREATE POLICY "Users can send private messages" ON private_messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Allow users to update received messages (mark as read)
CREATE POLICY "Users can update received messages" ON private_messages
  FOR UPDATE USING (auth.uid() = receiver_id);

-- Allow users to delete their own sent messages
CREATE POLICY "Users can delete their own messages" ON private_messages
  FOR DELETE USING (auth.uid() = sender_id);

-- 5. Add check constraint to prevent self-messaging
ALTER TABLE private_messages ADD CONSTRAINT no_self_message 
  CHECK (sender_id != receiver_id);
