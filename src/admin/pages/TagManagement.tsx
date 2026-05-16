import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Edit2, Trash2, Tag, Filter, ChevronDown, Save, X } from 'lucide-react';
import { getSupabaseUrl } from '../supabase/client';

// Service Role Key - 绕过 RLS
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkaHdtZWl0dGdkb3Nta3h0cGFrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODEzMjQ5MiwiZXhwIjoyMDkzNzA4NDkyfQ.bPatiu7NXaE2k48aTkjAGQsba6NzXlIdq2k_gGLYLBE';

type TagItem = {
  id: string;
  name: string;
  category: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
};

type CategoryOption = {
  value: string;
  label: string;
  description: string;
};

const CATEGORIES: CategoryOption[] = [
  { value: 'identity', label: '身份标签', description: '用户身份标识' },
  { value: 'homepage', label: '首页标签', description: '首页推荐分类' },
  { value: 'post', label: '笔记标签', description: '笔记内容标签' },
  { value: 'group', label: '群聊标签', description: '群聊分类标签' },
];

const CATEGORY_COLORS: Record<string, string> = {
  identity: 'bg-purple-100 text-purple-700',
  homepage: 'bg-blue-100 text-blue-700',
  post: 'bg-green-100 text-green-700',
  group: 'bg-orange-100 text-orange-700',
};

const getCategoryLabel = (category: string) => {
  const cat = CATEGORIES.find(c => c.value === category);
  return cat?.label || category;
};

export default function TagManagement() {
  const [tags, setTags] = useState<TagItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingTag, setEditingTag] = useState<TagItem | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'post',
    sort_order: 0,
    is_active: true,
  });
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [editingSortId, setEditingSortId] = useState<string | null>(null);
  const [sortValue, setSortValue] = useState<number>(0);

  const supabaseUrl = getSupabaseUrl();

  const loadTags = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        select: '*',
        order: 'category.asc,sort_order.asc',
      });
      
      const res = await fetch(`${supabaseUrl}/rest/v1/tags?${params}`, {
        headers: {
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        },
      });
      const data = await res.json();
      setTags(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('加载标签失败:', error);
      setTags([]);
    }
    setLoading(false);
  }, [supabaseUrl]);

  useEffect(() => {
    loadTags();
  }, [loadTags]);

  // 按分类分组显示
  const groupedTags = tags.reduce((acc, tag) => {
    if (!acc[tag.category]) {
      acc[tag.category] = [];
    }
    acc[tag.category].push(tag);
    return acc;
  }, {} as Record<string, TagItem[]>);

  // 过滤后的分类
  const filteredCategories = categoryFilter === 'all' 
    ? CATEGORIES 
    : CATEGORIES.filter(c => c.value === categoryFilter);

  // 过滤标签
  const filterTags = (categoryTags: TagItem[]) => {
    if (!searchQuery) return categoryTags;
    return categoryTags.filter(tag => 
      tag.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const handleSave = async () => {
    try {
      if (!formData.name.trim()) {
        alert('请填写标签名称');
        return;
      }

      const headers = {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      };

      if (editingTag) {
        // 编辑
        await fetch(`${supabaseUrl}/rest/v1/tags?id=eq.${editingTag.id}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            name: formData.name,
            category: formData.category,
            sort_order: formData.sort_order,
            is_active: formData.is_active,
          }),
        });
      } else {
        // 新增
        const maxSort = tags.filter(t => t.category === formData.category)
          .reduce((max, t) => Math.max(max, t.sort_order), 0);
        await fetch(`${supabaseUrl}/rest/v1/tags`, {
          method: 'POST',
          headers,
          body: JSON.stringify([{
            name: formData.name,
            category: formData.category,
            sort_order: formData.sort_order || maxSort + 1,
            is_active: formData.is_active,
            created_at: new Date().toISOString(),
          }]),
        });
      }

      await loadTags();
      setShowModal(false);
      setEditingTag(null);
      setFormData({ name: '', category: 'post', sort_order: 0, is_active: true });
    } catch (error) {
      console.error('保存失败:', error);
      alert('保存失败');
    }
  };

  const handleEdit = (tag: TagItem) => {
    setEditingTag(tag);
    setFormData({
      name: tag.name,
      category: tag.category,
      sort_order: tag.sort_order,
      is_active: tag.is_active,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除此标签吗？')) return;
    
    await fetch(`${supabaseUrl}/rest/v1/tags?id=eq.${id}`, {
      method: 'DELETE',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      },
    });
    await loadTags();
  };

  const handleBatchSort = async (tag: TagItem) => {
    await fetch(`${supabaseUrl}/rest/v1/tags?id=eq.${tag.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ sort_order: sortValue }),
    });
    setEditingSortId(null);
    await loadTags();
  };

  const startEditSort = (tag: TagItem) => {
    setEditingSortId(tag.id);
    setSortValue(tag.sort_order);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">标签管理</h1>
        <button
          onClick={() => {
            setEditingTag(null);
            setFormData({ name: '', category: 'post', sort_order: 0, is_active: true });
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-[#E11D48] text-white rounded-lg hover:bg-[#C41E3A] transition-colors"
        >
          <Plus className="w-4 h-4" />
          添加标签
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-6">
        <div className="flex flex-wrap gap-4">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜索标签名称..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-10 pr-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E11D48] focus:border-transparent"
              />
            </div>
          </div>

          {/* Category Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-10 pl-10 pr-8 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E11D48] focus:border-transparent appearance-none bg-white"
            >
              <option value="all">全部分类</option>
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tags by Category */}
      <div className="space-y-6">
        {filteredCategories.map((category) => {
          const categoryTags = filterTags(groupedTags[category.value] || []);
          
          if (categoryFilter !== 'all' && categoryTags.length === 0) {
            return null;
          }

          return (
            <div key={category.value} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${CATEGORY_COLORS[category.value]}`}>
                    {category.label}
                  </span>
                  <span className="text-sm text-gray-500">
                    ({categoryTags.length} 个标签)
                  </span>
                </div>
                <span className="text-xs text-gray-400">{category.description}</span>
              </div>

              {categoryTags.length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-500">
                  暂无标签
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">名称</th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">排序</th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">状态</th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">创建时间</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {categoryTags.map((tag) => (
                      <tr key={tag.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Tag className="w-4 h-4 text-gray-400" />
                            <span className="font-medium text-gray-900">{tag.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {editingSortId === tag.id ? (
                            <div className="flex items-center justify-center gap-1">
                              <input
                                type="number"
                                value={sortValue}
                                onChange={(e) => setSortValue(parseInt(e.target.value) || 0)}
                                className="w-16 h-8 px-2 text-center border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-[#E11D48]"
                              />
                              <button
                                onClick={() => handleBatchSort(tag)}
                                className="p-1 text-green-600 hover:bg-green-50 rounded"
                              >
                                <Save className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setEditingSortId(null)}
                                className="p-1 text-gray-500 hover:bg-gray-100 rounded"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => startEditSort(tag)}
                              className="px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded"
                              title="点击修改排序"
                            >
                              {tag.sort_order}
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            tag.is_active 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-gray-100 text-gray-500'
                          }`}>
                            {tag.is_active ? '启用' : '禁用'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-gray-500">
                          {new Date(tag.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleEdit(tag)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="编辑"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(tag.id)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="删除"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          );
        })}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingTag ? '编辑标签' : '添加标签'}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    标签名称 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="请输入标签名称"
                    className="w-full h-10 px-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E11D48] focus:border-transparent"
                  />
                </div>

                {/* Category */}
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    分类 <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                    className="w-full h-10 px-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E11D48] focus:border-transparent flex items-center justify-between"
                  >
                    <span>{getCategoryLabel(formData.category)}</span>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </button>
                  {showCategoryDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
                      {CATEGORIES.map((cat) => (
                        <button
                          key={cat.value}
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, category: cat.value });
                            setShowCategoryDropdown(false);
                          }}
                          className="w-full px-4 py-2 text-left hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
                        >
                          <div className="font-medium">{cat.label}</div>
                          <div className="text-xs text-gray-500">{cat.description}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Sort Order */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    排序权重
                  </label>
                  <input
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                    className="w-full h-10 px-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E11D48] focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">数值越大排序越靠前</p>
                </div>

                {/* Active */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-[#E11D48] focus:ring-[#E11D48]"
                  />
                  <label htmlFor="is_active" className="text-sm text-gray-700">
                    启用此标签
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="flex-1 py-2.5 bg-[#E11D48] text-white rounded-lg hover:bg-[#C41E3A] transition-colors"
                >
                  {editingTag ? '保存' : '添加'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
