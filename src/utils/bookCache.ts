// 书籍缓存管理 - 用于提升加载速度和离线阅读

const CACHE_PREFIX = 'book_cache_';
const CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7天过期

interface CacheItem<T> {
  data: T;
  timestamp: number;
}

interface BookCache {
  book: any;
  chapters: any[];
}

interface GroupCache {
  books: any[];
  chapters: any[];
  lastUpdated: string;
}

// 保存到缓存
export const setCache = <T>(key: string, data: T): void => {
  try {
    const item: CacheItem<T> = {
      data,
      timestamp: Date.now()
    };
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(item));
  } catch (e) {
    console.warn('Cache save failed:', e);
  }
};

// 从缓存读取
export const getCache = <T>(key: string): T | null => {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    
    const item: CacheItem<T> = JSON.parse(raw);
    // 检查是否过期
    if (Date.now() - item.timestamp > CACHE_EXPIRY) {
      localStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }
    return item.data;
  } catch (e) {
    return null;
  }
};

// 保存书籍缓存
export const setBookCache = (bookId: string, book: any, chapters: any[]): void => {
  const cache: BookCache = { book, chapters };
  setCache(`book_${bookId}`, cache);
};

// 获取书籍缓存
export const getBookCache = (bookId: string): BookCache | null => {
  return getCache<BookCache>(`book_${bookId}`);
};

// 保存群组缓存（包含群组内所有书籍和章节）
export const setGroupCache = (groupId: string, books: any[], chapters: any[]): void => {
  const cache: GroupCache = { books, chapters, lastUpdated: new Date().toISOString() };
  setCache(`group_${groupId}`, cache);
};

// 获取群组缓存
export const getGroupCache = (groupId: string): GroupCache | null => {
  return getCache<GroupCache>(`group_${groupId}`);
};

// 保存下载的书籍（永久保存）
export const saveDownloadedBook = (bookId: string, book: any, chapters: any[]): void => {
  const downloads = getDownloads();
  downloads[bookId] = { book, chapters, downloadedAt: new Date().toISOString() };
  localStorage.setItem('downloaded_books', JSON.stringify(downloads));
};

// 获取已下载的书籍
export const getDownloadedBooks = (): Record<string, {book: any; chapters: any[]; downloadedAt: string}> => {
  try {
    const raw = localStorage.getItem('downloaded_books');
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
};

// 检查书籍是否已下载
export const isBookDownloaded = (bookId: string): boolean => {
  const downloads = getDownloadedBooks();
  return !!downloads[bookId];
};

// 删除已下载的书籍
export const removeDownloadedBook = (bookId: string): void => {
  const downloads = getDownloadedBooks();
  delete downloads[bookId];
  localStorage.setItem('downloaded_books', JSON.stringify(downloads));
};

// 获取所有下载（包括书籍和资源）
export const getDownloads = (): Record<string, any> => {
  try {
    const raw = localStorage.getItem('all_downloads');
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
};

// 保存下载资源（图片、视频等）
export const saveDownloadResource = (resourceId: string, data: any): void => {
  const downloads = getDownloads();
  downloads[`resource_${resourceId}`] = {
    ...data,
    type: data.type || 'resource',
    downloadedAt: new Date().toISOString()
  };
  localStorage.setItem('all_downloads', JSON.stringify(downloads));
};

// 获取下载大小
export const getDownloadSize = (): string => {
  try {
    const data = localStorage.getItem('all_downloads') || '';
    const bytes = new Blob([data]).size;
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  } catch (e) {
    return '0 B';
  }
};

// 清除所有缓存
export const clearAllCache = (): void => {
  const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_PREFIX));
  keys.forEach(k => localStorage.removeItem(k));
};

// 清除过期缓存
export const clearExpiredCache = (): void => {
  const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_PREFIX));
  keys.forEach(key => {
    const raw = localStorage.getItem(key);
    if (raw) {
      try {
        const item = JSON.parse(raw);
        if (Date.now() - item.timestamp > CACHE_EXPIRY) {
          localStorage.removeItem(key);
        }
      } catch (e) {}
    }
  });
};

export default {
  setCache,
  getCache,
  setBookCache,
  getBookCache,
  setGroupCache,
  getGroupCache,
  saveDownloadedBook,
  getDownloadedBooks,
  isBookDownloaded,
  removeDownloadedBook,
  saveDownloadResource,
  getDownloads,
  getDownloadSize,
  clearAllCache,
  clearExpiredCache
};
