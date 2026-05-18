import React, { useState, useEffect, useCallback, useRef } from 'react';

// ============= API 配置 =============
// 生产环境直接使用 Supabase，避免依赖未部署的 /sb-api 代理
const SUPABASE_URL = 'https://rdhwmeittgdosmkxtpak.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkaHdtZWl0dGdkb3Nta3h0cGFrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODEzMjQ5MiwiZXhwIjoyMDkzNzA4NDkyfQ.bPatiu7NXaE2k48aTkjAGQsba6NzXlIdq2k_gGLYLBE';

// API 基础路径 - 生产环境直接使用 Supabase
const API_BASE = `${SUPABASE_URL}/rest/v1`;

// 带认证的 fetch 选项
const authHeaders = {
  'apikey': SERVICE_KEY,
  'Authorization': `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json'
};

// ============= SmartImportModal 组件内联 =============

interface SmartImportBook {
  id: string;
  title: string;
  religion: string;
  category: string;
  description: string;
  status: string;
  group_id?: string;
}

function SmartImportModalInline(props: { 
  onClose: () => void; 
  refreshBooks: () => void;
}) {
  // 状态
  const [step, setStep] = useState(1);
  const [rawData, setRawData] = useState('');
  const [books, setBooks] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [imported, setImported] = useState(0);
  
  // 生成唯一ID
  const genId = () => crypto.randomUUID();
  
  // 解析数据
  function parseContent(text: string): any[] {
    const trimmed = text.trim();
    if (!trimmed) return [];
    
    // 1. JSON 格式
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        const data = JSON.parse(trimmed);
        
        // 处理数组
        if (Array.isArray(data)) {
          return data.map((item: any, i: number) => {
            const title = item.title || item.name || item.book || ('书籍' + (i + 1));
            const chapters = (item.chapters || item.sections || []).map((ch: any, ci: number) => ({
              title: ch.title || ch.name || ('第' + (ci + 1) + '章'),
              content: String(ch.content || ch.text || ''),
              number: ci + 1
            }));
            return { title, religion: item.religion || '', category: item.category || '经典', description: item.description || '', chapters };
          });
        }
        
        // 处理 {books: [...]} 格式
        if (data.books && Array.isArray(data.books)) {
          return parseContent(JSON.stringify(data.books));
        }
        
        // 处理单个对象
        if (data.title || data.name) {
          return [{
            title: data.title || data.name,
            religion: data.religion || '',
            category: data.category || '经典',
            description: data.description || '',
            chapters: (data.chapters || data.sections || []).map((ch: any, ci: number) => ({
              title: ch.title || ch.name || ('第' + (ci + 1) + '章'),
              content: String(ch.content || ch.text || ''),
              number: ci + 1
            }))
          }];
        }
      } catch (e) {
        // JSON 解析失败
      }
    }
    
    const lines = trimmed.split('\n');
    
    // 2. Markdown 格式 - 检测 # 标题
    if (trimmed.indexOf('# ') >= 0) {
      const books: any[] = [];
      const parts = trimmed.split(/(?=^# )/m);
      
      for (const part of parts) {
        const partLines = part.trim().split('\n');
        if (partLines.length > 0 && partLines[0].startsWith('# ')) {
          const title = partLines[0].substring(2).trim();
          const content = partLines.slice(1).join('\n').trim();
          if (title) {
            books.push({
              title,
              religion: '',
              category: '经典',
              description: '',
              chapters: content ? [{ title, content, number: 1 }] : []
            });
          }
        }
      }
      
      if (books.length > 0) return books;
    }
    
    // 3. TXT 格式 - "第X章" 作为同一本书的多个章节
    // 检测是否有章节标记
    const hasChapterMarkers = /第[一二三四五六七八九十百千万\d零两]+[章节]/.test(trimmed);
    
    if (hasChapterMarkers) {
      const chapters: any[] = [];
      let currentChapter = { title: '', content: [] as string[] };
      
      for (const line of lines) {
        const t = line.trim();
        
        // 检测章节标题行
        const isChapterStart = /^第[一二三四五六七八九十百千万\d零两]+[章节][：:\s]*/.test(t) ||
                               /^第[一二三四五六七八九十百千万\d零两]+[章节]$/.test(t) ||
                               /^Chapter\s+\d+/i.test(t) ||
                               /^[一二三四五六七八九十百千万\d零两]+[章节][：:\s]*/.test(t);
        
        if (isChapterStart) {
          // 保存上一章
          if (currentChapter.title && currentChapter.content.length > 0) {
            chapters.push({
              title: currentChapter.title,
              content: currentChapter.content.join('\n').trim(),
              number: chapters.length + 1
            });
          }
          // 开始新章节
          currentChapter = { title: t, content: [] };
        } else if (currentChapter.title) {
          // 章节内容
          if (t) {
            currentChapter.content.push(t);
          }
        } else if (!currentChapter.title && t) {
          // 在第一章开始之前的内容，可能是书名
          currentChapter.title = t.substring(0, 50) || '第一章';
          currentChapter.content = [];
        }
      }
      
      // 保存最后一章
      if (currentChapter.title && currentChapter.content.length > 0) {
        chapters.push({
          title: currentChapter.title,
          content: currentChapter.content.join('\n').trim(),
          number: chapters.length + 1
        });
      }
      
      // 如果没有找到章节，但有书名
      if (chapters.length === 0) {
        const firstLine = lines.find(l => l.trim()) || '';
        chapters.push({
          title: firstLine.substring(0, 50) || '未命名',
          content: trimmed,
          number: 1
        });
      }
      
      // 合并为一本书
      const bookTitle = chapters[0]?.title || '书籍';
      return [{
        title: bookTitle,
        religion: '',
        category: '经典',
        description: '',
        chapters: chapters
      }];
    }
    
    // 4. CSV 格式
    if (trimmed.indexOf(',') >= 0) {
      const firstLine = lines[0] || '';
      if (firstLine.split(',').length >= 2) {
        const books: any[] = [];
        
        for (const line of lines) {
          const cols = line.split(',');
          if (cols.length >= 2) {
            const title = cols[0].trim();
            const content = cols.slice(1).join(',').trim();
            if (title) {
              books.push({
                title,
                religion: '',
                category: '经典',
                description: '',
                chapters: content ? [{ title, content, number: books.length + 1 }] : []
              });
            }
          }
        }
        
        if (books.length > 0) return books;
      }
    }
    
    // 5. HTML 格式
    if (trimmed.indexOf('<h') >= 0) {
      const matches = trimmed.match(/<h[1-6][^>]*>([^<]+)<\/h[1-6]>/gi) || [];
      if (matches.length > 0) {
        const chapters: any[] = [];
        
        for (const match of matches) {
          const title = match.replace(/<[^>]+>/g, '').trim();
          if (title) {
            chapters.push({
              title,
              content: title,
              number: chapters.length + 1
            });
          }
        }
        
        if (chapters.length > 0) {
          return [{
            title: chapters[0].title,
            religion: '',
            category: '经典',
            description: '',
            chapters: chapters
          }];
        }
      }
    }
    
    // 6. 纯文本 - 整篇作为一本书
    const firstLine = trimmed.split('\n')[0] || '';
    const title = firstLine.substring(0, 50) || '未命名';
    
    return [{
      title,
      religion: '',
      category: '经典',
      description: '',
      chapters: [{ title, content: trimmed, number: 1 }]
    }];
  }
  
  // 处理下一步
  function handleNext() {
    const text = rawData.trim();
    if (!text) {
      setError('请先上传文件或粘贴内容');
      return;
    }
    
    const parsed = parseContent(text);
    if (parsed.length === 0 || !parsed[0].title) {
      setError('无法解析数据，请检查格式');
      return;
    }
    
    // 确保每本书有 chapters 数组
    const validBooks = parsed.filter((b: any) => b.title);
    if (validBooks.length === 0) {
      setError('未找到有效书籍');
      return;
    }
    
    setBooks(validBooks);
    setError('');
    setStep(2);
  }
  
  // 执行导入
  async function handleImport() {
    if (books.length === 0) return;
    
    setStep(3);
    let count = 0;
    
    try {
      for (const book of books) {
        if (!book.title) continue;
        
        const bookId = genId();
        const res = await fetch(`${API_BASE}/books`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({
            id: bookId,
            title: book.title,
            religion: book.religion || '',
            category: book.category || '经典',
            description: book.description || '',
            status: 'published'
          })
        });
        
        if (res.ok) {
          count++;
          
          // 导入章节
          if (book.chapters && Array.isArray(book.chapters)) {
            for (const ch of book.chapters) {
              if (!ch.title && !ch.content) continue;
              
              await fetch(`${API_BASE}/chapters`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'apikey': SERVICE_KEY, 'Authorization': 'Bearer ' + SERVICE_KEY },
                body: JSON.stringify({
                  id: genId(),
                  book_id: bookId,
                  number: ch.number || 1,
                  title: ch.title || '章节',
                  content: ch.content || '',
                  status: 'published'
                })
              });
            }
          }
        }
      }
      
      setImported(count);
      setStep(4);
      props.refreshBooks();
    } catch (err) {
      console.error('Import error:', err);
      setError('导入失败');
      setStep(2);
    }
  }
  
  // 处理文件选择
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result;
      if (typeof result === 'string') {
        setRawData(result);
        setError('');
      }
    };
    reader.onerror = () => setError('文件读取失败');
    reader.readAsText(file);
  }
  
  // 计算总章节数
  const totalChapters = books.reduce((sum: number, b: any) => sum + (b.chapters?.length || 0), 0);
  
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div style={{ background: '#fff', borderRadius: 12, width: '90%', maxWidth: 600, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        {/* 头部 */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #e5e7eb' }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>智能导入书籍</h2>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: '#6b7280' }}>
            {step === 1 && '步骤 1: 上传或粘贴'}
            {step === 2 && '步骤 2: 预览'}
            {step === 3 && '导入中...'}
            {step === 4 && '完成'}
          </p>
        </div>
        
        {/* 内容 */}
        <div style={{ padding: 24 }}>
          {/* 步骤1: 上传 */}
          {step === 1 && (
            <div>
              <div style={{ marginBottom: 12 }}>
                <input type="file" id="import-file" accept=".json,.txt,.csv,.md,.html" onChange={handleFileChange} style={{ display: 'none' }} />
                <label htmlFor="import-file" style={{ display: 'inline-block', padding: '8px 16px', background: '#e5e7eb', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>
                  选择文件
                </label>
                <span style={{ marginLeft: 12, fontSize: 12, color: '#6b7280' }}>支持 JSON, TXT, CSV, Markdown, HTML</span>
              </div>
              <textarea
                value={rawData}
                onChange={(e) => { setRawData(e.target.value); setError(''); }}
                placeholder="粘贴内容或上传文件..."
                style={{ width: '100%', height: 250, padding: 12, border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, fontFamily: 'monospace', resize: 'vertical' }}
              />
              {error && <p style={{ color: '#dc2626', fontSize: 13, marginTop: 8 }}>{error}</p>}
            </div>
          )}
          
          {/* 步骤2: 预览 */}
          {step === 2 && (
            <div>
              <div style={{ marginBottom: 12, padding: 12, background: '#ecfdf5', borderRadius: 8 }}>
                <p style={{ color: '#059669', fontSize: 14, fontWeight: 500, margin: 0 }}>
                  解析成功：{books.length} 本书，{totalChapters} 章
                </p>
              </div>
              <div style={{ maxHeight: 300, overflow: 'auto' }}>
                {books.map((book: any, i: number) => (
                  <div key={i} style={{ padding: 12, border: '1px solid #e5e7eb', borderRadius: 8, marginBottom: 8 }}>
                    <p style={{ fontWeight: 500, margin: 0 }}>{book.title}</p>
                    <p style={{ fontSize: 12, color: '#6b7280', margin: '4px 0 0' }}>
                      {book.religion || '未分类'} · {book.chapters?.length || 0} 章
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* 步骤3: 导入中 */}
          {step === 3 && (
            <div style={{ textAlign: 'center', padding: 32 }}>
              <p style={{ color: '#374151' }}>正在导入 {books.length} 本书...</p>
            </div>
          )}
          
          {/* 步骤4: 完成 */}
          {step === 4 && (
            <div style={{ textAlign: 'center', padding: 32 }}>
              <div style={{ width: 64, height: 64, background: '#22c55e', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 32, color: '#fff' }}>
                ✓
              </div>
              <h3 style={{ margin: '0 0 8px' }}>导入成功</h3>
              <p style={{ color: '#6b7280', margin: 0 }}>已导入 {imported} 本书</p>
            </div>
          )}
        </div>
        
        {/* 底部按钮 */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: 12, background: '#f9fafb' }}>
          <button onClick={props.onClose} style={{ padding: '10px 20px', border: '1px solid #d1d5db', borderRadius: 8, cursor: 'pointer', background: '#fff' }}>
            取消
          </button>
          
          {step === 1 && (
            <button onClick={handleNext} style={{ padding: '10px 24px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 500 }}>
              下一步 →
            </button>
          )}
          
          {step === 2 && (
            <button onClick={handleImport} style={{ padding: '10px 24px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 500 }}>
              开始导入 ✓
            </button>
          )}
          
          {step === 4 && (
            <button onClick={props.onClose} style={{ padding: '10px 24px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 500 }}>
              完成
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============= BookManagement 组件 =============

type Book = {
  id: string;
  title: string;
  religion: string;
  category: string;
  description: string;
  status: string;
  group_id?: string;
  sort_order?: number;
  created_at: string;
  updated_at: string;
};

type Chapter = {
  id: string;
  book_id: string;
  number: number;
  title: string;
  content: string;
  volume?: string;
  status: string;
  created_at: string;
  updated_at: string;
};

type BookGroup = {
  id: string;
  name: string;
  religion: string;
  description: string;
  book_ids: string[];
  group_ids: string[];
  parent_id?: string;
  status: string;
  created_at: string;
};

export default function BookManagement() {
  const [books, setBooks] = useState<Book[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [groups, setGroups] = useState<BookGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterReligion, setFilterReligion] = useState('');
  const [showBookModal, setShowBookModal] = useState(false);
  const [showChapterModal, setShowChapterModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showSmartImportModal, setShowSmartImportModal] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [editingGroupBookId, setEditingGroupBookId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 批量选择状态
  const [selectedUngroupedBooks, setSelectedUngroupedBooks] = useState<Set<string>>(new Set());
  const [selectedGroupBooks, setSelectedGroupBooks] = useState<Set<string>>(new Set());
  
  // 发布书籍列表状态
  const [showPublishedList, setShowPublishedList] = useState(false);
  const [selectedPublishedBooks, setSelectedPublishedBooks] = useState<Set<string>>(new Set());
  
  // 已发布的书籍
  const publishedBooks = books.filter(b => b.status === 'published');
  
  // 发布/取消发布书籍
  const togglePublish = async (bookId: string) => {
    const book = books.find(b => b.id === bookId);
    if (!book) return;
    const newStatus = book.status === 'published' ? 'draft' : 'published';
    await fetch(`${API_BASE}/books?id=eq.${bookId}`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ status: newStatus, updated_at: new Date().toISOString() }),
    });
    setSelectedPublishedBooks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(bookId)) newSet.delete(bookId);
      return newSet;
    });
    await loadData();
  };
  
  // 批量发布
  const batchPublish = async () => {
    if (selectedUngroupedBooks.size === 0) return;
    for (const bookId of selectedUngroupedBooks) {
      await fetch(`${API_BASE}/books?id=eq.${bookId}`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ status: 'published', updated_at: new Date().toISOString() }),
      });
    }
    setSelectedUngroupedBooks(new Set());
    await loadData();
  };
  
  // 批量取消发布
  const batchUnpublish = async () => {
    if (selectedPublishedBooks.size === 0) return;
    for (const bookId of selectedPublishedBooks) {
      await fetch(`${API_BASE}/books?id=eq.${bookId}`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ status: 'draft', updated_at: new Date().toISOString() }),
      });
    }
    setSelectedPublishedBooks(new Set());
    await loadData();
  };
  
  // 批量删除已发布书籍
  const batchDeletePublished = async () => {
    if (selectedPublishedBooks.size === 0) return;
    if (!confirm(`确定删除选中的 ${selectedPublishedBooks.size} 本已发布书籍吗？`)) return;
    for (const bookId of selectedPublishedBooks) {
      await fetch(`${API_BASE}/chapters?book_id=eq.${bookId}`, { method: 'DELETE', headers: authHeaders });
      await fetch(`${API_BASE}/books?id=eq.${bookId}`, { method: 'DELETE', headers: authHeaders });
    }
    setSelectedPublishedBooks(new Set());
    await loadData();
  };
  
  // 排序已发布书籍
  const sortPublishedBooks = async (direction: 'asc' | 'desc') => {
    const sorted = [...publishedBooks].sort((a, b) => {
      const orderA = a.sort_order || 0;
      const orderB = b.sort_order || 0;
      return direction === 'asc' ? orderA - orderB : orderB - orderA;
    });
    for (let i = 0; i < sorted.length; i++) {
      await fetch(`${API_BASE}/books?id=eq.${sorted[i].id}`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ sort_order: i + 1, updated_at: new Date().toISOString() }),
      });
    }
    await loadData();
  };
  
  // 切换群组发布状态
  const handleToggleGroupPublish = async (groupId: string, isCurrentlyPublished: boolean) => {
    const newStatus = isCurrentlyPublished ? 'draft' : 'published';
    await fetch(`${API_BASE}/book_groups?id=eq.${groupId}`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ status: newStatus }),
    });
    await loadData();
  };
  
  // 保存编辑时的群组快照
  const editingGroupSnapshot = useRef<BookGroup | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [booksRes, chaptersRes, groupsRes] = await Promise.all([
        fetch(`${API_BASE}/books?select=*&order=sort_order.asc,created_at.asc`, { headers: authHeaders }),
        fetch(`${API_BASE}/chapters?select=*&order=number.asc`, { headers: authHeaders }),
        fetch(`${API_BASE}/book_groups?select=*`, { headers: authHeaders }),
      ]);
      const [booksData, chaptersData, groupsData] = await Promise.all([booksRes.json(), chaptersRes.json(), groupsRes.json()]);
      // 确保返回的是数组，防止 map 报错
      setBooks(Array.isArray(booksData) ? booksData : []);
      setChapters(Array.isArray(chaptersData) ? chaptersData : []);
      setGroups(Array.isArray(groupsData) ? groupsData : []);
    } catch (err) {
      console.error('加载失败:', err);
      setBooks([]);
      setChapters([]);
      setGroups([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const religions = [...new Set(books.map(b => b.religion).filter(Boolean))];
  
  // 获取所有被任何群组包含的书籍ID（递归收集所有层级的书籍）
  const getAllGroupedBookIds = useCallback((): Set<string> => {
    const groupedIds = new Set<string>();
    
    // 递归收集函数
    const collectBooks = (groupId: string, visited: Set<string> = new Set()) => {
      if (visited.has(groupId)) return; // 防止循环
      visited.add(groupId);
      
      const group = groups.find(g => g.id === groupId);
      if (!group) return;
      
      // 添加直接包含的书籍
      (group.book_ids || []).forEach((id: string) => groupedIds.add(id));
      
      // 递归收集子群组中的书籍
      (group.group_ids || []).forEach((subId: string) => collectBooks(subId, visited));
    };
    
    // 从所有顶级群组（没有父级）开始收集
    groups.forEach(group => {
      if (!group.parent_id) {
        collectBooks(group.id);
      }
    });
    
    return groupedIds;
  }, [groups]);

  const allGroupedBookIds = getAllGroupedBookIds();
  
  // 未分组的书籍 = 没有被任何群组包含的书籍
  const ungroupedBooks = books.filter(b => !allGroupedBookIds.has(b.id));
  
  // 筛选后的未分组书籍
  const filteredUngroupedBooks = ungroupedBooks.filter(b => {
    const matchSearch = b.title?.toLowerCase().includes(searchTerm.toLowerCase()) || b.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchReligion = !filterReligion || b.religion === filterReligion;
    return matchSearch && matchReligion;
  });

  const selectedBook = books.find(b => b.id === selectedBookId);
  const selectedBookChapters = chapters.filter(c => c.book_id === selectedBookId).sort((a, b) => a.number - b.number);
  const selectedGroup = groups.find(g => g.id === selectedGroupId);

  // 获取群组中包含的所有书籍ID（包括嵌套子群组的书籍）
  const getGroupBookIds = useCallback((groupId: string): string[] => {
    const groupedIds: string[] = [];
    
    const collectBooks = (gid: string, visited: Set<string> = new Set()) => {
      if (visited.has(gid)) return;
      visited.add(gid);
      
      const group = groups.find(g => g.id === gid);
      if (!group) return;
      
      (group.book_ids || []).forEach((id: string) => groupedIds.push(id));
      (group.group_ids || []).forEach((subId: string) => collectBooks(subId, visited));
    };
    
    collectBooks(groupId);
    return groupedIds;
  }, [groups]);

  // 获取群组的子群组
  const getSubGroups = (parentId: string): BookGroup[] => {
    return groups.filter(g => g.parent_id === parentId);
  };

  // 获取顶级群组
  const topLevelGroups = groups.filter(g => !g.parent_id);
  // 可选的父群组
  const availableParentGroups = (groupId?: string) => {
    if (!groupId) return groups;
    const excludeIds = new Set<string>();
    const collectExclude = (id: string) => {
      excludeIds.add(id);
      groups.filter(g => g.parent_id === id).forEach(g => collectExclude(g.id));
    };
    collectExclude(groupId);
    return groups.filter(g => !excludeIds.has(g.id));
  };

  // 保存书籍
  const handleSaveBook = async (data: Partial<Book>) => {
    try {
      if (editingBook) {
        await fetch(`${API_BASE}/books?id=eq.${editingBook.id}`, {
          method: 'PATCH',
          headers: authHeaders,
          body: JSON.stringify({ ...data, updated_at: new Date().toISOString() }),
        });
      } else {
        await fetch(`${API_BASE}/books`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify([{ ...data, id: 'book_' + Date.now(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() }]),
        });
      }
      await loadData();
      setShowBookModal(false);
      setEditingBook(null);
      setEditingGroupBookId(null);
    } catch (err) {
      console.error('保存失败:', err);
    }
  };

  // 删除书籍
  const handleDeleteBook = async (id: string) => {
    if (!confirm('确定删除此书籍及其所有章节吗？')) return;
    try {
      await fetch(`${API_BASE}/chapters?book_id=eq.${id}`, { method: 'DELETE', headers: authHeaders });
      await fetch(`${API_BASE}/books?id=eq.${id}`, { method: 'DELETE', headers: authHeaders });
      await loadData();
      if (selectedBookId === id) setSelectedBookId(null);
    } catch (err) {
      console.error('删除失败:', err);
    }
  };

  // 保存章节
  const handleSaveChapter = async (data: Partial<Chapter>) => {
    const targetBookId = selectedBookId || editingGroupBookId;
    if (!targetBookId) return;
    try {
      if (editingChapter) {
        await fetch(`${API_BASE}/chapters?id=eq.${editingChapter.id}`, {
          method: 'PATCH',
          headers: authHeaders,
          body: JSON.stringify({ ...data, updated_at: new Date().toISOString() }),
        });
      } else {
        await fetch(`${API_BASE}/chapters`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify([{ ...data, id: 'ch_' + Date.now(), book_id: targetBookId, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }]),
        });
      }
      await loadData();
      setShowChapterModal(false);
    } catch (err) {
      console.error('保存失败:', err);
    }
  };

  // 删除章节
  const handleDeleteChapter = async (id: string) => {
    if (!confirm('确定删除此章节吗？')) return;
    try {
      await fetch(`${API_BASE}/chapters?id=eq.${id}`, { method: 'DELETE', headers: authHeaders });
      await loadData();
    } catch (err) {
      console.error('删除失败:', err);
    }
  };

  // 排序章节
  const handleSortChapter = async (chapterId: string, direction: 'up' | 'down') => {
    const targetBookId = selectedBookId || editingGroupBookId;
    if (!targetBookId) return;
    const bookChapters = chapters.filter(c => c.book_id === targetBookId).sort((a, b) => a.number - b.number);
    const idx = bookChapters.findIndex(c => c.id === chapterId);
    if (idx === -1) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= bookChapters.length) return;
    
    const targetChapter = bookChapters[targetIdx];
    const currentChapter = bookChapters[idx];
    
    try {
      await fetch(`${API_BASE}/chapters?id=eq.${currentChapter.id}`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ number: targetChapter.number, updated_at: new Date().toISOString() }),
      });
      await fetch(`${API_BASE}/chapters?id=eq.${targetChapter.id}`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ number: currentChapter.number, updated_at: new Date().toISOString() }),
      });
      await loadData();
    } catch (err) {
      console.error('排序失败:', err);
    }
  };

  // 保存群组
  const handleSaveGroup = async (name: string, religion: string, description: string, bookIds: string[], groupIds: string[], parentId?: string, status: string = 'draft') => {
    // 收集该群组（及其子群组）中所有的书籍ID
    const allBookIds = new Set<string>(bookIds);
    const collectSubGroupBooks = (gid: string) => {
      const group = groups.find(g => g.id === gid);
      if (!group) return;
      (group.book_ids || []).forEach((id: string) => allBookIds.add(id));
      (group.group_ids || []).forEach((subId: string) => collectSubGroupBooks(subId));
    };
    groupIds.forEach(gid => collectSubGroupBooks(gid));
    
    if (editingGroupId && editingGroupSnapshot.current) {
      // 获取之前属于这个群组的所有书籍
      const oldAllBookIds = new Set<string>();
      const oldCollect = (gid: string) => {
        const group = groups.find(g => g.id === gid);
        if (!group) return;
        (group.book_ids || []).forEach((id: string) => oldAllBookIds.add(id));
        (group.group_ids || []).forEach((subId: string) => oldCollect(subId));
      };
      oldCollect(editingGroupId);
      
      // 通过 API 更新群组
      await fetch(`${API_BASE}/book_groups?id=eq.${editingGroupId}`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ name, religion, description, book_ids: bookIds, group_ids: groupIds, parent_id: parentId, status, updated_at: new Date().toISOString() }),
      });
      
      // 清除移出群组的书籍的 group_id
      const removedBookIds = [...oldAllBookIds].filter(id => !allBookIds.has(id));
      for (const bookId of removedBookIds) {
        await fetch(`${API_BASE}/books?id=eq.${bookId}`, {
          method: 'PATCH',
          headers: authHeaders,
          body: JSON.stringify({ group_id: null, updated_at: new Date().toISOString() }),
        });
      }
      
      // 设置加入群组的书籍的 group_id
      for (const bookId of allBookIds) {
        await fetch(`${API_BASE}/books?id=eq.${bookId}`, {
          method: 'PATCH',
          headers: authHeaders,
          body: JSON.stringify({ group_id: editingGroupId, updated_at: new Date().toISOString() }),
        });
      }
    } else {
      // 新建群组
      const newGroupId = 'group_' + Date.now();
      await fetch(`${API_BASE}/book_groups`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          id: newGroupId,
          name,
          religion,
          description,
          book_ids: bookIds,
          group_ids: groupIds,
          parent_id: parentId,
          status,
          created_at: new Date().toISOString(),
        }),
      });
      
      // 设置书籍的 group_id
      for (const bookId of allBookIds) {
        await fetch(`${API_BASE}/books?id=eq.${bookId}`, {
          method: 'PATCH',
          headers: authHeaders,
          body: JSON.stringify({ group_id: newGroupId, updated_at: new Date().toISOString() }),
        });
      }
    }
    
    await loadData();
    setShowGroupModal(false);
    setEditingGroupId(null);
    editingGroupSnapshot.current = null;
  };

  // 删除群组
  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm('确定删除此群组吗？此操作不会删除群组内的书籍，但会清除它们的分组状态。')) return;
    
    const groupToDelete = groups.find(g => g.id === groupId);
    
    // 收集该群组中的所有书籍
    const allBookIds: string[] = [];
    const collectBooks = (gid: string) => {
      const group = groups.find(g => g.id === gid);
      if (!group) return;
      allBookIds.push(...(group.book_ids || []));
      (group.group_ids || []).forEach((subId: string) => collectBooks(subId));
    };
    collectBooks(groupId);
    
    // 清除这些书籍的 group_id
    for (const bookId of allBookIds) {
      await fetch(`${API_BASE}/books?id=eq.${bookId}`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ group_id: null, updated_at: new Date().toISOString() }),
      });
    }
    
    // 通过 API 删除群组
    await fetch(`${API_BASE}/book_groups?id=eq.${groupId}`, { method: 'DELETE', headers: authHeaders });
    
    await loadData();
    if (selectedGroupId === groupId) setSelectedGroupId(null);
    if (editingGroupId === groupId) {
      setEditingGroupId(null);
      setShowGroupModal(false);
    }
  };

  // 批量选择处理 - 未分组书籍
  const toggleUngroupedBook = (bookId: string) => {
    setSelectedUngroupedBooks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(bookId)) newSet.delete(bookId);
      else newSet.add(bookId);
      return newSet;
    });
  };

  const selectAllUngrouped = () => {
    setSelectedUngroupedBooks(new Set(filteredUngroupedBooks.map(b => b.id)));
  };

  const deselectAllUngrouped = () => {
    setSelectedUngroupedBooks(new Set());
  };

  const batchDeleteUngrouped = async () => {
    if (selectedUngroupedBooks.size === 0) return;
    if (!confirm(`确定删除选中的 ${selectedUngroupedBooks.size} 本书籍吗？`)) return;
    
    for (const bookId of selectedUngroupedBooks) {
      await fetch(`${API_BASE}/books?id=eq.${bookId}`, { method: 'DELETE', headers: authHeaders });
      await fetch(`${API_BASE}/chapters?book_id=eq.${bookId}`, { method: 'DELETE', headers: authHeaders });
    }
    setSelectedUngroupedBooks(new Set());
    await loadData();
  };

  // 批量移动到群组
  const [showMoveToGroupModal, setShowMoveToGroupModal] = useState(false);
  const [moveTargetGroupId, setMoveTargetGroupId] = useState<string>('');

  const batchMoveToGroup = async () => {
    if (selectedUngroupedBooks.size === 0) return;
    if (!moveTargetGroupId) {
      alert('请选择目标群组');
      return;
    }
    const targetGroup = groups.find(g => g.id === moveTargetGroupId);
    if (!targetGroup) return;
    
    const existingBookIds = new Set(targetGroup.book_ids || []);
    const newBookIds = [...existingBookIds, ...Array.from(selectedUngroupedBooks)];
    
    await fetch(`${API_BASE}/book_groups?id=eq.${moveTargetGroupId}`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ book_ids: newBookIds, updated_at: new Date().toISOString() }),
    });
    
    // 更新书籍的 group_id
    for (const bookId of selectedUngroupedBooks) {
      await fetch(`${API_BASE}/books?id=eq.${bookId}`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ group_id: moveTargetGroupId, updated_at: new Date().toISOString() }),
      });
    }
    
    setSelectedUngroupedBooks(new Set());
    setShowMoveToGroupModal(false);
    setMoveTargetGroupId('');
    await loadData();
    alert(`已将 ${selectedUngroupedBooks.size} 本书籍移动到 "${targetGroup.name}"`);
  };

  // 批量选择处理 - 群组内书籍
  const toggleGroupBook = (bookId: string) => {
    setSelectedGroupBooks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(bookId)) newSet.delete(bookId);
      else newSet.add(bookId);
      return newSet;
    });
  };

  const selectAllGroupBooks = () => {
    if (!selectedGroup) return;
    const groupBookIds = getGroupBookIds(selectedGroup.id);
    setSelectedGroupBooks(new Set(groupBookIds));
  };

  const deselectAllGroupBooks = () => {
    setSelectedGroupBooks(new Set());
  };

  const batchRemoveFromGroup = async () => {
    if (selectedGroupBooks.size === 0 || !selectedGroup) return;
    if (!confirm(`确定从 "${selectedGroup.name}" 移除选中的 ${selectedGroupBooks.size} 本书籍吗？`)) return;
    
    const updatedBookIds = (selectedGroup.book_ids || []).filter((id: string) => !selectedGroupBooks.has(id));
    await fetch(`${API_BASE}/book_groups?id=eq.${selectedGroup.id}`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ book_ids: updatedBookIds, updated_at: new Date().toISOString() }),
    });
    setSelectedGroupBooks(new Set());
    await loadData();
    if (selectedGroup) {
      const updated = groups.find(g => g.id === selectedGroup.id);
      if (updated) setSelectedGroup(updated);
    }
  };

  // 从群组中移除书籍
  const handleRemoveBookFromGroup = async (bookId: string, groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;
    
    const newBookIds = (group.book_ids || []).filter((id: string) => id !== bookId);
    await fetch(`${API_BASE}/book_groups?id=eq.${groupId}`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify([{ book_ids: newBookIds }]),
    });
    
    // 检查这本书是否还被其他群组包含，如果没有则清除 group_id
    const stillInGroup = groups.some(g => g.id !== groupId && (g.book_ids || []).includes(bookId));
    if (!stillInGroup) {
      await fetch(`${API_BASE}/books?id=eq.${bookId}`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ group_id: null, updated_at: new Date().toISOString() }),
      });
    }
    
    await loadData();
  };

  // 从群组中移除子群组
  const handleRemoveSubGroupFromGroup = async (subGroupId: string, groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;
    
    const newGroupIds = (group.group_ids || []).filter((id: string) => id !== subGroupId);
    await fetch(`${API_BASE}/book_groups?id=eq.${groupId}`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ group_ids: newGroupIds, updated_at: new Date().toISOString() }),
    });
    
    await loadData();
  };

  // 导入章节
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const targetBookId = selectedBookId || editingGroupBookId;
    if (!file || !targetBookId) return;
    
    setImportFile(file);
    const content = await file.text();
    
    let format = 'text';
    if (file.name.endsWith('.json')) format = 'json';
    else if (file.name.endsWith('.csv')) format = 'csv';
    else if (file.name.endsWith('.md')) format = 'markdown';
    
    const items = parseContent(content, format);
    if (items.length === 0) {
      alert('未能解析内容');
      return;
    }
    
    try {
      for (const item of items) {
        await fetch(`${API_BASE}/chapters`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify([{
            id: 'ch_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            book_id: targetBookId,
            title: item.title,
            content: item.content,
            number: item.number,
            status: 'published',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }]),
        });
      }
      await loadData();
      alert(`成功导入 ${items.length} 个章节`);
      setShowImportModal(false);
    } catch (err) {
      console.error('导入失败:', err);
      alert('导入失败');
    }
  };

  const parseContent = (content: string, format: string): { title: string; content: string; number: number }[] => {
    const items: { title: string; content: string; number: number }[] = [];
    try {
      if (format === 'json') {
        const data = JSON.parse(content);
        const arr = Array.isArray(data) ? data : (data.chapters || []);
        arr.forEach((item: any, i: number) => {
          items.push({ title: item.title || item.name || `章节${i + 1}`, content: item.content || item.text || '', number: item.number || i + 1 });
        });
      } else if (format === 'csv') {
        content.split('\n').filter(l => l.trim()).forEach((line, i) => {
          const parts = line.split(',');
          items.push({ title: parts[0]?.trim() || `章节${i + 1}`, content: parts.slice(1).join(',').trim(), number: i + 1 });
        });
      } else if (format === 'markdown') {
        content.split(/#{1,3}\s+/).filter(s => s.trim()).forEach((section, i) => {
          const lines = section.split('\n');
          items.push({ title: lines[0]?.trim() || `章节${i + 1}`, content: lines.slice(1).join('\n').trim(), number: i + 1 });
        });
      } else {
        content.split(/\n\n+/).filter(p => p.trim()).forEach((para, i) => {
          const lines = para.split('\n');
          items.push({ title: lines[0]?.trim().substring(0, 50) || `章节${i + 1}`, content: para.trim(), number: i + 1 });
        });
      }
    } catch (err) {
      console.error('解析失败:', err);
    }
    return items;
  };

  if (loading) return <div style={{ padding: 20, textAlign: 'center' }}>加载中...</div>;

  // 打开编辑群组弹窗
  const openEditGroup = (group: BookGroup) => {
    setEditingGroupId(group.id);
    editingGroupSnapshot.current = { ...group };
    setShowGroupModal(true);
  };

  // 关闭群组弹窗
  const closeGroupModal = () => {
    setShowGroupModal(false);
    setEditingGroupId(null);
    editingGroupSnapshot.current = null;
  };

  return (
    <div style={{ height: '100%', display: 'flex', background: '#fff' }}>
      {/* 左侧面板 */}
      <div style={{ width: 340, borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', background: '#f9fafb' }}>
        <div style={{ padding: 16, borderBottom: '1px solid #e5e7eb', background: '#fff' }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: '#1f2937' }}>藏书管理</h2>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <button onClick={() => { setEditingGroupId(null); editingGroupSnapshot.current = null; setShowGroupModal(true); }} style={{ flex: 1, padding: '10px', background: '#C41E3A', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>+ 新建群组</button>
            <button onClick={() => { setEditingBook(null); setShowBookModal(true); }} style={{ flex: 1, padding: '10px', background: '#fff', color: '#C41E3A', border: '1px solid #C41E3A', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>+ 添加书籍</button>
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <button onClick={() => setShowSmartImportModal(true)} style={{ flex: 1, padding: '10px', background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}>+ 智能导入</button>
            <button onClick={() => { setShowPublishedList(!showPublishedList); setSelectedPublishedBooks(new Set()); }} style={{ flex: 1, padding: '10px', background: showPublishedList ? '#22c55e' : '#f3f4f6', color: showPublishedList ? '#fff' : '#374151', border: showPublishedList ? 'none' : '1px solid #d1d5db', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>{showPublishedList ? '◀ 返回' : '📋 发布列表'}</button>
          </div>
          {!showPublishedList && (
            <>
              <input type="text" placeholder="搜索书名..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ width: '100%', padding: 10, border: '1px solid #d1d5db', borderRadius: 6, marginBottom: 8, fontSize: 14, background: '#fff', color: '#1f2937' }} />
              <select value={filterReligion} onChange={e => setFilterReligion(e.target.value)} style={{ width: '100%', padding: 10, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, background: '#fff', color: '#1f2937' }}>
                <option value="">全部宗教</option>
                {religions.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </>
          )}
        </div>
        
        {/* 群组列表 - 只显示顶级群组 */}
        <div style={{ maxHeight: 300, overflow: 'auto', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13, color: '#6b7280', background: '#f3f4f6', position: 'sticky', top: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>书籍群组</span>
            <span style={{ fontWeight: 'normal', fontSize: 11 }}>({topLevelGroups.length})</span>
          </div>
          {topLevelGroups.length === 0 ? (
            <div style={{ padding: 16, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>暂无顶级群组</div>
          ) : (
            topLevelGroups.map(group => {
              const groupBookCount = getGroupBookIds(group.id).length;
              const isPublished = group.status === 'published';
              return (
                <div 
                  key={group.id}
                  onClick={() => { setSelectedGroupId(group.id); setSelectedBookId(null); }} 
                  style={{
                    padding: '12px 16px',
                    cursor: 'pointer',
                    background: selectedGroupId === group.id ? 'rgba(196, 30, 58, 0.1)' : '#fff',
                    borderLeft: selectedGroupId === group.id ? '3px solid #C41E3A' : '3px solid transparent',
                    borderBottom: '1px solid #f3f4f6'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input 
                        type="checkbox" 
                        checked={isPublished} 
                        onChange={(e) => { e.stopPropagation(); handleToggleGroupPublish(group.id, isPublished); }}
                        style={{ accentColor: '#22c55e', cursor: 'pointer' }}
                        title={isPublished ? '取消发布' : '发布到前台'}
                      />
                      <div>
                        <div style={{ fontWeight: 500, fontSize: 14, color: '#1f2937' }}>{group.name}</div>
                        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{group.religion || '未分类'} · {groupBookCount}本书</div>
                      </div>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); openEditGroup(group); }} 
                      style={{ padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: 4, cursor: 'pointer', background: '#fff', fontSize: 12 }}
                    >编辑</button>
                  </div>
                </div>
              );
            })
          )}
        </div>
        
        {/* 书籍列表 */}
        <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
          {showPublishedList ? (
            <>
              <div style={{ padding: '8px 12px', background: '#22c55e', position: 'sticky', top: 0, zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <span style={{ fontWeight: 600, fontSize: 13, color: '#fff' }}>发布书籍列表 ({publishedBooks.length})</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => sortPublishedBooks('asc')} style={{ padding: '4px 8px', fontSize: 11, border: '1px solid rgba(255,255,255,0.5)', borderRadius: 4, background: 'transparent', color: '#fff', cursor: 'pointer' }}>↑ 升序</button>
                    <button onClick={() => sortPublishedBooks('desc')} style={{ padding: '4px 8px', fontSize: 11, border: '1px solid rgba(255,255,255,0.5)', borderRadius: 4, background: 'transparent', color: '#fff', cursor: 'pointer' }}>↓ 降序</button>
                    <button onClick={selectedPublishedBooks.size === publishedBooks.length ? () => setSelectedPublishedBooks(new Set()) : () => setSelectedPublishedBooks(new Set(publishedBooks.map(b => b.id)))} style={{ padding: '4px 8px', fontSize: 11, border: '1px solid rgba(255,255,255,0.5)', borderRadius: 4, background: 'transparent', color: '#fff', cursor: 'pointer' }}>
                      {selectedPublishedBooks.size === publishedBooks.length ? '取消全选' : '全选'}
                    </button>
                  </div>
                </div>
                {selectedPublishedBooks.size > 0 && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button onClick={batchUnpublish} style={{ padding: '4px 8px', fontSize: 11, border: '1px solid rgba(255,255,255,0.5)', borderRadius: 4, background: 'transparent', color: '#fff', cursor: 'pointer' }}>取消发布 ({selectedPublishedBooks.size})</button>
                    <button onClick={batchDeletePublished} style={{ padding: '4px 8px', fontSize: 11, border: '1px solid rgba(255,255,255,0.5)', borderRadius: 4, background: 'transparent', color: '#fff', cursor: 'pointer' }}>删除 ({selectedPublishedBooks.size})</button>
                  </div>
                )}
              </div>
              {publishedBooks.length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>暂无已发布的书籍</div>
              ) : (
                publishedBooks.map(book => (
                  <div key={book.id} style={{ padding: 12, borderBottom: '1px solid #f3f4f6', background: selectedPublishedBooks.has(book.id) ? 'rgba(34,197,94,0.15)' : '#fff', borderLeft: selectedPublishedBooks.has(book.id) ? '3px solid #22c55e' : '3px solid transparent' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <input type="checkbox" checked={selectedPublishedBooks.has(book.id)} onChange={() => { const newSet = new Set(selectedPublishedBooks); if (newSet.has(book.id)) newSet.delete(book.id); else newSet.add(book.id); setSelectedPublishedBooks(newSet); }} style={{ accentColor: '#22c55e' }} />
                      <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => { setSelectedBookId(book.id); setSelectedGroupId(null); }}>
                        <div style={{ fontWeight: 500, fontSize: 14, color: '#1f2937' }}>{book.title}</div>
                        <div style={{ fontSize: 12, color: '#6b7280' }}>{book.religion} · {book.category}</div>
                      </div>
                      <button onClick={() => togglePublish(book.id)} style={{ padding: '4px 8px', fontSize: 11, border: '1px solid #dc2626', borderRadius: 4, background: 'transparent', color: '#dc2626', cursor: 'pointer' }}>取消发布</button>
                    </div>
                  </div>
                ))
              )}
            </>
          ) : (
            <>
              <div style={{ padding: '8px 12px', background: '#f3f4f6', position: 'sticky', top: 0, zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <span style={{ fontWeight: 600, fontSize: 13, color: '#6b7280' }}>未分组书籍 ({filteredUngroupedBooks.length})</span>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <button onClick={selectedUngroupedBooks.size === filteredUngroupedBooks.length ? deselectAllUngrouped : selectAllUngrouped} style={{ padding: '4px 8px', fontSize: 12, border: '1px solid #d1d5db', borderRadius: 4, cursor: 'pointer', background: '#fff' }}>
                      {selectedUngroupedBooks.size === filteredUngroupedBooks.length ? '取消全选' : '全选'}
                    </button>
                    {selectedUngroupedBooks.size > 0 && (
                      <button onClick={batchPublish} style={{ padding: '4px 8px', fontSize: 12, border: '1px solid #22c55e', borderRadius: 4, cursor: 'pointer', background: '#f0fdf4', color: '#22c55e' }}>
                        发布 ({selectedUngroupedBooks.size})
                      </button>
                    )}
                    {selectedUngroupedBooks.size > 0 && groups.length > 0 && (
                      <button onClick={() => setShowMoveToGroupModal(true)} style={{ padding: '4px 8px', fontSize: 12, border: '1px solid #3b82f6', borderRadius: 4, cursor: 'pointer', background: '#eff6ff', color: '#3b82f6' }}>
                        移动 ({selectedUngroupedBooks.size})
                      </button>
                    )}
                    {selectedUngroupedBooks.size > 0 && (
                      <button onClick={batchDeleteUngrouped} style={{ padding: '4px 8px', fontSize: 12, border: '1px solid #dc2626', borderRadius: 4, cursor: 'pointer', background: '#fef2f2', color: '#dc2626' }}>
                        删除 ({selectedUngroupedBooks.size})
                      </button>
                    )}
                  </div>
                </div>
              </div>
              {filteredUngroupedBooks.length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
                  {ungroupedBooks.length === 0 ? '暂无未分组书籍' : '无搜索结果'}
                </div>
              ) : (
                filteredUngroupedBooks.map(book => (
                  <div key={book.id} style={{
                    padding: 12, borderBottom: '1px solid #f3f4f6', cursor: 'pointer',
                    background: selectedUngroupedBooks.has(book.id) ? 'rgba(196, 30, 58, 0.1)' : selectedBookId === book.id ? 'rgba(196, 30, 58, 0.05)' : '#fff',
                    borderLeft: selectedUngroupedBooks.has(book.id) ? '3px solid #C41E3A' : selectedBookId === book.id ? '3px solid #C41E3A' : '3px solid transparent'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <input type="checkbox" checked={selectedUngroupedBooks.has(book.id)} onChange={() => toggleUngroupedBook(book.id)} style={{ marginTop: 2, cursor: 'pointer', accentColor: '#C41E3A' }} />
                      <div style={{ flex: 1 }} onClick={() => { setSelectedBookId(book.id); setSelectedGroupId(null); }}>
                        <div style={{ fontWeight: 500, fontSize: 14, color: '#1f2937' }}>{book.title}</div>
                        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{book.religion} · {book.category}</div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </>
          )}
        </div>
        
        <div style={{ padding: 12, borderTop: '1px solid #e5e7eb', fontSize: 13, color: '#6b7280', textAlign: 'center', background: '#fff' }}>
          未分组 {ungroupedBooks.length} 本 · 已分组 {books.length - ungroupedBooks.length} 本
        </div>
      </div>

      {/* 右侧面板 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {selectedGroup ? (
          <>
            <div style={{ padding: 20, borderBottom: '1px solid #e5e7eb', background: '#fff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 20, color: '#1f2937' }}>{selectedGroup.name}</h2>
                  <div style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>{selectedGroup.religion || '未分类'}</div>
                  <div style={{ fontSize: 13, color: '#9ca3af', marginTop: 8 }}>{selectedGroup.description || '暂无描述'}</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => openEditGroup(selectedGroup)} style={{ padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', background: '#fff', color: '#1f2937' }}>编辑群组</button>
                  <button onClick={() => handleDeleteGroup(selectedGroup.id)} style={{ padding: '8px 16px', border: '1px solid #dc2626', borderRadius: 6, cursor: 'pointer', background: 'transparent', color: '#dc2626' }}>删除</button>
                </div>
              </div>
            </div>
            
            <div style={{ flex: 1, overflow: 'auto', padding: 20, background: '#fff' }}>
              {selectedGroup.group_ids && Array.isArray(selectedGroup.group_ids) && selectedGroup.group_ids.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontWeight: 500, fontSize: 13, color: '#374151', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid #e5e7eb' }}>
                    子群组 ({selectedGroup.group_ids.length}) - 点击展开查看书籍
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {selectedGroup.group_ids.map(groupId => {
                      const subGroup = groups.find(g => g.id === groupId);
                      if (!subGroup) return null;
                      const subBookCount = getGroupBookIds(subGroup.id).length;
                      return (
                        <div key={groupId} style={{ padding: 12, border: '1px solid #e5e7eb', borderRadius: 8, background: '#f9fafb', cursor: 'pointer' }}
                          onClick={() => { setSelectedGroupId(groupId); setSelectedBookId(null); }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ fontWeight: 500, color: '#1f2937' }}>{subGroup.name}</div>
                              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{subBookCount} 本书</div>
                            </div>
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button onClick={(e) => { e.stopPropagation(); setSelectedGroupId(groupId); setSelectedBookId(null); }} style={{ padding: '4px 8px', border: '1px solid #3b82f6', color: '#3b82f6', borderRadius: 4, cursor: 'pointer', background: 'transparent', fontSize: 12 }}>展开</button>
                              <button onClick={(e) => { e.stopPropagation(); handleRemoveSubGroupFromGroup(groupId, selectedGroup.id); }} style={{ padding: '4px 8px', border: '1px solid #dc2626', color: '#dc2626', borderRadius: 4, cursor: 'pointer', background: 'transparent', fontSize: 12 }}>移除</button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid #e5e7eb' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 500, fontSize: 13, color: '#374151' }}>包含书籍 ({selectedGroup.book_ids.length})</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button onClick={selectedGroupBooks.size === selectedGroup.book_ids.length ? deselectAllGroupBooks : selectAllGroupBooks} style={{ padding: '4px 8px', fontSize: 12, border: '1px solid #d1d5db', borderRadius: 4, cursor: 'pointer', background: '#fff' }}>
                      {selectedGroupBooks.size === selectedGroup.book_ids.length ? '取消全选' : '全选'}
                    </button>
                    {selectedGroupBooks.size > 0 && (
                      <button onClick={batchRemoveFromGroup} style={{ padding: '4px 8px', fontSize: 12, border: '1px solid #dc2626', borderRadius: 4, cursor: 'pointer', background: '#fef2f2', color: '#dc2626' }}>
                        移除选中 ({selectedGroupBooks.size})
                      </button>
                    )}
                  </div>
                </div>
                {Array.isArray(selectedGroup.book_ids) && selectedGroup.book_ids.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#9ca3af', padding: 20 }}>此群组暂无直接包含的书籍</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {selectedGroup.book_ids.map(bookId => {
                      const book = books.find(b => b.id === bookId);
                      if (!book) return null;
                      const bookChapters = chapters.filter(c => c.book_id === bookId).sort((a, b) => a.number - b.number);
                      return (
                        <div key={bookId} style={{ padding: 16, border: '1px solid #e5e7eb', borderRadius: 8, background: selectedGroupBooks.has(bookId) ? 'rgba(196, 30, 58, 0.1)' : '#fff' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                            <input type="checkbox" checked={selectedGroupBooks.has(bookId)} onChange={() => toggleGroupBook(bookId)} style={{ marginTop: 2, cursor: 'pointer', accentColor: '#C41E3A' }} />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 500, color: '#1f2937', fontSize: 15 }}>{book.title}</div>
                              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{book.religion} · {book.category} · {bookChapters.length} 章</div>
                            </div>
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button onClick={() => { setEditingBook(book); setEditingGroupBookId(book.id); setShowBookModal(true); }} style={{ padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: 4, cursor: 'pointer', background: '#fff', fontSize: 12 }}>编辑</button>
                              <button onClick={() => { setEditingGroupBookId(book.id); setSelectedBookId(book.id); setSelectedGroupId(null); }} style={{ padding: '4px 8px', border: '1px solid #C41E3A', color: '#C41E3A', borderRadius: 4, cursor: 'pointer', background: 'transparent', fontSize: 12 }}>章节</button>
                              <button onClick={() => handleRemoveBookFromGroup(book.id, selectedGroup.id)} style={{ padding: '4px 8px', border: '1px solid #dc2626', color: '#dc2626', borderRadius: 4, cursor: 'pointer', background: 'transparent', fontSize: 12 }}>移出</button>
                            </div>
                          </div>
                          {bookChapters.length > 0 && (
                            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f3f4f6' }}>
                              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>章节预览：</div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                {bookChapters.slice(0, 5).map(ch => (
                                  <span key={ch.id} style={{ padding: '2px 8px', background: 'rgba(196, 30, 58, 0.1)', color: '#C41E3A', borderRadius: 4, fontSize: 11 }}>{ch.title}</span>
                                ))}
                                {bookChapters.length > 5 && <span style={{ padding: '2px 8px', color: '#9ca3af', fontSize: 11 }}>...</span>}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </>
        ) : selectedBook ? (
          <>
            <div style={{ padding: 20, borderBottom: '1px solid #e5e7eb', background: '#fff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 20, color: '#1f2937' }}>{selectedBook.title}</h2>
                  <div style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>{selectedBook.religion} · {selectedBook.category}</div>
                  <div style={{ fontSize: 13, color: '#9ca3af', marginTop: 8 }}>{selectedBook.description || '暂无描述'}</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => { setEditingBook(selectedBook); setShowBookModal(true); }} style={{ padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', background: '#fff', color: '#1f2937' }}>编辑</button>
                  <button onClick={() => handleDeleteBook(selectedBook.id)} style={{ padding: '8px 16px', border: '1px solid #dc2626', borderRadius: 6, cursor: 'pointer', background: 'transparent', color: '#dc2626' }}>删除</button>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button onClick={() => { setEditingChapter(null); setShowChapterModal(true); }} style={{ padding: '10px 16px', background: '#C41E3A', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}>+ 添加章节</button>
                <button onClick={() => { setImportFile(null); setShowImportModal(true); }} style={{ padding: '10px 16px', background: '#fff', color: '#C41E3A', border: '1px solid #C41E3A', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}>+ 导入章节</button>
              </div>
            </div>
            
            <div style={{ flex: 1, overflow: 'auto', padding: 20, background: '#fff' }}>
              <div style={{ fontWeight: 500, marginBottom: 12, color: '#6b7280' }}>章节列表 ({selectedBookChapters.length})</div>
              {selectedBookChapters.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#9ca3af', padding: 40 }}>暂无章节</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {selectedBookChapters.map((chapter, idx) => (
                    <div key={chapter.id} style={{ padding: 16, border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ padding: '2px 8px', background: 'rgba(196, 30, 58, 0.1)', color: '#C41E3A', borderRadius: 4, fontSize: 12 }}>第{chapter.number}章</span>
                          <span style={{ fontWeight: 500, color: '#1f2937' }}>{chapter.title}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button onClick={() => handleSortChapter(chapter.id, 'up')} disabled={idx === 0} title="上移" style={{ padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: 4, cursor: idx === 0 ? 'not-allowed' : 'pointer', opacity: idx === 0 ? 0.3 : 1, background: '#fff' }}>上</button>
                          <button onClick={() => handleSortChapter(chapter.id, 'down')} disabled={idx === selectedBookChapters.length - 1} title="下移" style={{ padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: 4, cursor: idx === selectedBookChapters.length - 1 ? 'not-allowed' : 'pointer', opacity: idx === selectedBookChapters.length - 1 ? 0.3 : 1, background: '#fff' }}>下</button>
                          <button onClick={() => { setEditingChapter(chapter); setShowChapterModal(true); }} style={{ padding: '4px 8px', border: '1px solid #C41E3A', color: '#C41E3A', borderRadius: 4, cursor: 'pointer', background: 'transparent' }}>编辑</button>
                          <button onClick={() => handleDeleteChapter(chapter.id)} style={{ padding: '4px 8px', border: '1px solid #dc2626', color: '#dc2626', borderRadius: 4, cursor: 'pointer', background: 'transparent' }}>删除</button>
                        </div>
                      </div>
                      <p style={{ fontSize: 13, color: '#6b7280', marginTop: 8, lineHeight: 1.6 }}>{chapter.content?.substring(0, 200)}...</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
            选择一本书籍或群组查看详情
          </div>
        )}
      </div>

      {showBookModal && (
        <BookModal 
          book={editingBook} 
          religions={religions} 
          onSave={handleSaveBook} 
          onClose={() => { setShowBookModal(false); setEditingBook(null); setEditingGroupBookId(null); }} 
        />
      )}
      {showChapterModal && <ChapterModal chapter={editingChapter} onSave={handleSaveChapter} onClose={() => setShowChapterModal(false)} />}
      {showImportModal && <ImportModal onClose={() => setShowImportModal(false)} onFileSelect={handleFileUpload} />}
      {showGroupModal && (
        <GroupModal 
          group={editingGroupSnapshot.current} 
          books={ungroupedBooks} 
          groups={availableParentGroups(editingGroupId || undefined)}
          onSave={handleSaveGroup} 
          onDelete={handleDeleteGroup} 
          onClose={closeGroupModal} 
        />
      )}
      {showSmartImportModal && <SmartImportModalInline onClose={() => setShowSmartImportModal(false)} refreshBooks={loadData} existingBooks={books} />}
      
      {/* 批量移动到群组弹窗 */}
      {showMoveToGroupModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: 24, borderRadius: 12, width: 400, boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <h3 style={{ marginBottom: 16, fontSize: 18, color: '#1f2937' }}>移动到群组</h3>
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>将 {selectedUngroupedBooks.size} 本书籍移动到：</p>
            <div style={{ marginBottom: 20 }}>
              <select value={moveTargetGroupId} onChange={e => setMoveTargetGroupId(e.target.value)} style={{ width: '100%', padding: 12, border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, background: '#fff', color: '#1f2937' }}>
                <option value="">请选择目标群组</option>
                {groups.map(group => (
                  <option key={group.id} value={group.id}>{group.name} ({group.book_ids?.length || 0}本)</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button onClick={() => { setShowMoveToGroupModal(false); setMoveTargetGroupId(''); }} style={{ padding: '10px 20px', border: '1px solid #d1d5db', borderRadius: 8, cursor: 'pointer', background: '#fff', color: '#374151', fontSize: 14 }}>取消</button>
              <button onClick={batchMoveToGroup} disabled={!moveTargetGroupId} style={{ padding: '10px 20px', background: moveTargetGroupId ? '#3b82f6' : '#d1d5db', color: '#fff', border: 'none', borderRadius: 8, cursor: moveTargetGroupId ? 'pointer' : 'not-allowed', fontSize: 14 }}>确认移动</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 书籍弹窗
function BookModal({ book, religions, onSave, onClose }: { book: Book | null; religions: string[]; onSave: (d: Partial<Book>) => void; onClose: () => void }) {
  const [form, setForm] = useState({ title: book?.title || '', religion: book?.religion || '', category: book?.category || '', description: book?.description || '', status: book?.status || 'draft' });
  
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', padding: 24, borderRadius: 12, width: 520, boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
        <h3 style={{ marginBottom: 20, fontSize: 18, color: '#1f2937' }}>{book ? '编辑书籍' : '添加书籍'}</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 500, color: '#374151' }}>书名 *</label>
            <input placeholder="请输入书名" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} style={{ width: '100%', padding: 12, border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, background: '#fff', color: '#1f2937' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 500, color: '#374151' }}>宗教 *</label>
            <input placeholder="如：基督教" value={form.religion} onChange={e => setForm({ ...form, religion: e.target.value })} list="religions" style={{ width: '100%', padding: 12, border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, background: '#fff', color: '#1f2937' }} />
            <datalist id="religions">{religions.map(r => <option key={r} value={r} />)}</datalist>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 500, color: '#374151' }}>分类 *</label>
            <input placeholder="如：旧约" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} style={{ width: '100%', padding: 12, border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, background: '#fff', color: '#1f2937' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 500, color: '#374151' }}>描述</label>
            <textarea placeholder="请输入书籍描述" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={{ width: '100%', padding: 12, border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, minHeight: 80, background: '#fff', color: '#1f2937' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: form.status === 'published' ? '#f0fdf4' : '#fef2f2', borderRadius: 8, border: `1px solid ${form.status === 'published' ? '#22c55e' : '#fca5a5'}` }}>
            <input type="checkbox" id="publishCheckbox" checked={form.status === 'published'} onChange={e => setForm({ ...form, status: e.target.checked ? 'published' : 'draft' })} style={{ width: 18, height: 18, accentColor: '#22c55e', cursor: 'pointer' }} />
            <label htmlFor="publishCheckbox" style={{ cursor: 'pointer', fontSize: 14, fontWeight: 500, color: form.status === 'published' ? '#15803d' : '#dc2626' }}>
              {form.status === 'published' ? '✓ 已发布到前台' : '○ 未发布（前台不可见）'}
            </label>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
          <button onClick={onClose} style={{ padding: '12px 24px', border: '1px solid #d1d5db', borderRadius: 8, cursor: 'pointer', background: '#fff', color: '#374151', fontSize: 14 }}>取消</button>
          <button onClick={() => { if (!form.title) return alert('请填写书名'); onSave(form); }} style={{ padding: '12px 24px', background: '#C41E3A', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>保存</button>
        </div>
      </div>
    </div>
  );
}

// 章节弹窗
function ChapterModal({ chapter, onSave, onClose }: { chapter: Chapter | null; onSave: (d: Partial<Chapter>) => void; onClose: () => void }) {
  const [form, setForm] = useState({ title: chapter?.title || '', number: chapter?.number || 1, content: chapter?.content || '', volume: chapter?.volume || '', status: chapter?.status || 'published' });
  
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', padding: 24, borderRadius: 12, width: 600, maxHeight: '85vh', overflow: 'auto', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
        <h3 style={{ marginBottom: 20, fontSize: 18, color: '#1f2937' }}>{chapter ? '编辑章节' : '添加章节'}</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 500, color: '#374151' }}>章节标题 *</label>
              <input placeholder="请输入章节标题" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} style={{ width: '100%', padding: 12, border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, background: '#fff', color: '#1f2937' }} />
            </div>
            <div style={{ width: 100 }}>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 500, color: '#374151' }}>序号 *</label>
              <input type="number" value={form.number} onChange={e => setForm({ ...form, number: parseInt(e.target.value) || 1 })} style={{ width: '100%', padding: 12, border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, background: '#fff', color: '#1f2937' }} />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 500, color: '#374151' }}>卷/册（可选）</label>
            <input placeholder="如：第一卷" value={form.volume} onChange={e => setForm({ ...form, volume: e.target.value })} style={{ width: '100%', padding: 12, border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, background: '#fff', color: '#1f2937' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 500, color: '#374151' }}>章节内容 *</label>
            <textarea placeholder="请输入章节内容" value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} style={{ width: '100%', padding: 12, border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, minHeight: 200, background: '#fff', color: '#1f2937' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 500, color: '#374151' }}>状态</label>
            <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} style={{ width: '100%', padding: 12, border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, background: '#fff', color: '#1f2937' }}>
              <option value="draft">草稿</option>
              <option value="published">已发布</option>
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
          <button onClick={onClose} style={{ padding: '12px 24px', border: '1px solid #d1d5db', borderRadius: 8, cursor: 'pointer', background: '#fff', color: '#374151', fontSize: 14 }}>取消</button>
          <button onClick={() => { if (!form.title) return alert('请填写章节标题'); onSave(form); }} style={{ padding: '12px 24px', background: '#C41E3A', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>保存</button>
        </div>
      </div>
    </div>
  );
}

// 导入章节弹窗
function ImportModal({ onClose, onFileSelect }: { onClose: () => void; onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', padding: 24, borderRadius: 12, width: 500, boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
        <h3 style={{ marginBottom: 8, fontSize: 18, color: '#1f2937' }}>导入章节</h3>
        <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>选择文件导入到当前书籍的章节中</p>
        <div style={{ border: '2px dashed #d1d5db', borderRadius: 12, padding: 40, textAlign: 'center', cursor: 'pointer', background: '#f9fafb' }} onClick={() => fileInputRef.current?.click()}>
          <input ref={fileInputRef} type="file" accept=".json,.csv,.md,.txt,.xml,.html" onChange={onFileSelect} style={{ display: 'none' }} />
          <div style={{ fontSize: 40, marginBottom: 12, color: '#C41E3A' }}>+</div>
          <div style={{ fontSize: 14, color: '#374151', fontWeight: 500 }}>点击选择文件</div>
          <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 8 }}>支持 JSON、CSV、Markdown、Text、XML、HTML 格式</div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
          <button onClick={onClose} style={{ padding: '12px 24px', border: '1px solid #d1d5db', borderRadius: 8, cursor: 'pointer', background: '#fff', color: '#374151', fontSize: 14 }}>关闭</button>
        </div>
      </div>
    </div>
  );
}

// 群组弹窗
function GroupModal({ group, books, groups, onSave, onDelete, onClose }: { 
  group: BookGroup | null; 
  books: Book[]; 
  groups: BookGroup[];
  onSave: (name: string, religion: string, desc: string, bookIds: string[], groupIds: string[], parentId?: string, status?: string) => void; 
  onDelete: (id: string) => void; 
  onClose: () => void 
}) {
  const [name, setName] = useState(group?.name || '');
  const [religion, setReligion] = useState(group?.religion || '');
  const [description, setDescription] = useState(group?.description || '');
  const [selectedBookIds, setSelectedBookIds] = useState<string[]>(group?.book_ids || []);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>(group?.group_ids || []);
  const [parentId, setParentId] = useState<string | undefined>(group?.parent_id);
  const [status, setStatus] = useState(group?.status || 'draft');
  const religions = [...new Set(books.map(b => b.religion).filter(Boolean))];
  
  const toggleBook = (id: string) => {
    setSelectedBookIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };
  
  const toggleGroup = (id: string) => {
    setSelectedGroupIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };
  
  const selectAllBooks = () => setSelectedBookIds(books.map(b => b.id));
  const deselectAllBooks = () => setSelectedBookIds([]);
  const selectAllGroups = () => setSelectedGroupIds(groups.map(g => g.id));
  const deselectAllGroups = () => setSelectedGroupIds([]);

  const groupedBooks = religions.map(rel => ({
    religion: rel,
    books: books.filter(b => b.religion === rel)
  }));
  
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', padding: 24, borderRadius: 12, width: 680, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid #e5e7eb' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, color: '#1f2937' }}>{group ? '编辑群组' : '新建群组'}</h3>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: '#6b7280' }}>将书籍或子群组归类在一起</p>
          </div>
          {group && <button onClick={() => { onDelete(group.id); }} style={{ padding: '8px 16px', border: '1px solid #dc2626', color: '#dc2626', borderRadius: 8, cursor: 'pointer', background: 'transparent', fontSize: 14 }}>删除群组</button>}
        </div>
        
        <div style={{ flex: 1, overflow: 'auto' }}>
          <div style={{ background: '#f9fafb', padding: 20, borderRadius: 10, marginBottom: 16 }}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 500, color: '#374151' }}>群组名称 *</label>
              <input placeholder="如：旧约、圣经和合本" value={name} onChange={e => setName(e.target.value)} style={{ width: '100%', padding: 12, border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, background: '#fff', color: '#1f2937' }} />
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 500, color: '#374151' }}>宗教分类</label>
                <input placeholder="如：基督教" value={religion} onChange={e => setReligion(e.target.value)} list="group-religions" style={{ width: '100%', padding: 12, border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, background: '#fff', color: '#1f2937' }} />
                <datalist id="group-religions">{religions.map(r => <option key={r} value={r} />)}</datalist>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 500, color: '#374151' }}>父群组（可选）</label>
                <select value={parentId || ''} onChange={e => setParentId(e.target.value || undefined)} style={{ width: '100%', padding: 12, border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, background: '#fff', color: '#1f2937' }}>
                  <option value="">无（顶级群组）</option>
                  {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginTop: 16 }}>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 500, color: '#374151' }}>群组描述</label>
              <input placeholder="简要描述此群组" value={description} onChange={e => setDescription(e.target.value)} style={{ width: '100%', padding: 12, border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, background: '#fff', color: '#1f2937' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16, padding: '12px 16px', background: status === 'published' ? '#f0fdf4' : '#fef2f2', borderRadius: 8, border: `1px solid ${status === 'published' ? '#22c55e' : '#fca5a5'}` }}>
              <input type="checkbox" id="groupPublishCheckbox" checked={status === 'published'} onChange={e => setStatus(e.target.checked ? 'published' : 'draft')} style={{ width: 18, height: 18, accentColor: '#22c55e', cursor: 'pointer' }} />
              <label htmlFor="groupPublishCheckbox" style={{ cursor: 'pointer', fontSize: 14, fontWeight: 500, color: status === 'published' ? '#15803d' : '#dc2626' }}>
                {status === 'published' ? '✓ 已发布到前台（群组将作为一本书籍显示）' : '○ 未发布（前台不可见）'}
              </label>
            </div>
          </div>
          
          {groups.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <label style={{ fontSize: 14, fontWeight: 500, color: '#374151' }}>包含子群组（已选 {selectedGroupIds.length} 个）</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={selectAllGroups} style={{ padding: '6px 14px', border: '1px solid #C41E3A', color: '#C41E3A', borderRadius: 6, cursor: 'pointer', background: 'transparent', fontSize: 13, fontWeight: 500 }}>全选</button>
                  <button onClick={deselectAllGroups} style={{ padding: '6px 14px', border: '1px solid #d1d5db', color: '#6b7280', borderRadius: 6, cursor: 'pointer', background: 'transparent', fontSize: 13 }}>取消</button>
                </div>
              </div>
              <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden', maxHeight: 150, overflowY: 'auto' }}>
                {groups.map(g => (
                  <label key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid #f3f4f6', cursor: 'pointer', background: selectedGroupIds.includes(g.id) ? 'rgba(196, 30, 58, 0.05)' : '#fff' }}>
                    <input type="checkbox" checked={selectedGroupIds.includes(g.id)} onChange={() => toggleGroup(g.id)} style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#C41E3A' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500, fontSize: 14, color: '#1f2937' }}>{g.name}</div>
                      <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{g.religion || '未分类'}</div>
                    </div>
                    {selectedGroupIds.includes(g.id) && (
                      <span style={{ padding: '3px 10px', background: '#C41E3A', color: '#fff', borderRadius: 4, fontSize: 12, fontWeight: 500 }}>已选择</span>
                    )}
                  </label>
                ))}
              </div>
            </div>
          )}
          
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <label style={{ fontSize: 14, fontWeight: 500, color: '#374151' }}>包含书籍（已选 {selectedBookIds.length} 本）</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={selectAllBooks} style={{ padding: '6px 14px', border: '1px solid #C41E3A', color: '#C41E3A', borderRadius: 6, cursor: 'pointer', background: 'transparent', fontSize: 13, fontWeight: 500 }}>全选</button>
                <button onClick={deselectAllBooks} style={{ padding: '6px 14px', border: '1px solid #d1d5db', color: '#6b7280', borderRadius: 6, cursor: 'pointer', background: 'transparent', fontSize: 13 }}>取消</button>
              </div>
            </div>
            
            <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden', maxHeight: 280, overflowY: 'auto' }}>
              {books.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>暂无未分组书籍</div>
              ) : (
                groupedBooks.map((g, gi) => (
                  <div key={g.religion}>
                    {gi > 0 && <div style={{ borderTop: '1px solid #e5e7eb' }} />}
                    <div style={{ padding: '12px 16px', background: 'rgba(196, 30, 58, 0.08)', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 600, fontSize: 14, color: '#C41E3A' }}>{g.religion}</span>
                      <span style={{ fontSize: 12, color: '#9ca3af' }}>({g.books.length} 本)</span>
                      <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                        <button onClick={() => setSelectedBookIds(prev => [...new Set([...prev, ...g.books.map(b => b.id)])])} style={{ padding: '4px 10px', border: '1px solid #C41E3A', color: '#C41E3A', borderRadius: 4, cursor: 'pointer', background: 'transparent', fontSize: 12 }}>全选</button>
                        <button onClick={() => setSelectedBookIds(prev => prev.filter(id => !g.books.find(b => b.id === id)))} style={{ padding: '4px 10px', border: '1px solid #d1d5db', color: '#9ca3af', borderRadius: 4, cursor: 'pointer', background: 'transparent', fontSize: 12 }}>取消</button>
                      </div>
                    </div>
                    {g.books.map(book => (
                      <label key={book.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: '1px solid #f3f4f6', cursor: 'pointer', background: selectedBookIds.includes(book.id) ? 'rgba(196, 30, 58, 0.05)' : '#fff' }}>
                        <input type="checkbox" checked={selectedBookIds.includes(book.id)} onChange={() => toggleBook(book.id)} style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#C41E3A' }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 500, fontSize: 14, color: '#1f2937' }}>{book.title}</div>
                          <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{book.category}</div>
                        </div>
                        {selectedBookIds.includes(book.id) && (
                          <span style={{ padding: '3px 10px', background: '#C41E3A', color: '#fff', borderRadius: 4, fontSize: 12, fontWeight: 500 }}>已选择</span>
                        )}
                      </label>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 20, paddingTop: 16, borderTop: '1px solid #e5e7eb' }}>
          <button onClick={onClose} style={{ padding: '12px 24px', border: '1px solid #d1d5db', borderRadius: 8, cursor: 'pointer', background: '#fff', color: '#374151', fontSize: 14 }}>取消</button>
          <button onClick={() => { if (!name) return alert('请填写群组名称'); onSave(name, religion, description, selectedBookIds, selectedGroupIds, parentId, status); }} style={{ padding: '12px 24px', background: '#C41E3A', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>保存群组</button>
        </div>
      </div>
    </div>
  );
}
