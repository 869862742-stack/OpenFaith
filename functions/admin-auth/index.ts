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
    const { username, password } = await req.json();

    if (!username || !password) {
      return new Response(
        JSON.stringify({ error: '用户名和密码不能为空' }),
        { status: 400, headers: corsHeaders }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    let admin = null;

    const { data: adminByUsername, error: usernameError } = await supabaseAdmin
      .from('admins')
      .select('*')
      .eq('username', username)
      .eq('is_active', true)
      .maybeSingle();

    if (adminByUsername) {
      admin = adminByUsername;
    } else {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id, username')
        .eq('email', username)
        .maybeSingle();

      if (profile) {
        const { data: adminByUserId } = await supabaseAdmin
          .from('admins')
          .select('*')
          .eq('user_id', profile.id)
          .eq('is_active', true)
          .maybeSingle();

        if (adminByUserId) {
          admin = adminByUserId;
        }
      }
    }

    if (!admin) {
      return new Response(
        JSON.stringify({ error: '用户名或密码错误' }),
        { status: 401, headers: corsHeaders }
      );
    }

    if (admin.password_hash.startsWith('$2')) {
      const bcrypt = await import('https://deno.land/x/bcrypt@v0.4.1/mod.ts');
      const isValid = await bcrypt.compare(password, admin.password_hash);
      if (!isValid) {
        return new Response(
          JSON.stringify({ error: '用户名或密码错误' }),
          { status: 401, headers: corsHeaders }
        );
      }
    } else {
      const crypto = await import('https://deno.land/std@0.208.0/crypto/mod.ts');
      const encoder = new TextEncoder();
      const data = encoder.encode(password + (admin.salt || ''));
      const hashBuffer = await crypto.crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      if (passwordHash !== admin.password_hash) {
        return new Response(
          JSON.stringify({ error: '用户名或密码错误' }),
          { status: 401, headers: corsHeaders }
        );
      }
    }

    await supabaseAdmin
      .from('admins')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', admin.id);

    const { data: adminWithRoles, error: rolesError } = await supabaseAdmin
      .from('admins')
      .select(`
        *,
        admin_roles(
          roles(*)
        )
      `)
      .eq('id', admin.id)
      .single();

    if (rolesError) {
      console.error('获取角色失败:', rolesError);
    }

    const roles = adminWithRoles?.admin_roles?.map((ar: any) => ar.roles?.name).filter(Boolean) || [];

    const tokenData = {
      admin_id: admin.id,
      username: admin.username,
      roles: roles,
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60),
    };

    return new Response(
      JSON.stringify({
        success: true,
        token: btoa(JSON.stringify(tokenData)),
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
    console.error('Admin auth error:', error);
    return new Response(
      JSON.stringify({ error: '服务器内部错误' }),
      { status: 500, headers: corsHeaders }
    );
  }
});
