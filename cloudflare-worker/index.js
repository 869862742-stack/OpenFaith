/**
 * Cloudflare Worker - Supabase API Proxy
 * 用于加速中国用户访问 Supabase API
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // 去掉 /sb-api 前缀，转发到 Supabase
    const supabaseUrl = 'https://rdhwmeittgdosmkxtpak.supabase.co' + url.pathname.replace('/sb-api', '') + url.search;
    
    // 处理 OPTIONS 预检请求
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': '*',
          'Access-Control-Max-Age': '86400',
        },
      });
    }
    
    // 创建新的请求，转发到 Supabase
    const newRequest = new Request(supabaseUrl, {
      method: request.method,
      headers: request.headers,
      body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
    });
    
    try {
      const response = await fetch(newRequest);
      
      // 创建新的响应，添加 CORS 头
      const newResponse = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
      
      // 添加 CORS 头
      newResponse.headers.set('Access-Control-Allow-Origin', '*');
      newResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      newResponse.headers.set('Access-Control-Allow-Headers', '*');
      
      // 对 GET 请求添加缓存头（缓存60秒）
      if (request.method === 'GET') {
        newResponse.headers.set('Cache-Control', 's-maxage=60, stale-while-revalidate=30');
      }
      
      return newResponse;
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Proxy error', message: error.message }), {
        status: 502,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
  },
};
