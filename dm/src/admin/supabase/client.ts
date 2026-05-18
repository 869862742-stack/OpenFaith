import { createClient } from '@supabase/supabase-js';
import { Database } from './types';

// 真实 Supabase 后端配置
// 使用 Cloudflare Worker 代理加速（走香港/日本节点）
const supabaseUrl = process.env.SUPABASE_URL || (typeof window !== 'undefined' ? window.location.origin + '/sb-api' : 'https://openfaithhub.com/sb-api');
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkaHdtZWl0dGdkb3Nta3h0cGFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxMzI0OTIsImV4cCI6MjA5MzcwODQ5Mn0.ID9gk1K754zT_Pbc2wO7tGvm7EGEzlHdpBxu8aD3Dlc';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
});

export function getSupabaseUrl() {
  return supabaseUrl;
}

export function getSupabaseAnonKey() {
  return supabaseAnonKey;
}
