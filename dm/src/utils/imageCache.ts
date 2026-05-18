/**
 * 图片缓存服务
 * 用于缓存已加载的图片，减少重复网络请求
 */

interface CacheEntry {
  url: string;
  blob: string; // base64 data URL
  timestamp: number;
  size: number;
}

const MAX_CACHE_SIZE = 50; // 最多缓存 50 张图片
const CACHE_EXPIRY = 30 * 60 * 1000; // 30 分钟过期

class ImageCache {
  private cache: Map<string, CacheEntry> = new Map();
  private accessOrder: string[] = []; // LRU 顺序

  /**
   * 获取缓存的图片
   */
  get(url: string): string | null {
    const entry = this.cache.get(url);
    
    if (!entry) return null;
    
    // 检查是否过期
    if (Date.now() - entry.timestamp > CACHE_EXPIRY) {
      this.cache.delete(url);
      this.removeFromAccessOrder(url);
      return null;
    }
    
    // 更新访问顺序（LRU）
    this.removeFromAccessOrder(url);
    this.accessOrder.push(url);
    
    return entry.blob;
  }

  /**
   * 设置缓存
   */
  set(url: string, blob: string): void {
    // 如果已存在，更新
    if (this.cache.has(url)) {
      const entry = this.cache.get(url)!;
      entry.blob = blob;
      entry.timestamp = Date.now();
      this.removeFromAccessOrder(url);
      this.accessOrder.push(url);
      return;
    }
    
    // 检查缓存大小，必要时清除最旧的
    while (this.cache.size >= MAX_CACHE_SIZE) {
      const oldest = this.accessOrder.shift();
      if (oldest) {
        this.cache.delete(oldest);
      }
    }
    
    // 添加新条目
    this.cache.set(url, {
      url,
      blob,
      timestamp: Date.now(),
      size: blob.length,
    });
    this.accessOrder.push(url);
  }

  /**
   * 预加载图片
   */
  async preload(url: string): Promise<string | null> {
    // 先检查缓存
    const cached = this.get(url);
    if (cached) return cached;
    
    // 尝试加载
    try {
      const response = await fetch(url);
      if (!response.ok) return null;
      
      const blob = await response.blob();
      const reader = new FileReader();
      
      return new Promise((resolve) => {
        reader.onload = () => {
          const dataUrl = reader.result as string;
          this.set(url, dataUrl);
          resolve(dataUrl);
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  }

  /**
   * 批量预加载
   */
  async preloadAll(urls: string[]): Promise<void> {
    await Promise.all(urls.map(url => this.preload(url)));
  }

  /**
   * 清除指定 URL 的缓存
   */
  invalidate(url: string): void {
    this.cache.delete(url);
    this.removeFromAccessOrder(url);
  }

  /**
   * 清除所有缓存
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
  }

  /**
   * 获取缓存统计
   */
  getStats(): { count: number; size: number; oldest: number } {
    let totalSize = 0;
    let oldest = 0;
    
    this.cache.forEach(entry => {
      totalSize += entry.size;
      oldest = Math.max(oldest, entry.timestamp);
    });
    
    return {
      count: this.cache.size,
      size: Math.round(totalSize / 1024), // KB
      oldest: oldest ? Date.now() - oldest : 0,
    };
  }

  private removeFromAccessOrder(url: string): void {
    const index = this.accessOrder.indexOf(url);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }
}

// 全局单例
export const imageCache = new ImageCache();

// React Hook for image caching
import { useState, useEffect, useCallback } from 'react';

/**
 * 使用缓存的图片 hook
 */
export function useCachedImage(url: string | undefined): { src: string | null; loading: boolean; error: boolean } {
  const [src, setSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!url) {
      setSrc(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(false);

    // 检查缓存
    const cached = imageCache.get(url);
    if (cached) {
      if (!cancelled) {
        setSrc(cached);
        setLoading(false);
      }
      return;
    }

    // 加载图片
    imageCache.preload(url).then(loaded => {
      if (!cancelled) {
        if (loaded) {
          setSrc(loaded);
          setError(false);
        } else {
          setError(true);
        }
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [url]);

  return { src, loading, error };
}

/**
 * 预加载图片 hook
 */
export function usePreloadImages(urls: string[]): void {
  useEffect(() => {
    imageCache.preloadAll(urls);
  }, [urls.join(',')]); // eslint-disable-line
}
