import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: '未提供认证信息' }),
        { status: 401, headers: corsHeaders }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    let tokenData;
    try {
      tokenData = JSON.parse(atob(token));
    } catch {
      return new Response(
        JSON.stringify({ error: '无效的认证令牌' }),
        { status: 401, headers: corsHeaders }
      );
    }

    if (tokenData.exp && tokenData.exp < Math.floor(Date.now() / 1000)) {
      return new Response(
        JSON.stringify({ error: '认证令牌已过期' }),
        { status: 401, headers: corsHeaders }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: admin, error } = await supabaseAdmin
      .from('admins')
      .select('*')
      .eq('id', tokenData.admin_id)
      .eq('is_active', true)
      .single();

    if (error || !admin) {
      return new Response(
        JSON.stringify({ error: '管理员账号不存在或已被禁用' }),
        { status: 401, headers: corsHeaders }
      );
    }

    const { data: adminWithRoles } = await supabaseAdmin
      .from('admins')
      .select(`
        *,
        admin_roles(
          roles(*)
        )
      `)
      .eq('id', admin.id)
      .single();

    const roles = adminWithRoles?.admin_roles?.map((ar: any) => ar.roles?.name).filter(Boolean) || [];

    return new Response(
      JSON.stringify({
        valid: true,
        admin: {
          id: admin.id,
          username: admin.username,
          nickname: admin.nickname,
          avatar_url: admin.avatar_url,
          roles: roles,
        },
      }),
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('Admin verify error:', error);
    return new Response(
      JSON.stringify({ error: '服务器内部错误' }),
      { status: 500, headers: corsHeaders }
    );
  }
});
