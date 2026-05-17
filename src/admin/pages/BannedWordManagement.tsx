import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Upload,
  X,
  Filter,
  FileText,
} from 'lucide-react';
import { getSupabaseUrl } from '../supabase/client';

// Service Role Key - 绕过 RLS
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkaHdtZWl0dGdkb3Nta3h0cGFrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODEzMjQ5MiwiZXhwIjoyMDkzNzA4NDkyfQ.bPatiu7NXaE2k48aTkjAGQsba6NzXlIdq2k_gGLYLBE';

// 前台发布笔记时需调用违规词检查：
// 遍历 banned_words 表，匹配用户输入的 content
// 匹配到则阻止发布并提示用户可申诉

type BannedWordItem = {
  id: string;
  word: string;
  language?: string;
  category: string;
  severity?: string;
  variants?: string[];
  description?: string;
  created_by: string | null;
  created_at: string;
};

// 语言选项
const languageOptions = [
  { value: 'all', label: '通用' },
  { value: 'zh-CN', label: '简体中文' },
  { value: 'en-US', label: 'English' },
  { value: 'fr-FR', label: 'Français' },
  { value: 'es-ES', label: 'Español' },
  { value: 'ru-RU', label: 'Русский' },
  { value: 'ar-EG', label: 'العربية' },
];

// 类别选项（扩展版本）
const categoryOptions = [
  { value: 'profanity', label: '脏话', color: 'bg-red-100 text-red-700' },
  { value: 'insult', label: '侮辱', color: 'bg-orange-100 text-orange-700' },
  { value: 'drug', label: '毒品', color: 'bg-purple-100 text-purple-700' },
  { value: 'violence', label: '暴力', color: 'bg-red-100 text-red-800' },
  { value: 'sexual', label: '色情', color: 'bg-pink-100 text-pink-700' },
  { value: 'politics', label: '政治', color: 'bg-blue-100 text-blue-700' },
  { value: 'religion_abuse', label: '宗教亵渎', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'spam', label: '垃圾信息', color: 'bg-gray-100 text-gray-700' },
  { value: 'general', label: '通用', color: 'bg-gray-100 text-gray-700' },
  { value: 'other', label: '其他', color: 'bg-gray-100 text-gray-700' },
];

// 兼容旧类别名称的映射
const categoryMapping: Record<string, string> = {
  'political': 'politics',
  'obscene': 'sexual',
  'porn': 'sexual',
  'violence': 'violence',
  'religion': 'religion_abuse',
  'general': 'general',
  'other': 'other',
};

const getCategoryBadge = (category: string) => {
  // 映射旧类别名称到新名称
  const mappedCategory = categoryMapping[category] || category;
  const option = categoryOptions.find((o) => o.value === mappedCategory);
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${option?.color || 'bg-gray-100 text-gray-700'}`}>
      {option?.label || category}
    </span>
  );
};

const getLanguageBadge = (language: string) => {
  const option = languageOptions.find((o) => o.value === language);
  return option?.label || language;
};

export default function BannedWordManagement() {
  const [words, setWords] = useState<BannedWordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [languageFilter, setLanguageFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [editingWord, setEditingWord] = useState<BannedWordItem | null>(null);
  const [formData, setFormData] = useState({
    word: '',
    language: 'all',
    category: 'general',
    severity: 'medium',
    variants: '',
    description: '',
  });
  const [batchContent, setBatchContent] = useState('');
  const [batchLanguage, setBatchLanguage] = useState('all');
  const [batchCategory, setBatchCategory] = useState('general');
  const [processing, setProcessing] = useState(false);
  const [stats, setStats] = useState({ total: 0, byCategory: {} as Record<string, number>, byLanguage: {} as Record<string, number> });
  const pageSize = 10;

  const supabaseUrl = getSupabaseUrl();

  const loadWords = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        select: '*',
        order: 'category.asc,created_at.desc',
      });

      if (categoryFilter !== 'all') {
        params.set('category', `eq.${categoryFilter}`);
      }

      const res = await fetch(`${supabaseUrl}/rest/v1/banned_words?${params}`, {
        headers: {
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        },
      });
      const data = await res.json();
      const wordsData = Array.isArray(data) ? data : [];
      setWords(wordsData);
      
      // 计算统计数据
      const byCategory: Record<string, number> = {};
      const byLanguage: Record<string, number> = {};
      wordsData.forEach((word: BannedWordItem) => {
        byCategory[word.category] = (byCategory[word.category] || 0) + 1;
        const lang = word.language || 'all';
        byLanguage[lang] = (byLanguage[lang] || 0) + 1;
      });
      setStats({
        total: wordsData.length,
        byCategory,
        byLanguage,
      });
    } catch (error) {
      console.error('加载违规词失败:', error);
      setWords([]);
    }
    setLoading(false);
  }, [supabaseUrl, categoryFilter]);

  useEffect(() => {
    loadWords();
  }, [loadWords]);

  // 过滤
  const filteredWords = words.filter((word) => {
    if (searchQuery) {
      return word.word.toLowerCase().includes(searchQuery.toLowerCase());
    }
    if (languageFilter !== 'all') {
      return (word.language || 'all') === languageFilter;
    }
    return true;
  });

  // 添加违规词
  const handleAdd = async () => {
    if (!formData.word.trim()) {
      alert('请输入违规词');
      return;
    }

    setProcessing(true);
    try {
      // 解析变体词（逗号分隔）
      const variantsArray = formData.variants
        ? formData.variants.split(',').map(v => v.trim()).filter(v => v)
        : [];
      
      await fetch(`${supabaseUrl}/rest/v1/banned_words`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify([{
          word: formData.word.trim(),
          language: formData.language,
          category: formData.category,
          severity: formData.severity,
          variants: variantsArray,
          description: formData.description,
          created_at: new Date().toISOString(),
        }]),
      });
      await loadWords();
      setShowModal(false);
      setFormData({ word: '', language: 'all', category: 'general', severity: 'medium', variants: '', description: '' });
      setEditingWord(null);
    } catch (error) {
      console.error('添加失败:', error);
      alert('添加失败');
    }
    setProcessing(false);
  };

  // 编辑违规词
  const handleEdit = async () => {
    if (!editingWord || !formData.word.trim()) {
      alert('请输入违规词');
      return;
    }

    setProcessing(true);
    try {
      // 解析变体词（逗号分隔）
      const variantsArray = formData.variants
        ? formData.variants.split(',').map(v => v.trim()).filter(v => v)
        : [];
      
      await fetch(`${supabaseUrl}/rest/v1/banned_words?id=eq.${editingWord.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          word: formData.word.trim(),
          language: formData.language,
          category: formData.category,
          severity: formData.severity,
          variants: variantsArray,
          description: formData.description,
        }),
      });
      await loadWords();
      setShowModal(false);
      setFormData({ word: '', language: 'all', category: 'general', severity: 'medium', variants: '', description: '' });
      setEditingWord(null);
    } catch (error) {
      console.error('编辑失败:', error);
      alert('编辑失败');
    }
    setProcessing(false);
  };

  // 删除违规词
  const handleDelete = async (id: string) => {
    if (!confirm('确定删除此违规词吗？')) return;

    setProcessing(true);
    try {
      await fetch(`${supabaseUrl}/rest/v1/banned_words?id=eq.${id}`, {
        method: 'DELETE',
        headers: {
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        },
      });
      await loadWords();
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败');
    }
    setProcessing(false);
  };

  // 批量导入
  const handleBatchImport = async () => {
    if (!batchContent.trim()) {
      alert('请输入违规词内容');
      return;
    }

    const wordsToImport = batchContent
      .split('\n')
      .map(line => line.trim())
      .filter(line => line);

    if (wordsToImport.length === 0) {
      alert('没有有效的违规词');
      return;
    }

    if (!confirm(`确定批量导入 ${wordsToImport.length} 个违规词吗？`)) return;

    setProcessing(true);
    try {
      await fetch(`${supabaseUrl}/rest/v1/banned_words`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify(
          wordsToImport.map(word => ({
            word,
            language: batchLanguage,
            category: batchCategory,
            created_at: new Date().toISOString(),
          }))
        ),
      });
      await loadWords();
      setShowBatchModal(false);
      setBatchContent('');
      setBatchLanguage('all');
      setBatchCategory('general');
      alert(`成功导入 ${wordsToImport.length} 个违规词`);
    } catch (error) {
      console.error('批量导入失败:', error);
      alert('批量导入失败');
    }
    setProcessing(false);
  };

  const startEdit = (word: BannedWordItem) => {
    setEditingWord(word);
    setFormData({ 
      word: word.word, 
      language: word.language || 'all',
      category: categoryMapping[word.category] || word.category,
      severity: word.severity || 'medium',
      variants: word.variants?.join(', ') || '',
      description: word.description || '',
    });
    setShowModal(true);
  };

  const openAddModal = () => {
    setEditingWord(null);
    setFormData({ word: '', language: 'all', category: 'general', severity: 'medium', variants: '', description: '' });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({ word: '', language: 'all', category: 'general', severity: 'medium', variants: '', description: '' });
  };

  return (
    <div className="p-6">
      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="text-2xl font-bold text-[#E11D48]">{stats.total}</div>
          <div className="text-sm text-gray-500">总违规词数</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="text-2xl font-bold text-orange-600">{stats.byCategory['insult'] || stats.byCategory['general'] || 0}</div>
          <div className="text-sm text-gray-500">侮辱/脏话</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="text-2xl font-bold text-purple-600">{stats.byCategory['drug'] || 0}</div>
          <div className="text-sm text-gray-500">毒品相关</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="text-2xl font-bold text-yellow-600">{stats.byCategory['religion_abuse'] || 0}</div>
          <div className="text-sm text-gray-500">宗教亵渎</div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">违规词库管理</h1>
          <p className="text-sm text-gray-500 mt-1">
            支持多语言违规词过滤，前台发布笔记/消息/评论时会自动检查
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowBatchModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors"
          >
            <Upload className="w-4 h-4" />
            批量导入
          </button>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-[#E11D48] text-white rounded-lg hover:bg-[#C41E3A] transition-colors"
          >
            <Plus className="w-4 h-4" />
            添加违规词
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜索违规词..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-10 pr-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E11D48] focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              className="h-10 px-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E11D48] focus:border-transparent"
            >
              <option value="all">全部分类</option>
              {categoryOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <select
              value={languageFilter}
              onChange={(e) => {
                setLanguageFilter(e.target.value);
                setPage(1);
              }}
              className="h-10 px-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E11D48] focus:border-transparent"
            >
              <option value="all">全部语言</option>
              {languageOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="ml-auto text-sm text-gray-500">
            共 {filteredWords.length} 个违规词
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">违规词</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">语言</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">分类</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">添加时间</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  加载中...
                </td>
              </tr>
            ) : filteredWords.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  暂无违规词
                </td>
              </tr>
            ) : (
              filteredWords.slice((page - 1) * pageSize, page * pageSize).map((word) => (
                <tr key={word.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                      <span className="font-medium text-gray-900">{word.word}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                      {getLanguageBadge(word.language || 'all')}
                    </span>
                  </td>
                  <td className="px-4 py-3">{getCategoryBadge(word.category)}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(word.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => startEdit(word)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="编辑"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(word.id)}
                        disabled={processing}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            共 {filteredWords.length} 条记录，第 {page} / {Math.ceil(filteredWords.length / pageSize)} 页
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
              className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page >= Math.ceil(filteredWords.length / pageSize)}
              className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingWord ? '编辑违规词' : '添加违规词'}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Word */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    违规词 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.word}
                    onChange={(e) => setFormData({ ...formData, word: e.target.value })}
                    placeholder="请输入违规词"
                    className="w-full h-10 px-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E11D48] focus:border-transparent"
                  />
                </div>

                {/* Language */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    语言 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.language}
                    onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                    className="w-full h-10 px-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E11D48] focus:border-transparent"
                  >
                    {languageOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    选择"通用"将应用于所有语言
                  </p>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    分类 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full h-10 px-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E11D48] focus:border-transparent"
                  >
                    {categoryOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Severity */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    严重程度
                  </label>
                  <select
                    value={formData.severity}
                    onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                    className="w-full h-10 px-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E11D48] focus:border-transparent"
                  >
                    <option value="low">低</option>
                    <option value="medium">中</option>
                    <option value="high">高</option>
                  </select>
                </div>

                {/* Variants */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    变体词（可选）
                  </label>
                  <input
                    type="text"
                    value={formData.variants}
                    onChange={(e) => setFormData({ ...formData, variants: e.target.value })}
                    placeholder="输入常见变体，用逗号分隔，如: 傻比,傻屌"
                    className="w-full h-10 px-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E11D48] focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    常见规避手段，如谐音、简写等
                  </p>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    描述（可选）
                  </label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="简要描述该违规词的来源或用途"
                    className="w-full h-10 px-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E11D48] focus:border-transparent"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={editingWord ? handleEdit : handleAdd}
                  disabled={processing}
                  className="flex-1 py-2.5 bg-[#E11D48] text-white rounded-lg hover:bg-[#C41E3A] transition-colors disabled:opacity-50"
                >
                  {editingWord ? '保存' : '添加'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Batch Import Modal */}
      {showBatchModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">批量导入违规词</h2>
                <button
                  onClick={() => setShowBatchModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Batch Content */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    违规词内容 <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={batchContent}
                    onChange={(e) => setBatchContent(e.target.value)}
                    placeholder="请输入违规词，每行一个&#10;示例：&#10;违规词1&#10;违规词2&#10;违规词3"
                    rows={8}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E11D48] focus:border-transparent resize-none font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    每行一个违规词，空行将被忽略
                  </p>
                </div>

                {/* Language */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    语言 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={batchLanguage}
                    onChange={(e) => setBatchLanguage(e.target.value)}
                    className="w-full h-10 px-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E11D48] focus:border-transparent"
                  >
                    {languageOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    统一分类 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={batchCategory}
                    onChange={(e) => setBatchCategory(e.target.value)}
                    className="w-full h-10 px-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E11D48] focus:border-transparent"
                  >
                    {categoryOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Preview */}
              {batchContent.trim() && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                    <FileText className="w-4 h-4" />
                    <span>预览: 共 {batchContent.split('\n').filter(line => line.trim()).length} 个违规词</span>
                  </div>
                  <div className="max-h-32 overflow-y-auto text-xs text-gray-500">
                    {batchContent.split('\n').filter(line => line.trim()).map((line, idx) => (
                      <div key={idx}>• {line.trim()}</div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowBatchModal(false);
                    setBatchContent('');
                  }}
                  className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleBatchImport}
                  disabled={processing || !batchContent.trim()}
                  className="flex-1 py-2.5 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors disabled:opacity-50"
                >
                  <Upload className="w-4 h-4 inline mr-1" />
                  导入
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
