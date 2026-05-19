import { createClient } from '@supabase/supabase-js';
import { Database } from './types';

// 从环境变量读取 Supabase 配置（多重 fallback）
const getEnvVar = (key: string): string => {
  // 1. 优先使用 webpack DefinePlugin 注入的 process.env
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key] as string;
  }
  // 2. fallback 到 window.__ENV
  if (typeof window !== 'undefined' && (window as any).__ENV && (window as any).__ENV[key]) {
    return (window as any).__ENV[key];
  }
  // 3. 硬编码 fallback
  // 判断运行环境：openfaithhub.com 走 Vercel 代理加速，其他环境直连 Supabase
  const isVercelDeploy = typeof window !== 'undefined' && 
    (window.location.hostname === 'openfaithhub.com' || 
     window.location.hostname === 'www.openfaithhub.com' ||
     window.location.hostname === 'open-faith.vercel.app');
  
  if (key === 'SUPABASE_URL') {
    if (isVercelDeploy) {
      // Vercel 部署：走 /sb-api 代理（Cloudflare CDN 加速）
      return window.location.origin + '/sb-api';
    } else {
      // 扣子编程预览 / 本地开发：直连 Supabase（已配置跨域白名单）
      return 'https://rdhwmeittgdosmkxtpak.supabase.co';
    }
  }
  if (key === 'SUPABASE_ANON_KEY') {
    return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkaHdtZWl0dGdkb3Nta3h0cGFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxMzI0OTIsImV4cCI6MjA5MzcwODQ5Mn0.ID9gk1K754zT_Pbc2wO7tGvm7EGEzlHdpBxu8aD3Dlc';
  }
  return '';
};

const supabaseUrl = getEnvVar('SUPABASE_URL');
const supabaseAnonKey = getEnvVar('SUPABASE_ANON_KEY');

console.log('[Supabase] URL:', supabaseUrl ? supabaseUrl.substring(0, 50) + '...' : 'EMPTY');

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export type { Database };
