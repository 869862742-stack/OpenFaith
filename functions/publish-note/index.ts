import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { title, content, cover_image, images, tags, user_id } = await req.json();

    if (!user_id) {
      throw new Error('用户未登录');
    }

    // 简单的敏感词校验（示例）
    const bannedWords = ['脏话', '广告', '色情'];
    const fullText = `${title} ${content}`;
    for (const word of bannedWords) {
      if (fullText.includes(word)) {
        throw new Error(`内容包含违规词汇: ${word}`);
      }
    }

    const { data, error } = await supabase
      .from('posts')
      .insert({
        user_id,
        title,
        content,
        cover_image,
        images: images || [],
        tags: tags || [],
        status: 'pending',
        likes: 0,
        comments: 0,
        view_count: 0,
        share_count: 0,
        hot_score: 0,
        is_ai_flagged: false,
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({ data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});