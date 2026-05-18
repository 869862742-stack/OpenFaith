// Mock Database Layer - 在 Coze 预览环境下替代 Supabase
// 数据存储在 localStorage 中，页面刷新后数据保留

import { Database } from './types';

// 数据类型定义
type Tables = Database['public']['Tables'];

// 存储键名
const STORAGE_KEYS = {
  profiles: 'openfaith_profiles',
  books: 'openfaith_books',
  chapters: 'openfaith_chapters',
  notes: 'openfaith_notes',
  tags: 'openfaith_tags',
  religions: 'openfaith_religions',
  auth: 'openfaith_auth',  // 当前登录用户
};

// 初始化默认管理员
function initDefaultAdmin() {
  const profiles = JSON.parse(localStorage.getItem(STORAGE_KEYS.profiles) || '[]');
  const hasAdmin = profiles.some((p: any) => p.role === 'super_admin');
  
  if (!hasAdmin) {
    const adminId = 'admin_' + Date.now().toString(36);
    const adminProfile = {
      id: adminId,
      username: 'admin',
      email: '869862742@qq.com',
      nickname: '超级管理员',
      avatar: '',
      background: '',
      bio: '系统超级管理员',
      role: 'super_admin',
      is_vip: false,
      theme_mode: 'light',
      theme_color: 'default',
      font_size: 'standard',
      created_at: new Date().toISOString(),
    };
    profiles.push(adminProfile);
    localStorage.setItem(STORAGE_KEYS.profiles, JSON.stringify(profiles));
  }
}

// 初始化默认数据
function initDefaultData() {
  initDefaultAdmin();
  // 初始化藏书
  if (!localStorage.getItem(STORAGE_KEYS.books)) {
    const defaultBooks = [
      { id: 'book1', title: '创世记', religion: '基督教', category: '旧约', description: '摩西五经第一卷', status: 'published', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'book2', title: '出埃及记', religion: '基督教', category: '旧约', description: '摩西五经第二卷', status: 'published', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'book3', title: '利未记', religion: '基督教', category: '旧约', description: '摩西五经第三卷', status: 'published', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'book4', title: '民数记', religion: '基督教', category: '旧约', description: '摩西五经第四卷', status: 'published', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'book5', title: '申命记', religion: '基督教', category: '旧约', description: '摩西五经第五卷', status: 'published', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    ];
    localStorage.setItem(STORAGE_KEYS.books, JSON.stringify(defaultBooks));
  }

  // 初始化藏书章节
  if (!localStorage.getItem(STORAGE_KEYS.chapters)) {
    const defaultChapters = [
      { id: 'ch1', book_id: 'book1', number: 1, title: '起初', content: '起初，神创造天地...', volume: '1', status: 'published', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'ch2', book_id: 'book1', number: 2, title: '创造', content: '神说，要有光...', volume: '1', status: 'published', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    ];
    localStorage.setItem(STORAGE_KEYS.chapters, JSON.stringify(defaultChapters));
  }

  // 初始化标签
  if (!localStorage.getItem(STORAGE_KEYS.tags)) {
    const defaultTags = [
      { id: 'tag1', name: '基督教', color: '#3498db', count: 10, created_at: new Date().toISOString() },
      { id: 'tag2', name: '伊斯兰教', color: '#2ecc71', count: 8, created_at: new Date().toISOString() },
      { id: 'tag3', name: '佛教', color: '#f39c12', count: 12, created_at: new Date().toISOString() },
    ];
    localStorage.setItem(STORAGE_KEYS.tags, JSON.stringify(defaultTags));
  }

  // 初始化信仰百科
  if (!localStorage.getItem(STORAGE_KEYS.religions)) {
    const defaultReligions = [
      { id: 'rel1', name: '基督教', type: '一神教', origin_place: '中东', origin_time: '公元1世纪', distribution: '全球', followers_scale: '24亿', core_belief: '相信耶稣基督为救主', introduction: '基督教是世界最大的宗教之一...', history: '基督教起源于公元1世纪的巴勒斯坦地区...', doctrines: '三位一体、原罪、救赎', classics: '圣经', festivals: '圣诞节、复活节', rituals: '洗礼、圣餐', taboos: '偶像崇拜', sacred_sites: '耶路撒冷、梵蒂冈', famous_figures: '耶稣、保罗', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'rel2', name: '伊斯兰教', type: '一神教', origin_place: '沙特阿拉伯', origin_time: '公元7世纪', distribution: '全球', followers_scale: '19亿', core_belief: '信奉安拉为唯一真神', introduction: '伊斯兰教是世界第二大宗教...', history: '伊斯兰教由穆罕默德在公元7世纪创立...', doctrines: '六大信条、五功', classics: '古兰经', festivals: '开斋节、宰牲节', rituals: '五功', taboos: '猪肉、酒精', sacred_sites: '麦加、麦地那', famous_figures: '穆罕默德', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'rel3', name: '佛教', type: '多神教/无神论', origin_place: '古印度', origin_time: '公元前6世纪', distribution: '亚洲为主', followers_scale: '5亿', core_belief: '解脱苦难、涅槃', introduction: '佛教是世界主要宗教之一...', history: '佛教由乔达摩·悉达多在公元前6世纪创立...', doctrines: '四谛、八正道、十二因缘', classics: '佛经', festivals: '佛诞节、盂兰盆节', rituals: '打坐、念经', taboos: '杀生', sacred_sites: '菩提伽耶、蓝毗尼', famous_figures: '释迦牟尼', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    ];
    localStorage.setItem(STORAGE_KEYS.religions, JSON.stringify(defaultReligions));
  }
}

// 初始化
initDefaultData();

// Mock Supabase Client
export class MockSupabaseClient {
  private storage: typeof STORAGE_KEYS;

  constructor() {
    this.storage = STORAGE_KEYS;
  }

  // 获取管理员列表
  getAdmins() {
    const profiles = this.getData('profiles');
    return profiles.filter((p: any) => p.role === 'super_admin' || p.role === 'admin');
  }

  // 登录验证
  async login(username: string, password: string): Promise<{ success: boolean; user?: any; error?: string }> {
    // 管理员账号验证（不区分大小写）
    const admins = this.getAdmins();
    const admin = admins.find((a: any) => 
      (a.email?.toLowerCase() === username.toLowerCase() || a.username?.toLowerCase() === username.toLowerCase())
    );
    
    if (!admin) {
      return { success: false, error: '管理员不存在' };
    }
    
    // 简化的密码验证（实际应用中应使用更安全的方式）
    if (password.length < 6) {
      return { success: false, error: '密码错误' };
    }
    
    // 生成 token
    const token = btoa(JSON.stringify({
      sub: admin.id,
      admin_id: admin.role === 'super_admin' ? `super-${admin.id}` : admin.id,
      email: admin.email,
      username: admin.username,
      roles: [admin.role],
      exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7天有效期
    }));
    
    // 保存登录状态
    localStorage.setItem(this.storage.auth, JSON.stringify({
      user: admin,
      token,
      loginAt: new Date().toISOString(),
    }));
    
    return { success: true, user: admin };
  }

  // 获取当前登录用户
  getCurrentUser() {
    const auth = localStorage.getItem(this.storage.auth);
    if (!auth) return null;
    const data = JSON.parse(auth);
    // 检查 token 是否过期
    if (data.token) {
      try {
        const payload = JSON.parse(atob(data.token));
        if (payload.exp < Date.now()) {
          localStorage.removeItem(this.storage.auth);
          return null;
        }
      } catch (e) {}
    }
    return data.user;
  }

  // 登出
  logout() {
    localStorage.removeItem(this.storage.auth);
  }

  // 获取数据
  private getData<T>(key: keyof typeof STORAGE_KEYS): T[] {
    const data = localStorage.getItem(this.storage[key]);
    return data ? JSON.parse(data) : [];
  }

  // 保存数据
  private saveData<T>(key: keyof typeof STORAGE_KEYS, data: T[]) {
    localStorage.setItem(this.storage[key], JSON.stringify(data));
  }

  // 生成 ID
  private generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  // ========== 藏书管理 ==========
  async getBooks(): Promise<Tables['books']['Row'][]> {
    return this.getData<Tables['books']['Row']>('books');
  }

  async createBook(book: Omit<Tables['books']['Row'], 'id' | 'created_at' | 'updated_at'>): Promise<Tables['books']['Row']> {
    const books = this.getData<Tables['books']['Row']>('books');
    const newBook: Tables['books']['Row'] = {
      ...book,
      id: this.generateId(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    books.push(newBook);
    this.saveData('books', books);
    return newBook;
  }

  async updateBook(id: string, updates: Partial<Tables['books']['Row']>): Promise<Tables['books']['Row'] | null> {
    const books = this.getData<Tables['books']['Row']>('books');
    const index = books.findIndex(b => b.id === id);
    if (index === -1) return null;
    books[index] = { ...books[index], ...updates, updated_at: new Date().toISOString() };
    this.saveData('books', books);
    return books[index];
  }

  async deleteBook(id: string): Promise<boolean> {
    const books = this.getData<Tables['books']['Row']>('books');
    const filtered = books.filter(b => b.id !== id);
    if (filtered.length === books.length) return false;
    this.saveData('books', filtered);
    return true;
  }

  async mergeBooks(sourceIds: string[], targetId: string): Promise<Tables['books']['Row'] | null> {
    // 合并藏书：将源藏书的内容合并到目标藏书，然后删除源藏书
    const chapters = this.getData<Tables['chapters']['Row']>('chapters');
    const books = this.getData<Tables['books']['Row']>('books');
    
    // 更新源藏书的章节，指向目标藏书
    const updatedChapters = chapters.map(ch => {
      if (sourceIds.includes(ch.book_id)) {
        return { ...ch, book_id: targetId, updated_at: new Date().toISOString() };
      }
      return ch;
    });
    this.saveData('chapters', updatedChapters);
    
    // 删除源藏书
    const remainingBooks = books.filter(b => !sourceIds.includes(b.id));
    this.saveData('books', remainingBooks);
    
    // 返回更新后的目标藏书
    return remainingBooks.find(b => b.id === targetId) || null;
  }

  // ========== 藏书章节 ==========
  async getChapters(bookId?: string): Promise<Tables['chapters']['Row'][]> {
    const chapters = this.getData<Tables['chapters']['Row']>('chapters');
    if (bookId) {
      return chapters.filter(ch => ch.book_id === bookId);
    }
    return chapters;
  }

  async createChapter(chapter: Omit<Tables['chapters']['Row'], 'id' | 'created_at' | 'updated_at'>): Promise<Tables['chapters']['Row']> {
    const chapters = this.getData<Tables['chapters']['Row']>('chapters');
    const newChapter: Tables['chapters']['Row'] = {
      ...chapter,
      id: this.generateId(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    chapters.push(newChapter);
    this.saveData('chapters', chapters);
    return newChapter;
  }

  async updateChapter(id: string, updates: Partial<Tables['chapters']['Row']>): Promise<Tables['chapters']['Row'] | null> {
    const chapters = this.getData<Tables['chapters']['Row']>('chapters');
    const index = chapters.findIndex(ch => ch.id === id);
    if (index === -1) return null;
    chapters[index] = { ...chapters[index], ...updates, updated_at: new Date().toISOString() };
    this.saveData('chapters', chapters);
    return chapters[index];
  }

  async deleteChapter(id: string): Promise<boolean> {
    const chapters = this.getData<Tables['chapters']['Row']>('chapters');
    const filtered = chapters.filter(ch => ch.id !== id);
    if (filtered.length === chapters.length) return false;
    this.saveData('chapters', filtered);
    return true;
  }

  // ========== 标签管理 ==========
  async getTags(): Promise<Tables['tags']['Row'][]> {
    return this.getData<Tables['tags']['Row']>('tags');
  }

  async createTag(tag: Omit<Tables['tags']['Row'], 'id' | 'created_at'>): Promise<Tables['tags']['Row']> {
    const tags = this.getData<Tables['tags']['Row']>('tags');
    const newTag: Tables['tags']['Row'] = {
      ...tag,
      id: this.generateId(),
      created_at: new Date().toISOString(),
    };
    tags.push(newTag);
    this.saveData('tags', tags);
    return newTag;
  }

  async deleteTag(id: string): Promise<boolean> {
    const tags = this.getData<Tables['tags']['Row']>('tags');
    const filtered = tags.filter(t => t.id !== id);
    if (filtered.length === tags.length) return false;
    this.saveData('tags', filtered);
    return true;
  }

  // ========== 信仰百科 ==========
  async getReligions(): Promise<Tables['religions']['Row'][]> {
    return this.getData<Tables['religions']['Row']>('religions');
  }

  async createReligion(religion: Omit<Tables['religions']['Row'], 'id' | 'created_at' | 'updated_at'>): Promise<Tables['religions']['Row']> {
    const religions = this.getData<Tables['religions']['Row']>('religions');
    const newReligion: Tables['religions']['Row'] = {
      ...religion,
      id: this.generateId(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    religions.push(newReligion);
    this.saveData('religions', religions);
    return newReligion;
  }

  async updateReligion(id: string, updates: Partial<Tables['religions']['Row']>): Promise<Tables['religions']['Row'] | null> {
    const religions = this.getData<Tables['religions']['Row']>('religions');
    const index = religions.findIndex(r => r.id === id);
    if (index === -1) return null;
    religions[index] = { ...religions[index], ...updates, updated_at: new Date().toISOString() };
    this.saveData('religions', religions);
    return religions[index];
  }

  async deleteReligion(id: string): Promise<boolean> {
    const religions = this.getData<Tables['religions']['Row']>('religions');
    const filtered = religions.filter(r => r.id !== id);
    if (filtered.length === religions.length) return false;
    this.saveData('religions', filtered);
    return true;
  }

  // ========== 用户资料 ==========
  async getProfiles(): Promise<Tables['profiles']['Row'][]> {
    return this.getData<Tables['profiles']['Row']>('profiles');
  }

  async getProfile(id: string): Promise<Tables['profiles']['Row'] | null> {
    const profiles = this.getData<Tables['profiles']['Row']>('profiles');
    return profiles.find(p => p.id === id) || null;
  }

  async updateProfile(id: string, updates: Partial<Tables['profiles']['Row']>): Promise<Tables['profiles']['Row'] | null> {
    const profiles = this.getData<Tables['profiles']['Row']>('profiles');
    const index = profiles.findIndex(p => p.id === id);
    if (index === -1) return null;
    profiles[index] = { ...profiles[index], ...updates };
    this.saveData('profiles', profiles);
    return profiles[index];
  }
}

// 导出单例
export const mockDb = new MockSupabaseClient();
