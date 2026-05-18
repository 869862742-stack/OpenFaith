/**
 * API 缓存工具 - 减少重复请求，加速页面加载
 * 支持内存缓存 + 请求去重
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

interface PendingRequest {
  promise: Promise<any>;
  timestamp: number;
}

// 内存缓存存储
const memoryCache = new Map<string, CacheEntry<any>>();

// 进行中的请求（用于去重）
const pendingRequests = new Map<string, PendingRequest>();

// 缓存默认过期时间（毫秒）
const DEFAULT_TTL = 60 * 1000; // 60秒

// Profiles 缓存 TTL（5分钟，适合用户信息）
const PROFILES_TTL = 5 * 60 * 1000; // 300秒

// Posts 列表缓存 TTL
const POSTS_TTL = 60 * 1000; // 60秒

// Comments 缓存 TTL（评论变化较频繁）
const COMMENTS_TTL = 30 * 1000; // 30秒

/**
 * 生成缓存 key
 */
function generateCacheKey(url: string, params?: Record<string, any>): string {
  if (!params) return url;
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((acc, key) => {
      acc[key] = params[key];
      return acc;
    }, {} as Record<string, any>);
  return `${url}?${JSON.stringify(sortedParams)}`;
}

/**
 * 检查缓存是否过期
 */
function isExpired(entry: CacheEntry<any>, ttl: number): boolean {
  return Date.now() - entry.timestamp > ttl;
}

/**
 * 获取缓存数据
 * @param url 请求 URL
 * @param params 可选的额外参数
 * @param customTtl 可选的缓存过期时间（毫秒），如果不传则使用 DEFAULT_TTL
 */
export function getCache<T>(url: string, params?: Record<string, any>, customTtl?: number): T | null {
  const key = generateCacheKey(url, params);
  const entry = memoryCache.get(key);
  const ttl = customTtl ?? DEFAULT_TTL;
  
  if (!entry) return null;
  if (isExpired(entry, ttl)) {
    memoryCache.delete(key);
    return null;
  }
  
  return entry.data as T;
}

/**
 * 设置缓存数据
 */
export function setCache<T>(url: string, data: T, params?: Record<string, any>): void {
  const key = generateCacheKey(url, params);
  memoryCache.set(key, {
    data,
    timestamp: Date.now()
  });
}

/**
 * 清除指定 URL 的缓存
 */
export function clearCache(url?: string, params?: Record<string, any>): void {
  if (!url) {
    memoryCache.clear();
    return;
  }
  
  const key = generateCacheKey(url, params);
  memoryCache.delete(key);
}

/**
 * 清除所有过期缓存（建议定期调用）
 */
export function clearExpiredCache(): void {
  for (const [key, entry] of memoryCache.entries()) {
    if (isExpired(entry, DEFAULT_TTL)) {
      memoryCache.delete(key);
    }
  }
}

/**
 * 清除所有进行中的请求
 */
export function clearPendingRequests(): void {
  pendingRequests.clear();
}

/**
 * 带缓存的 fetch 请求
 * @param url 请求 URL
 * @param options fetch 选项
 * @param params 可选的参数：
 *   - ttl: 缓存过期时间（毫秒）
 *   - skipCache: 是否跳过缓存
 *   - params: 用于生成缓存 key 的额外参数
 */
export async function cachedFetch<T = any>(
  url: string,
  options: RequestInit = {},
  params?: {
    ttl?: number;
    skipCache?: boolean;
    params?: Record<string, any>;
  }
): Promise<T> {
  const cacheKey = generateCacheKey(url, params?.params);
  const customTtl = params?.ttl;
  
  // 1. 检查缓存（除非明确跳过）
  if (!params?.skipCache) {
    const cached = getCache<T>(url, params?.params, customTtl);
    if (cached !== null) {
      console.log(`[apiCache] Cache hit: ${url}`);
      return cached;
    }
  }
  
  // 2. 检查是否有相同请求正在进行（去重）
  const pending = pendingRequests.get(cacheKey);
  if (pending && !params?.skipCache) {
    console.log(`[apiCache] Request deduplicated: ${url}`);
    return pending.promise;
  }
  
  // 3. 发起新请求
  console.log(`[apiCache] Fetching: ${url}`);
  const promise = fetch(url, options)
    .then(async (res) => {
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      return res.json();
    })
    .then((data) => {
      // 保存到缓存（存储时会带上 ttl 信息）
      setCache(url, data, params?.params);
      // 移除 pending 状态
      pendingRequests.delete(cacheKey);
      return data;
    })
    .catch((error) => {
      // 移除 pending 状态
      pendingRequests.delete(cacheKey);
      throw error;
    });
  
  // 标记为进行中
  pendingRequests.set(cacheKey, {
    promise,
    timestamp: Date.now()
  });
  
  return promise;
}

/**
 * 构建带缓存的 API 请求工具
 * 专门针对 /sb-api/rest/v1/ 请求
 */
export function createCachedApiClient(baseHeaders: Record<string, string>) {
  return {
    /**
     * GET 请求（自动缓存）
     */
    async get<T = any>(
      endpoint: string,
      options?: {
        ttl?: number;
        skipCache?: boolean;
      }
    ): Promise<T> {
      const url = `/sb-api/rest/v1/${endpoint.replace(/^\//, '')}`;
      return cachedFetch<T>(url, { headers: baseHeaders }, options);
    },
    
    /**
     * POST 请求（不缓存）
     */
    async post<T = any>(endpoint: string, body: any): Promise<T> {
      const url = `/sb-api/rest/v1/${endpoint.replace(/^\//, '')}`;
      return fetch(url, {
        method: 'POST',
        headers: {
          ...baseHeaders,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      }).then(res => res.json());
    },
    
    /**
     * PATCH 请求（不缓存）
     */
    async patch<T = any>(endpoint: string, body: any): Promise<T> {
      const url = `/sb-api/rest/v1/${endpoint.replace(/^\//, '')}`;
      return fetch(url, {
        method: 'PATCH',
        headers: {
          ...baseHeaders,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      }).then(res => res.json());
    },
    
    /**
     * DELETE 请求（不缓存）
     */
    async delete<T = any>(endpoint: string): Promise<T> {
      const url = `/sb-api/rest/v1/${endpoint.replace(/^\//, '')}`;
      return fetch(url, {
        method: 'DELETE',
        headers: baseHeaders
      }).then(res => res.json());
    }
  };
}

// 定期清理过期缓存（每5分钟）
if (typeof window !== 'undefined') {
  setInterval(clearExpiredCache, 5 * 60 * 1000);
}

// 清理超时的 pending 请求（超过60秒的）
setInterval(() => {
  const now = Date.now();
  for (const [key, pending] of pendingRequests.entries()) {
    if (now - pending.timestamp > 60000) {
      pendingRequests.delete(key);
    }
  }
}, 60000);
