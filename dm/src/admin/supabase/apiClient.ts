// 后台管理 API 客户端 - 使用 server.js REST API
// 确保在 Coze 预览环境下能正常访问

import { Database } from './types';

type Book = Database['public']['Tables']['books']['Row'];
type Chapter = Database['public']['Tables']['chapters']['Row'];
type Religion = Database['public']['Tables']['religions']['Row'];
type Tag = Database['public']['Tables']['tags']['Row'];

// API 基础路径
const API_BASE = '';

// 获取认证 token
function getAuthToken(): string | null {
  // 从 localStorage 获取认证信息
  const auth = localStorage.getItem('openfaith_auth');
  if (auth) {
    try {
      const authData = JSON.parse(auth);
      return authData.token || authData.session?.token;
    } catch {
      return null;
    }
  }
  return null;
}

// 通用请求函数
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkaHdtZWl0dGdkb3Nta3h0cGFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxMzI0OTIsImV4cCI6MjA5MzcwODQ5Mn0.ID9gk1K754zT_Pbc2wO7tGvm7EGEzlHdpBxu8aD3Dlc',
    ...(options.headers as Record<string, string> || {}),
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}/sb-api/rest/v1/${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }

  // 处理 DELETE 请求（无内容返回）
  if (response.status === 204 || options.method === 'DELETE') {
    return {} as T;
  }

  return response.json();
}

// Books API
export const booksApi = {
  async getAll(): Promise<Book[]> {
    const data = await apiRequest<any[]>('books?select=*&order=created_at.desc');
    return data || [];
  },

  async getById(id: string): Promise<Book | null> {
    try {
      const data = await apiRequest<any[]>(`books?id=eq.${id}&select=*`);
      return data?.[0] || null;
    } catch {
      return null;
    }
  },

  async create(book: Partial<Book>): Promise<Book> {
    return apiRequest<any>('books', {
      method: 'POST',
      body: JSON.stringify([book]),
    }).then(result => result[0]);
  },

  async update(id: string, updates: Partial<Book>): Promise<Book> {
    return apiRequest<any>(`books?id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  async delete(id: string): Promise<void> {
    await apiRequest(`books?id=eq.${id}`, { method: 'DELETE' });
  },

  async search(term: string): Promise<Book[]> {
    return apiRequest<any[]>(`books?or=(title.ilike.%25${term}%25,description.ilike.%25${term}%25)`);
  },
};

// Chapters API
export const chaptersApi = {
  async getAll(): Promise<Chapter[]> {
    const data = await apiRequest<any[]>('chapters?select=*&order=number.asc');
    return data || [];
  },

  async getByBookId(bookId: string): Promise<Chapter[]> {
    const data = await apiRequest<any[]>(`chapters?book_id=eq.${bookId}&select=*&order=number.asc`);
    return data || [];
  },

  async create(chapter: Partial<Chapter>): Promise<Chapter> {
    return apiRequest<any>('chapters', {
      method: 'POST',
      body: JSON.stringify([chapter]),
    }).then(result => result[0]);
  },

  async update(id: string, updates: Partial<Chapter>): Promise<Chapter> {
    return apiRequest<any>(`chapters?id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  async delete(id: string): Promise<void> {
    await apiRequest(`chapters?id=eq.${id}`, { method: 'DELETE' });
  },

  async bulkDelete(bookId: string): Promise<void> {
    await apiRequest(`chapters?book_id=eq.${bookId}`, { method: 'DELETE' });
  },
};

// Religions API
export const religionsApi = {
  async getAll(): Promise<Religion[]> {
    const data = await apiRequest<any[]>('religions?select=*&order=name.asc');
    return data || [];
  },

  async getActive(): Promise<Religion[]> {
    const data = await apiRequest<any[]>('religions?is_active=eq.true&select=*&order=name.asc');
    return data || [];
  },

  async getById(id: string): Promise<Religion | null> {
    try {
      const data = await apiRequest<any[]>(`religions?id=eq.${id}&select=*`);
      return data?.[0] || null;
    } catch {
      return null;
    }
  },

  async create(religion: Partial<Religion>): Promise<Religion> {
    return apiRequest<any>('religions', {
      method: 'POST',
      body: JSON.stringify([religion]),
    }).then(result => result[0]);
  },

  async update(id: string, updates: Partial<Religion>): Promise<Religion> {
    return apiRequest<any>(`religions?id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  async delete(id: string): Promise<void> {
    await apiRequest(`religions?id=eq.${id}`, { method: 'DELETE' });
  },
};

// Tags API
export const tagsApi = {
  async getAll(): Promise<Tag[]> {
    const data = await apiRequest<any[]>('tags?select=*&order=count.desc');
    return data || [];
  },

  async create(tag: Partial<Tag>): Promise<Tag> {
    return apiRequest<any>('tags', {
      method: 'POST',
      body: JSON.stringify([tag]),
    }).then(result => result[0]);
  },

  async update(id: string, updates: Partial<Tag>): Promise<Tag> {
    return apiRequest<any>(`tags?id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  async delete(id: string): Promise<void> {
    await apiRequest(`tags?id=eq.${id}`, { method: 'DELETE' });
  },
};

// 导出类型
export type { Database, Book, Chapter, Religion, Tag };
