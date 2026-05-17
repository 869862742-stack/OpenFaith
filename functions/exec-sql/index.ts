// 添加地区字段到 profiles 表的 Edge Function
// 部署后调用: POST /functions/v1/exec-sql
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // 添加 continent 字段
    await supabaseAdmin.rpc('exec', {
      sql: 'ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS continent TEXT DEFAULT \'Unknown\'',
    }).catch(() => {
      // 字段可能已存在，忽略错误
    });

    // 添加 country 字段
    await supabaseAdmin.rpc('exec', {
      sql: 'ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country TEXT DEFAULT \'Unknown\'',
    }).catch(() => {
      // 字段可能已存在，忽略错误
    });

    // 添加 region 字段
    await supabaseAdmin.rpc('exec', {
      sql: 'ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS region TEXT DEFAULT \'Unknown\'',
    }).catch(() => {
      // 字段可能已存在，忽略错误
    });

    return new Response(
      JSON.stringify({ success: true, message: 'Location fields added successfully' }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});
