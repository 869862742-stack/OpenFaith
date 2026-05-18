/**
 * 统一 API 请求模块
 * 特性：
 * 1. 统一 token 管理（前台 user_token，后台 openfaith_admin_token）
 * 2. 自动 401/403/500 处理
 * 3. 请求重试机制
 * 4. 统一错误提示
 */

import { supabase } from '../supabase/client';

// 获取 SUPABASE_ANON_KEY（多重 fallback）
const getSupabaseAnonKey = (): string => {
  // 1. 优先使用 webpack DefinePlugin 注入的 process.env
  if (typeof process !== 'undefined' && process.env && process.env.SUPABASE_ANON_KEY) {
    return process.env.SUPABASE_ANON_KEY as string;
  }
  // 2. fallback 到 window.__ENV
  if (typeof window !== 'undefined' && (window as any).__ENV && (window as any).__ENV.SUPABASE_ANON_KEY) {
    return (window as any).__ENV.SUPABASE_ANON_KEY;
  }
  // 3. fallback 到 supabase 实例中的 key（运行时获取）
  return (supabase as any)._supabaseKey || '';
};

const SUPABASE_ANON_KEY = getSupabaseAnonKey();

// Token 存储 key
export const TOKEN_KEYS = {
  USER: 'user_token',
  ADMIN: 'openfaith_admin_token',
  AUTH: 'sb_auth',
} as const;

// API 基础 URL
// 使用 Cloudflare Worker 代理加速（走香港/日本节点）
const getBaseUrl = () => {
  // 浏览器环境使用代理路径
  if (typeof window !== 'undefined') {
    return '/sb-api/rest/v1';
  }
  // 服务端 fallback：使用代理地址
  return (process.env.SUPABASE_URL || 'https://openfaithhub.com/sb-api') + '/rest/v1';
};

// 生产环境使用 Cloudflare Worker 代理
const BASE_URL = '/sb-api/rest/v1';

// 超时时间（毫秒）
const TIMEOUT = 30000;

// 重试配置
const RETRY_CONFIG = {
  maxRetries: 2,
  retryDelay: 1000,
};

// 获取 token（根据路径判断）
async function getToken(isAdminPath: boolean = false): Promise<string | null> {
  console.log('[API] getToken called, isAdminPath:', isAdminPath);
  
  if (isAdminPath) {
    console.log('[API] getToken: admin path detected, checking ADMIN token...');
    const token = localStorage.getItem(TOKEN_KEYS.ADMIN);
    console.log('[API] getToken (admin):', token ? `found, length=${token.length}` : 'null');
    return token;
  }
  
  // 步骤1: 优先从 localStorage 获取 token（mock server 登录后存在这里）
  console.log('[API] getToken: step 1 - checking localStorage USER token...');
  const localToken = localStorage.getItem(TOKEN_KEYS.USER);
  console.log('[API] getToken: localStorage USER token:', localToken ? `found, length=${localToken.length}` : 'null');
  if (localToken) {
    console.log('[API] getToken: returning localStorage token');
    return localToken;
  }
  
  // 步骤2: 检查 localStorage AUTH 信息
  console.log('[API] getToken: step 2 - checking localStorage AUTH info...');
  const authInfo = localStorage.getItem(TOKEN_KEYS.AUTH);
  console.log('[API] getToken: localStorage AUTH:', authInfo ? `found, length=${authInfo.length}` : 'null');
  if (authInfo) {
    try {
      const parsed = JSON.parse(authInfo);
      if (parsed.session?.access_token) {
        console.log('[API] getToken: found token in AUTH session, returning it');
        return parsed.session.access_token;
      }
    } catch (e) {
      console.warn('[API] getToken: failed to parse AUTH info:', e);
    }
  }
  
  // 步骤3: fallback 到 Supabase auth session
  console.log('[API] getToken: step 3 - checking Supabase auth session...');
  try {
    const { data: { session } } = await supabase.auth.getSession();
    console.log('[API] getToken: Supabase session:', session ? 'found' : 'null');
    if (session?.access_token) {
      console.log('[API] getToken: found in Supabase session, returning it');
      return session.access_token;
    }
  } catch (e) {
    console.warn('[API] getToken: Supabase session error:', e);
  }
  
  // 步骤4: 列出所有 localStorage keys 用于调试
  console.log('[API] getToken: all localStorage keys:', Object.keys(localStorage));
  
  console.warn('[API] getToken: WARNING - no token found in any location');
  return null;
}

// 401 错误时跳转到登录页（不清除 localStorage，保留 token 供重新验证）
function clearUserTokenAndRedirect(): void {
  window.location.hash = '/login';
}

// 管理员 401 错误时跳转到登录页（不清除 localStorage）
function clearAdminTokenAndRedirect(): void {
  window.location.hash = '/admin/login';
}

// 错误类型
export interface ApiError {
  code: string;
  message: string;
  status?: number;
}

// 统一的错误处理
function handleApiError(error: ApiError, isAdminPath: boolean): never {
  switch (error.code) {
    case '401':
    case 'unauthorized':
      // 不再自动跳转登录页，只打印错误日志
      // 让调用方自行处理 401 错误
      console.warn('[API] 401 Unauthorized, not redirecting:', error.message);
      throw new Error('登录已过期，请重新登录');
    
    case '403':
    case 'forbidden':
      throw new Error(error.message || '您没有权限执行此操作');
    
    case '500':
    case 'internal_error':
      throw new Error('服务器错误，请稍后重试');
    
    case 'network':
      throw new Error('网络异常，请检查网络连接');
    
    case 'timeout':
      throw new Error('请求超时，请稍后重试');
    
    default:
      throw new Error(error.message || '请求失败，请稍后重试');
  }
}

// 带重试的请求
async function requestWithRetry<T>(
  url: string,
  options: RequestInit,
  retries: number = RETRY_CONFIG.maxRetries
): Promise<T> {
  try {
    const response = await fetch(url, options);
    
    // 如果是 401、403、500，不重试
    if ([401, 403, 500].includes(response.status)) {
      const data = await response.json().catch(() => ({}));
      const error: ApiError = {
        code: String(response.status),
        message: data.message || data.error?.message || `HTTP ${response.status}`,
        status: response.status,
      };
      throw error;
    }
    
    // 其他错误，检查是否可以重试
    if (!response.ok && retries > 0) {
      await new Promise(resolve => setTimeout(resolve, RETRY_CONFIG.retryDelay));
      return requestWithRetry(url, options, retries - 1);
    }
    
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      const error: ApiError = {
        code: String(response.status),
        message: data.message || data.error?.message || `HTTP ${response.status}`,
        status: response.status,
      };
      throw error;
    }
    
    // 检查响应体是否有内容，避免空响应体导致 JSON 解析失败
    const contentLength = response.headers.get('content-length');
    if (contentLength === '0') {
      return {} as T;
    }
    
    // 先读取文本，再判断是否为空
    const responseText = await response.text();
    if (!responseText || responseText.trim() === '') {
      return {} as T;
    }
    
    return JSON.parse(responseText);
  } catch (error: any) {
    // 网络错误，可以重试
    if (error.name === 'TypeError' && retries > 0) {
      await new Promise(resolve => setTimeout(resolve, RETRY_CONFIG.retryDelay));
      return requestWithRetry(url, options, retries - 1);
    }
    
    // 已经是处理过的错误
    if (error.code) {
      throw error;
    }
    
    // 其他错误
    const apiError: ApiError = {
      code: error.name === 'AbortError' ? 'timeout' : 'network',
      message: error.message || '网络异常',
    };
    throw apiError;
  }
}

// 判断是否是管理后台路径
function isAdminPath(url: string): boolean {
  return url.includes('/admin/') || url.includes('/rest/v1/admin') || url.includes('/functions/admin');
}

// 通用请求方法
async function request<T = any>(
  endpoint: string,
  options: RequestInit = {},
  config: {
    useRetry?: boolean;
    skipAuth?: boolean;
    isAdmin?: boolean;
  } = {}
): Promise<T> {
  const { useRetry = true, skipAuth = false, isAdmin: forceAdmin } = config;
  
  // 判断是否是管理后台请求
  const isAdmin = forceAdmin ?? isAdminPath(endpoint);
  
  // 获取 token
  const token = skipAuth ? null : await getToken(isAdmin);
  
  // 构建 headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON_KEY,
    ...(options.headers as Record<string, string> || {}),
  };
  
  // 添加 Authorization
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  // PATCH/PUT 请求添加 Prefer header，让 Supabase 返回更新后的数据
  const method = (options.method || 'GET').toUpperCase();
  if (method === 'PATCH' || method === 'PUT') {
    headers['Prefer'] = 'return=representation';
  }
  
  // 构建完整 URL
  const url = endpoint.startsWith('http')
    ? endpoint
    : `${BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  
  // 构建请求选项
  const fetchOptions: RequestInit = {
    ...options,
    headers,
    signal: options.signal || (() => {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), TIMEOUT);
      return controller.signal;
    })(),
  };
  
  // PATCH 请求详细日志
  if (method === 'PATCH') {
    console.log('[API] PATCH request details:');
    console.log('[API]   URL:', url);
    console.log('[API]   Headers:', {
      'Content-Type': headers['Content-Type'],
      'apikey': headers['apikey'] ? `${headers['apikey'].substring(0, 20)}...` : 'not set',
      'Authorization': headers['Authorization'] ? `${headers['Authorization'].substring(0, 30)}...` : 'not set',
      'Prefer': headers['Prefer'] || 'not set'
    });
    console.log('[API]   Body:', fetchOptions.body ? String(fetchOptions.body).substring(0, 500) : 'empty');
  }

  try {
    // 执行请求
    const result = useRetry
      ? await requestWithRetry<T>(url, fetchOptions)
      : await fetch(url, fetchOptions).then(r => r.json());
    
    console.log('[API] request result:', result);
    return result;
  } catch (error: any) {
    // 如果是已处理的错误
    if (error.code) {
      handleApiError(error, isAdmin);
    }
    throw error;
  }
}

// 导出便捷方法
export const api = {
  // GET 请求
  get: <T = any>(endpoint: string, options?: RequestInit) =>
    request<T>(endpoint, { ...options, method: 'GET' }),
  
  // POST 请求
  post: <T = any>(endpoint: string, data?: any, options?: RequestInit) =>
    request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),
  
  // PUT 请求
  put: <T = any>(endpoint: string, data?: any, options?: RequestInit) =>
    request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }),
  
  // PATCH 请求
  patch: <T = any>(endpoint: string, data?: any, options?: RequestInit) => {
    // 确保 body 正确处理：如果是字符串直接使用，否则 JSON.stringify
    let body: string | undefined;
    if (data !== undefined && data !== null) {
      if (typeof data === 'string') {
        body = data;
        console.log('[API] patch: body is string, length:', data.length);
      } else {
        body = JSON.stringify(data);
        console.log('[API] patch: body is object, JSON.stringify length:', body.length);
      }
    }
    console.log('[API] patch: request body:', body?.substring(0, 200) || 'empty');
    return request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body,
    });
  },
  
  // DELETE 请求
  delete: <T = any>(endpoint: string, options?: RequestInit) =>
    request<T>(endpoint, { ...options, method: 'DELETE' }),
  
  // 强制使用管理员 token
  admin: {
    get: <T = any>(endpoint: string, options?: RequestInit) =>
      request<T>(endpoint, { ...options, method: 'GET' }, { isAdmin: true }),
    post: <T = any>(endpoint: string, data?: any, options?: RequestInit) =>
      request<T>(endpoint, { ...options, method: 'POST', body: data ? JSON.stringify(data) : undefined }, { isAdmin: true }),
    patch: <T = any>(endpoint: string, data?: any, options?: RequestInit) =>
      request<T>(endpoint, { ...options, method: 'PATCH', body: data ? JSON.stringify(data) : undefined }, { isAdmin: true }),
    delete: <T = any>(endpoint: string, options?: RequestInit) =>
      request<T>(endpoint, { ...options, method: 'DELETE' }, { isAdmin: true }),
  },
};

// 默认导出
export default api;
