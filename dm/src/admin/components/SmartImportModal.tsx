/* @sideEffects */
import React, { useState, useRef, useEffect } from 'react';

interface Book {
  id: string;
  title: string;
  religion: string;
  category: string;
  description: string;
  status: string;
  group_id?: string;
}

// Service Role Key for admin operations
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkaHdtZWl0dGdkb3Nta3h0cGFrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODEzMjQ5MiwiZXhwIjoyMDkzNzA4NDkyfQ.bPatiu7NXaE2k48aTkjAGQsba6NzXlIdq2k_gGLYLBE';

// 生成唯一ID (UUID格式)
const generateId = () => crypto.randomUUID();

// 智能导入书籍弹窗（完整4步流程）
export default function SmartImportModal({ onClose, onImportComplete, refreshBooks, existingBooks }: { 
  onClose: () => void; 
  onImportComplete?: (importedIds: string[]) => void;
  refreshBooks: () => void;
  existingBooks?: Book[];
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<'upload' | 'preview' | 'editing' | 'done'>('upload');
  const [rawData, setRawData] = useState('');
  const [parsedBooks, setParsedBooks] = useState<any[]>([]);
  const [duplicateBooks, setDuplicateBooks] = useState<string[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [importedIds, setImportedIds] = useState<string[]>([]);
  const [editingBookIndex, setEditingBookIndex] = useState(0);
  
  // 获取已存在的书名集合（用于去重）
  const existingTitles = new Set((existingBooks || []).map(b => b.title?.trim().toLowerCase()));

  // 智能解析 JSON
  const parseJSON = (content: string): any[] => {
    try {
      const data = JSON.parse(content);
      if (Array.isArray(data)) {
        return data.map((item, index) => parseSingleBook(item, `书籍${index + 1}`));
      }
      if (data.books && Array.isArray(data.books)) {
        return data.books.map((item: any, index: number) => parseSingleBook(item, `书籍${index + 1}`));
      }
      if (data.old_testament || data.new_testament) {
        const books: any[] = [];
        if (Array.isArray(data.old_testament)) {
          data.old_testament.forEach((item: any) => books.push(parseSingleBook(item, item.name || item.title)));
        }
        if (Array.isArray(data.new_testament)) {
          data.new_testament.forEach((item: any) => books.push(parseSingleBook(item, item.name || item.title)));
        }
        return books;
      }
      if (data.name || data.title || data.book) {
        return [parseSingleBook(data, data.name || data.title || data.book || '未知书籍')];
      }
      if (data.book) {
        return [parseSingleBook({ name: data.book, chapters: data.content || data.verses || [] }, data.book)];
      }
      return [];
    } catch (e) {
      console.error('Parse error:', e);
      return [];
    }
  };

  const parseSingleBook = (item: any, fallbackName: string): any => {
    const title = item.name || item.title || item.book || fallbackName;
    const chapters: any[] = [];
    
    // 解析章节
    const sections = item.sections || item.chapters || item.content || [];
    
    if (Array.isArray(sections)) {
      sections.forEach((section: any, idx: number) => {
        const chapterTitle = section.name || section.title || section.heading || `第${idx + 1}章`;
        const content = section.content || section.text || section.body || '';
        chapters.push({
          title: chapterTitle,
          content: typeof content === 'string' ? content : JSON.stringify(content),
          number: idx + 1
        });
      });
    } else if (typeof sections === 'string') {
      // 整个内容作为一个章节
      chapters.push({
        title: title,
        content: sections,
        number: 1
      });
    }
    
    return {
      title,
      religion: item.religion || item.category || '',
      category: item.category || '经典',
      description: item.description || '',
      chapters
    };
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { 
      const result = ev.target?.result;
      if (typeof result === 'string') {
        setRawData(result);
      }
    };
    reader.readAsText(file);
  };

  const handleParse = () => {
    // 确保 rawData 是字符串
    const dataStr = String(rawData || '');
    if (!dataStr.trim()) {
      setImportErrors(['请先粘贴或上传内容']);
      return;
    }
    
    const books = parseJSON(dataStr);
    if (books.length === 0) { setImportErrors(['无法解析数据，请检查格式是否正确']); return; }
    const errors: string[] = [];
    const duplicates: string[] = [];
    
    books.forEach((book: any, index: number) => {
      if (!book.title) errors.push(`书籍 ${index + 1}: 缺少标题`);
      if (book.chapters.length === 0) errors.push(`书籍 "${book.title}": 未找到章节`);
      
      // 检查是否已存在
      if (existingTitles.has(book.title?.trim().toLowerCase())) {
        duplicates.push(book.title);
      }
    });
    
    setParsedBooks(books);
    setDuplicateBooks(duplicates);
    setImportErrors(errors);
    setStep('preview');
  };

  const updateBook = (index: number, updates: any) => {
    setParsedBooks(prev => prev.map((book, i) => i === index ? { ...book, ...updates } : book));
  };

  const updateChapter = (bookIndex: number, chIndex: number, updates: any) => {
    setParsedBooks(prev => prev.map((book, i) => {
      if (i !== bookIndex) return book;
      const newChapters = book.chapters.map((ch: any, ci: number) => 
        ci === chIndex ? { ...ch, ...updates } : ch
      );
      return { ...book, chapters: newChapters };
    }));
  };

  const addChapter = (bookIndex: number) => {
    setParsedBooks(prev => prev.map((book, i) => {
      if (i !== bookIndex) return book;
      const newNumber = book.chapters.length + 1;
      return { ...book, chapters: [...book.chapters, { title: `第${newNumber}章`, content: '', number: newNumber }] };
    }));
  };

  const removeChapter = (bookIndex: number, chIndex: number) => {
    setParsedBooks(prev => prev.map((book, i) => {
      if (i !== bookIndex) return book;
      const newChapters = book.chapters.filter((_: any, ci: number) => ci !== chIndex)
        .map((ch: any, ci: number) => ({ ...ch, number: ci + 1 }));
      return { ...book, chapters: newChapters };
    }));
  };

  const executeImport = async () => {
    setImportProgress(0);
    const ids: string[] = [];
    
    for (let i = 0; i < parsedBooks.length; i++) {
      const book = parsedBooks[i];
      
      // 创建书籍
      const bookId = generateId();
      const bookRes = await fetch('/sb-api/rest/v1/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SERVICE_ROLE_KEY, 'Authorization': 'Bearer ' + SERVICE_ROLE_KEY },
        body: JSON.stringify({
          id: bookId,
          title: book.title,
          religion: book.religion,
          category: book.category,
          description: book.description,
          status: 'draft'
        })
      });
      
      if (bookRes.ok) {
        ids.push(bookId);
        
        // 创建章节
        for (const ch of book.chapters) {
          const chId = generateId();
          await fetch('/sb-api/rest/v1/chapters', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': SERVICE_ROLE_KEY, 'Authorization': 'Bearer ' + SERVICE_ROLE_KEY },
            body: JSON.stringify({
              id: chId,
              book_id: bookId,
              number: ch.number,
              title: ch.title,
              content: ch.content,
              status: 'published'
            })
          });
        }
      }
      
      setImportProgress(Math.round(((i + 1) / parsedBooks.length) * 100));
    }
    
    setImportedIds(ids);
    setImportProgress(100);
    setStep('done');
    if (onImportComplete) onImportComplete(ids);
    refreshBooks();
  };

  const handleClose = () => {
    setStep('upload');
    setRawData('');
    setParsedBooks([]);
    setImportErrors([]);
    setDuplicateBooks([]);
    setImportedIds([]);
    setImportProgress(0);
    onClose();
  };

  const charCount = rawData.length;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', borderRadius: 12, width: '90%', maxWidth: 700, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        {/* 标题栏 */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#1f2937' }}>智能导入书籍</h2>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#6b7280' }}>
              {step === 'upload' && '步骤 1/4: 上传或粘贴内容'}
              {step === 'preview' && '步骤 2/4: 预览解析结果'}
              {step === 'editing' && '步骤 3/4: 编辑章节内容'}
              {step === 'done' && '导入完成'}
            </p>
          </div>
          <button onClick={handleClose} style={{ padding: 8, border: 'none', background: 'transparent', cursor: 'pointer', borderRadius: 6 }}>
            ✕
          </button>
        </div>
        
        {/* 进度指示 */}
        <div style={{ display: 'flex', padding: '0 24px' }}>
          {['upload', 'preview', 'editing', 'done'].map((s, i) => (
            <div key={s} style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
              <div style={{ 
                width: 24, height: 24, borderRadius: '50%', 
                background: (step === s || ['upload', 'preview', 'editing', 'done'].indexOf(step) > ['upload', 'preview', 'editing', 'done'].indexOf(s)) ? '#3b82f6' : '#e5e7eb',
                color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 500
              }}>
                {i + 1}
              </div>
              {i < 3 && <div style={{ flex: 1, height: 2, background: ['upload', 'preview', 'editing', 'done'].indexOf(step) > i ? '#3b82f6' : '#e5e7eb' }} />}
            </div>
          ))}
        </div>
        
        {/* 内容区 */}
        <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
          {step === 'upload' && (
            <div>
              <div style={{ border: '2px dashed #d1d5db', borderRadius: 12, padding: 24, textAlign: 'center', marginBottom: 16 }}>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".json,.txt,.csv" style={{ display: 'none' }} />
                <button onClick={() => fileInputRef.current?.click()} style={{ padding: '12px 24px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}>
                  选择文件
                </button>
                <p style={{ margin: '12px 0 0', color: '#6b7280', fontSize: 13 }}>支持 JSON, TXT, CSV 格式</p>
              </div>
              
              <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#374151', fontSize: 14, fontWeight: 500 }}>或粘贴内容:</span>
                <span style={{ color: '#6b7280', fontSize: 12 }}>{charCount} 字符</span>
              </div>
              <textarea
                value={rawData}
                onChange={(e) => setRawData(e.target.value)}
                placeholder='粘贴 JSON 格式的书籍数据，例如:\n[\n  {"title": "创世记", "chapters": [...]}\n]'
                style={{ width: '100%', height: 300, padding: 12, border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, fontFamily: 'monospace', resize: 'vertical' }}
              />
              
              {importErrors.length > 0 && (
                <div style={{ marginTop: 12, padding: 12, background: '#fef2f2', borderRadius: 8, border: '1px solid #fecaca' }}>
                  {importErrors.map((err, i) => <p key={i} style={{ color: '#dc2626', fontSize: 13, margin: '4px 0' }}>{err}</p>)}
                </div>
              )}
            </div>
          )}
          
          {step === 'preview' && (
            <div>
              <div style={{ marginBottom: 16, padding: 12, background: parsedBooks.length > 0 ? '#ecfdf5' : '#fef2f2', borderRadius: 8 }}>
                <p style={{ color: parsedBooks.length > 0 ? '#059669' : '#dc2626', fontSize: 14, fontWeight: 500 }}>
                  解析成功，共 {parsedBooks.length} 本书
                </p>
              </div>
              
              {duplicateBooks.length > 0 && (
                <div style={{ marginBottom: 16, padding: 12, background: '#fef3c7', borderRadius: 8 }}>
                  <p style={{ color: '#d97706', fontSize: 14, fontWeight: 500, marginBottom: 8 }}>以下书籍可能已存在:</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {duplicateBooks.map((name, i) => (
                      <span key={i} style={{ padding: '4px 12px', background: '#fff', borderRadius: 16, fontSize: 12, color: '#d97706' }}>{name}</span>
                    ))}
                  </div>
                </div>
              )}
              
              {importErrors.length > 0 && (
                <div style={{ marginBottom: 16, padding: 12, background: '#fef2f2', borderRadius: 8 }}>
                  {importErrors.map((err, i) => <p key={i} style={{ color: '#dc2626', fontSize: 13, margin: '4px 0' }}>{err}</p>)}
                </div>
              )}
              
              <div style={{ maxHeight: 300, overflow: 'auto' }}>
                {parsedBooks.map((book, i) => (
                  <div key={i} style={{ padding: 12, border: '1px solid #e5e7eb', borderRadius: 8, marginBottom: 8 }}>
                    <p style={{ fontWeight: 500, color: '#1f2937', marginBottom: 4 }}>{book.title}</p>
                    <p style={{ fontSize: 12, color: '#6b7280' }}>{book.chapters.length} 章</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {step === 'editing' && (
            <div>
              <div style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {parsedBooks.map((book, i) => (
                  <button
                    key={i}
                    onClick={() => setEditingBookIndex(i)}
                    style={{ padding: '8px 16px', borderRadius: 8, border: editingBookIndex === i ? '2px solid #3b82f6' : '1px solid #d1d5db', background: editingBookIndex === i ? '#eff6ff' : '#fff', cursor: 'pointer', fontSize: 13 }}
                  >
                    {book.title}
                  </button>
                ))}
              </div>
              
              {parsedBooks[editingBookIndex] && (
                <div>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', marginBottom: 4, fontSize: 13, color: '#374151' }}>书名</label>
                    <input
                      type="text"
                      value={parsedBooks[editingBookIndex].title}
                      onChange={(e) => updateBook(editingBookIndex, { title: e.target.value })}
                      style={{ width: '100%', padding: 8, border: '1px solid #d1d5db', borderRadius: 6 }}
                    />
                  </div>
                  
                  {parsedBooks[editingBookIndex].chapters.map((ch: any, ci: number) => (
                    <div key={ci} style={{ marginBottom: 16, padding: 12, border: '1px solid #e5e7eb', borderRadius: 8 }}>
                      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                        <input
                          type="text"
                          value={ch.title}
                          onChange={(e) => updateChapter(editingBookIndex, ci, { title: e.target.value })}
                          style={{ flex: 1, padding: 6, border: '1px solid #d1d5db', borderRadius: 4, fontSize: 13 }}
                          placeholder="章节标题"
                        />
                        <button onClick={() => removeChapter(editingBookIndex, ci)} style={{ padding: '4px 8px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>删除</button>
                      </div>
                      <textarea
                        value={ch.content}
                        onChange={(e) => updateChapter(editingBookIndex, ci, { content: e.target.value })}
                        style={{ width: '100%', height: 100, padding: 8, border: '1px solid #d1d5db', borderRadius: 4, fontSize: 12, fontFamily: 'inherit', resize: 'vertical' }}
                        placeholder="章节内容"
                      />
                    </div>
                  ))}
                  
                  <button onClick={() => addChapter(editingBookIndex)} style={{ padding: '8px 16px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>
                    + 添加章节
                  </button>
                </div>
              )}
            </div>
          )}
          
          {step === 'done' && (
            <div style={{ textAlign: 'center', padding: 32 }}>
              <div style={{ width: 64, height: 64, background: '#22c55e', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 32 }}>✓</div>
              <h3 style={{ color: '#1f2937', marginBottom: 8 }}>导入成功</h3>
              <p style={{ color: '#6b7280', marginBottom: 24 }}>已成功导入 {importedIds.length} 本书，共 {parsedBooks.reduce((acc, b) => acc + b.chapters.length, 0)} 章</p>
              <button onClick={handleClose} style={{ padding: '12px 32px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}>完成</button>
            </div>
          )}
        </div>
        
        {/* 底部按钮 */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f9fafb' }}>
          <div>{step === 'editing' && parsedBooks.length > 1 && <button onClick={() => setStep('preview')} style={{ padding: '10px 16px', border: '1px solid #d1d5db', borderRadius: 8, cursor: 'pointer', background: '#fff', color: '#374151', fontSize: 14 }}>← 返回预览</button>}</div>
          <div style={{ display: 'flex', gap: 12 }}>
            {step === 'upload' && <><button onClick={handleClose} style={{ padding: '10px 20px', border: '1px solid #d1d5db', borderRadius: 8, cursor: 'pointer', background: '#fff', color: '#374151', fontSize: 14 }}>取消</button><button onClick={handleParse} disabled={!String(rawData || '').trim()} style={{ padding: '10px 20px', background: String(rawData || '').trim() ? '#3b82f6' : '#d1d5db', color: '#fff', border: 'none', borderRadius: 8, cursor: String(rawData || '').trim() ? 'pointer' : 'not-allowed', fontSize: 14, fontWeight: 500 }}>下一步 →</button></>}
            {step === 'preview' && <><button onClick={() => setStep('upload')} style={{ padding: '10px 20px', border: '1px solid #d1d5db', borderRadius: 8, cursor: 'pointer', background: '#fff', color: '#374151', fontSize: 14 }}>上一步</button><button onClick={() => setStep('editing')} disabled={parsedBooks.length === 0} style={{ padding: '10px 20px', background: parsedBooks.length ? '#3b82f6' : '#d1d5db', color: '#fff', border: 'none', borderRadius: 8, cursor: parsedBooks.length ? 'pointer' : 'not-allowed', fontSize: 14, fontWeight: 500 }}>编辑章节 →</button></>}
            {step === 'editing' && <><button onClick={() => setStep('preview')} style={{ padding: '10px 20px', border: '1px solid #d1d5db', borderRadius: 8, cursor: 'pointer', background: '#fff', color: '#374151', fontSize: 14 }}>上一步</button><button onClick={executeImport} style={{ padding: '10px 20px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>开始导入 ✓</button></>}
            {step === 'done' && <button onClick={handleClose} style={{ padding: '10px 20px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>完成</button>}
          </div>
        </div>
      </div>
    </div>
  );
}
