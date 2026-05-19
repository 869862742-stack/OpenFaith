import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Edit2, Trash2, Tag, Filter, ChevronDown, Save, X, RefreshCw, AlertTriangle, Check, BarChart3 } from 'lucide-react';
import { getSupabaseUrl } from '../supabase/client';

// Service Role Key - 绕过 RLS
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkaHdtZWl0dGdkb3Nta3h0cGFrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODEzMjQ5MiwiZXhwIjoyMDkzNzA4NDkyfQ.bPatiu7NXaE2k48aTkjAGQsba6NzXlIdq2k_gGLYLBE';

const PRIMARY_COLOR = '#2563EB';

type TagItem = {
  id: string;
  name: string;
  type: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  usage_count?: number;
};

type CategoryOption = {
  value: string;
  label: string;
  description: string;
  color: string;
};

const CATEGORIES: CategoryOption[] = [
  { value: 'identity', label: '身份标签', description: '用户信仰身份标识', color: 'bg-purple-100 text-purple-700' },
  { value: 'homepage', label: '首页标签', description: '首页推荐分类', color: 'bg-blue-100 text-blue-700' },
  { value: 'post', label: '笔记标签', description: '笔记内容标签', color: 'bg-green-100 text-green-700' },
  { value: 'group', label: '群聊标签', description: '群聊分类标签', color: 'bg-orange-100 text-orange-700' },
];

const getCategoryLabel = (type: string) => {
  const cat = CATEGORIES.find(c => c.value === type);
  return cat?.label || type;
};

const getCategoryColor = (type: string) => {
  const cat = CATEGORIES.find(c => c.value === type);
  return cat?.color || 'bg-gray-100 text-gray-700';
};

export default function TagManagement() {
  const [tags, setTags] = useState<TagItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingTag, setEditingTag] = useState<TagItem | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'post',
    sort_order: 0,
    is_active: true,
  });
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [editingSortId, setEditingSortId] = useState<string | null>(null);
  const [sortValue, setSortValue] = useState<number>(0);
  const [usageStats, setUsageStats] = useState<Record<string, number>>({});
  const [activeTab, setActiveTab] = useState<string>('identity');

  const supabaseUrl = getSupabaseUrl();

  // 加载标签
  const loadTags = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        select: '*',
        order: 'type.asc,sort_order.asc',
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

  // 加载使用统计
  const loadUsageStats = useCallback(async () => {
    try {
      const headers = {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      };

      // 获取身份标签使用统计（从 profiles 表）
      const profilesRes = await fetch(`${supabaseUrl}/rest/v1/profiles?faith_tag=not.is.null&faith_tag=neq.%22%22&select=faith_tag`, {
        headers,
      });
      const profilesData = await profilesRes.json();
      if (Array.isArray(profilesData)) {
        const stats: Record<string, number> = {};
        profilesData.forEach((p: any) => {
          if (p.faith_tag) {
            stats[`identity_${p.faith_tag}`] = (stats[`identity_${p.faith_tag}`] || 0) + 1;
          }
        });
        setUsageStats(prev => ({ ...prev, ...stats }));
      }

      // 获取笔记/群聊标签使用统计（从 posts 表）
      const postsRes = await fetch(`${supabaseUrl}/rest/v1/posts?select=tags`, {
        headers,
      });
      const postsData = await postsRes.json();
      if (Array.isArray(postsData)) {
        postsData.forEach((post: any) => {
          if (post.tags && Array.isArray(post.tags)) {
            const filteredTags = post.tags.filter((t: string) => !t.startsWith('__') && !t.startsWith('member_'));
            filteredTags.forEach((tag: string) => {
              const isGroupChat = post.tags.includes('__group_chat__');
              const type = isGroupChat ? 'group' : 'post';
              stats[`${type}_${tag}`] = (stats[`${type}_${tag}`] || 0) + 1;
            });
          }
        });
        setUsageStats(stats);
      }
    } catch (error) {
      console.error('加载使用统计失败:', error);
    }
  }, [supabaseUrl]);

  // 刷新数据
  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadTags(), loadUsageStats()]);
    setRefreshing(false);
  };

  useEffect(() => {
    loadTags();
    loadUsageStats();
  }, [loadTags, loadUsageStats]);

  // 按分类分组显示
  const groupedTags = tags.reduce((acc, tag) => {
    if (!acc[tag.type]) {
      acc[tag.type] = [];
    }
    acc[tag.type].push(tag);
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

  // 获取标签使用次数
  const getUsageCount = (tag: TagItem) => {
    return usageStats[`${tag.type}_${tag.name}`] || 0;
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
            type: formData.type,
            sort_order: formData.sort_order,
            is_active: formData.is_active,
          }),
        });
      } else {
        // 新增
        const maxSort = tags.filter(t => t.type === formData.type)
          .reduce((max, t) => Math.max(max, t.sort_order), 0);
        await fetch(`${supabaseUrl}/rest/v1/tags`, {
          method: 'POST',
          headers,
          body: JSON.stringify([{
            name: formData.name,
            type: formData.type,
            sort_order: formData.sort_order || maxSort + 1,
            is_active: formData.is_active,
            created_at: new Date().toISOString(),
          }]),
        });
      }

      await loadTags();
      setShowModal(false);
      setEditingTag(null);
      setFormData({ name: '', type: 'post', sort_order: 0, is_active: true });
    } catch (error) {
      console.error('保存失败:', error);
      alert('保存失败');
    }
  };

  const handleEdit = (tag: TagItem) => {
    setEditingTag(tag);
    setFormData({
      name: tag.name,
      type: tag.type,
      sort_order: tag.sort_order,
      is_active: tag.is_active,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string, tag: TagItem) => {
    const usageCount = getUsageCount(tag);
    
    if (usageCount > 0) {
      const confirmed = confirm(
        `⚠️ 警告：该标签已被 ${usageCount} 个内容使用！\n\n` +
        `删除后这些内容将不再显示此标签。\n\n` +
        `确定要删除吗？`
      );
      if (!confirmed) return;
    } else {
      if (!confirm('确定删除此标签吗？')) return;
    }
    
    await fetch(`${supabaseUrl}/rest/v1/tags?id=eq.${id}`, {
      method: 'DELETE',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      },
    });
    await loadTags();
  };

  const handleToggleActive = async (tag: TagItem) => {
    try {
      await fetch(`${supabaseUrl}/rest/v1/tags?id=eq.${tag.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ is_active: !tag.is_active }),
      });
      await loadTags();
    } catch (error) {
      console.error('切换状态失败:', error);
    }
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

  // 获取当前 tab 的标签
  const currentTags = groupedTags[activeTab] || [];
  const filteredCurrentTags = filterTags(currentTags);

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
        <div>
          <h1 className="text-2xl font-bold text-gray-900">标签管理</h1>
          <p className="text-sm text-gray-500 mt-1">管理前台4种类型的标签</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            刷新
          </button>
          <button
            onClick={() => {
              setEditingTag(null);
              setFormData({ name: '', type: activeTab, sort_order: 0, is_active: true });
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-[#2563EB] text-white rounded-lg hover:bg-[#C41E3A] transition-colors"
          >
            <Plus className="w-4 h-4" />
            添加标签
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6 overflow-hidden">
        <div className="flex border-b border-gray-200">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setActiveTab(cat.value)}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${
                activeTab === cat.value
                  ? 'text-[#2563EB] bg-red-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {cat.label}
              <span className={`ml-2 px-1.5 py-0.5 text-xs rounded-full ${
                activeTab === cat.value ? 'bg-[#2563EB] text-white' : 'bg-gray-100 text-gray-600'
              }`}>
                {groupedTags[cat.value]?.length || 0}
              </span>
              {activeTab === cat.value && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2563EB]" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-6">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={`搜索 ${getCategoryLabel(activeTab)}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
            />
          </div>
          <div className={`px-3 py-2 rounded-lg ${getCategoryColor(activeTab)}`}>
            <span className="text-sm font-medium">{getCategoryLabel(activeTab)}</span>
            <span className="ml-2 text-sm text-gray-500">共 {currentTags.length} 个</span>
          </div>
        </div>
      </div>

      {/* Tags List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {filteredCurrentTags.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <Tag className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">
              {searchQuery ? '未找到匹配的标签' : '暂无标签'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => {
                  setEditingTag(null);
                  setFormData({ name: '', type: activeTab, sort_order: 0, is_active: true });
                  setShowModal(true);
                }}
                className="mt-4 text-[#2563EB] hover:underline"
              >
                添加第一个标签
              </button>
            )}
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">名称</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">排序</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">状态</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">
                  <div className="flex items-center justify-center gap-1">
                    <BarChart3 className="w-4 h-4" />
                    使用次数
                  </div>
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">创建时间</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredCurrentTags.map((tag) => (
                <tr key={tag.id} className={`hover:bg-gray-50 ${!tag.is_active ? 'bg-gray-50 opacity-60' : ''}`}>
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
                          className="w-16 h-8 px-2 text-center border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
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
                    <button
                      onClick={() => handleToggleActive(tag)}
                      className={`px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                        tag.is_active 
                          ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {tag.is_active ? (
                        <span className="flex items-center gap-1">
                          <Check className="w-3 h-3" /> 启用
                        </span>
                      ) : '禁用'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-sm font-medium ${
                      getUsageCount(tag) > 0 ? 'text-[#2563EB]' : 'text-gray-500'
                    }`}>
                      {getUsageCount(tag)}
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
                        onClick={() => handleDelete(tag.id, tag)}
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

      {/* Usage Tips */}
      <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
        <h3 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          使用说明
        </h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>身份标签</strong>：用户在注册或编辑资料时选择，影响用户 profile 显示</li>
          <li>• <strong>首页标签</strong>：首页标签筛选栏显示，用于按信仰分类浏览笔记</li>
          <li>• <strong>笔记标签</strong>：发布笔记时选择的标签，用于内容分类</li>
          <li>• <strong>群聊标签</strong>：创建群聊时选择的标签，用于群聊分类</li>
          <li className="mt-2">• 禁用的标签不会在用户端显示，但仍会统计使用次数</li>
          <li>• 删除标签前会显示该标签当前的使用次数</li>
        </ul>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingTag ? '编辑标签' : `添加${getCategoryLabel(formData.type)}`}
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
                    className="w-full h-10 px-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                  />
                </div>

                {/* Type (only for new tags or if admin wants to change) */}
                {!editingTag && (
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      标签类型 <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowTypeDropdown(!showTypeDropdown)}
                      className="w-full h-10 px-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent flex items-center justify-between"
                    >
                      <span className={getCategoryColor(formData.type).split(' ')[1]}>{getCategoryLabel(formData.type)}</span>
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    </button>
                    {showTypeDropdown && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
                        {CATEGORIES.map((cat) => (
                          <button
                            key={cat.value}
                            type="button"
                            onClick={() => {
                              setFormData({ ...formData, type: cat.value });
                              setShowTypeDropdown(false);
                            }}
                            className="w-full px-4 py-2 text-left hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
                          >
                            <div className={`font-medium ${cat.color.split(' ')[1]}`}>{cat.label}</div>
                            <div className="text-xs text-gray-500">{cat.description}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Sort Order */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    排序权重
                  </label>
                  <input
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                    className="w-full h-10 px-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">数值越小排序越靠前</p>
                </div>

                {/* Active */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-[#2563EB] focus:ring-[#2563EB]"
                  />
                  <label htmlFor="is_active" className="text-sm text-gray-700">
                    启用此标签 <span className="text-gray-500">(禁用后用户端不显示)</span>
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
                  className="flex-1 py-2.5 bg-[#2563EB] text-white rounded-lg hover:bg-[#C41E3A] transition-colors"
                >
                  {editingTag ? '保存修改' : '添加'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
