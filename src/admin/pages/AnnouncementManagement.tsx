import React, { useState, useEffect } from 'react';
import { getSupabaseUrl } from '../supabase/client';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Pin,
  ChevronLeft,
  ChevronRight,
  ToggleLeft,
  ToggleRight,
  AlertCircle,
} from 'lucide-react';

// Service Role Key for bypassing RLS
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkaHdtZWl0dGdkb3Nta3h0cGFrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODEzMjQ5MiwiZXhwIjoyMDkzNzA4NDkyfQ.bPatiu7NXaE2k48aTkjAGQsba6NzXlIdq2k_gGLYLBE';

function AnnouncementManagement() {
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    is_pinned: false,
    is_active: true,
    status: 'published',
    target_tags: [] as string[],
  });

  // 可选的身份标签列表
  const FAITH_TAGS = [
    '基督教', '天主教', '伊斯兰教', '犹太教', '佛教', '印度教', '道教',
    '锡克教', '巴哈伊教', '摩门教', '耶和华见证人', '琐罗亚斯德教',
    '诺斯替', '卡巴拉', '神道教', '耆那教', '德鲁兹教', '约鲁巴教',
    '伏都教', '雅兹迪', '曼达安', '玛雅/阿兹特克', '毛利宗教',
    '天理教', '天道教', '高台教', '寻求者', '无信仰',
  ];
  const pageSize = 10;

  // Fetch announcements using fetch API with Service Role Key
  const fetchAnnouncements = async () => {
    setIsLoading(true);
    setError(null);
    const supabaseUrl = getSupabaseUrl();
    const headers = {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    };

    try {
      // Build query params - order by is_pinned desc, then created_at desc
      const params = new URLSearchParams();
      params.append('select', '*');
      params.append('order', 'is_pinned.desc,created_at.desc');
      params.append('offset', String((page - 1) * pageSize));
      params.append('limit', String(pageSize));

      if (searchQuery) {
        params.append('or', `(title.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%)`);
      }

      const res = await fetch(`${supabaseUrl}/rest/v1/announcements?${params.toString()}`, { headers });
      
      if (!res.ok) {
        throw new Error(`请求失败: ${res.status}`);
      }
      
      const data = await res.json();
      setAnnouncements(Array.isArray(data) ? data : []);

      // Get total count
      const countParams = new URLSearchParams();
      countParams.append('select', 'id');
      if (searchQuery) {
        countParams.append('or', `(title.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%)`);
      }

      const countRes = await fetch(`${supabaseUrl}/rest/v1/announcements?${countParams.toString()}`, { headers });
      const countData = await countRes.json();
      setTotalCount(Array.isArray(countData) ? countData.length : 0);
    } catch (error) {
      console.error('Failed to fetch announcements:', error);
      setError('获取公告列表失败');
      setAnnouncements([]);
    }
    setIsLoading(false);
  };

  // Create announcement
  const createAnnouncement = async () => {
    if (!formData.title.trim()) {
      alert('请输入公告标题');
      return;
    }
    if (!formData.content.trim()) {
      alert('请输入公告内容');
      return;
    }

    const supabaseUrl = getSupabaseUrl();
    const headers = {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    };

    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/announcements`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: formData.title.trim(),
          content: formData.content.trim(),
          is_pinned: formData.is_pinned,
          is_active: formData.is_active,
          status: formData.status,
          target_tags: formData.target_tags.length > 0 ? formData.target_tags : null,
        }),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || `创建失败: ${res.status}`);
      }
      
      const data = await res.json();
      if (data && data.id) {
        alert('公告发布成功！');
        fetchAnnouncements();
        setShowModal(false);
        resetForm();
      }
    } catch (error: any) {
      console.error('Failed to create announcement:', error);
      alert(`发布失败: ${error.message}`);
    }
  };

  // Update announcement
  const updateAnnouncement = async () => {
    if (!editingAnnouncement) return;
    
    if (!formData.title.trim()) {
      alert('请输入公告标题');
      return;
    }
    if (!formData.content.trim()) {
      alert('请输入公告内容');
      return;
    }

    const supabaseUrl = getSupabaseUrl();
    const headers = {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    };

    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/announcements?id=eq.${editingAnnouncement.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          title: formData.title.trim(),
          content: formData.content.trim(),
          is_pinned: formData.is_pinned,
          is_active: formData.is_active,
          status: formData.status,
          target_tags: formData.target_tags.length > 0 ? formData.target_tags : null,
        }),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || `更新失败: ${res.status}`);
      }
      
      const data = await res.json();
      if (data && data.length > 0) {
        alert('公告更新成功！');
        fetchAnnouncements();
        setShowModal(false);
        setEditingAnnouncement(null);
        resetForm();
      }
    } catch (error: any) {
      console.error('Failed to update announcement:', error);
      alert(`更新失败: ${error.message}`);
    }
  };

  // Delete announcement
  const deleteAnnouncement = async (id: string) => {
    if (!confirm('确定要删除这条公告吗？')) return;
    
    const supabaseUrl = getSupabaseUrl();
    const headers = {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    };

    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/announcements?id=eq.${id}`, {
        method: 'DELETE',
        headers,
      });
      
      if (!res.ok) {
        throw new Error(`删除失败: ${res.status}`);
      }
      
      alert('删除成功！');
      fetchAnnouncements();
    } catch (error: any) {
      console.error('Failed to delete announcement:', error);
      alert(`删除失败: ${error.message}`);
    }
  };

  // Toggle announcement pinned status
  const toggleAnnouncementPin = async (id: string, isPinned: boolean) => {
    const supabaseUrl = getSupabaseUrl();
    const headers = {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    };

    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/announcements?id=eq.${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ is_pinned: !isPinned }),
      });
      
      if (!res.ok) {
        throw new Error(`操作失败: ${res.status}`);
      }
      
      fetchAnnouncements();
    } catch (error: any) {
      console.error('Failed to toggle announcement pin:', error);
      alert(`操作失败: ${error.message}`);
    }
  };

  // Toggle announcement active status
  const toggleAnnouncementStatus = async (id: string, isActive: boolean) => {
    const supabaseUrl = getSupabaseUrl();
    const headers = {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    };

    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/announcements?id=eq.${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ is_active: !isActive }),
      });
      
      if (!res.ok) {
        throw new Error(`操作失败: ${res.status}`);
      }
      
      fetchAnnouncements();
    } catch (error: any) {
      console.error('Failed to toggle announcement status:', error);
      alert(`操作失败: ${error.message}`);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, [page, searchQuery]);

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      is_pinned: false,
      is_active: true,
      status: 'published',
      target_tags: [],
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingAnnouncement) {
      updateAnnouncement();
    } else {
      createAnnouncement();
    }
  };

  const handleEdit = (announcement: any) => {
    setEditingAnnouncement(announcement);
    setFormData({
      title: announcement.title,
      content: announcement.content,
      is_pinned: announcement.is_pinned || false,
      is_active: announcement.is_active,
      status: announcement.status || 'published',
      target_tags: announcement.target_tags || [],
    });
    setShowModal(true);
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  // Get status label
  const getStatusLabel = (announcement: any) => {
    if (announcement.status === 'draft') return '草稿';
    if (!announcement.is_active) return '已禁用';
    return '已发布';
  };

  // Get status color
  const getStatusColor = (announcement: any) => {
    if (announcement.status === 'draft') return 'bg-yellow-100 text-yellow-700';
    if (!announcement.is_active) return 'bg-gray-100 text-gray-700';
    return 'bg-green-100 text-green-700';
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">系统公告</h1>
        <button
          onClick={() => {
            setEditingAnnouncement(null);
            resetForm();
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-[#2563EB] text-white rounded-lg hover:bg-[#C41E3A] transition-colors"
        >
          <Plus className="w-4 h-4" />
          发布公告
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {/* Search */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="搜索公告标题或内容..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            className="w-full h-10 pl-10 pr-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">标题</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">内容摘要</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">目标标签</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">置顶</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">状态</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">发布时间</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  加载中...
                </td>
              </tr>
            ) : announcements.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  暂无数据
                </td>
              </tr>
            ) : (
              announcements.map((announcement) => (
                <tr key={announcement.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {announcement.is_pinned && (
                        <Pin className="w-4 h-4 text-[#2563EB]" />
                      )}
                      <span className="font-medium text-gray-900">{announcement.title}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 line-clamp-1">
                    {announcement.content}
                  </td>
                  <td className="px-4 py-3">
                    {announcement.target_tags && announcement.target_tags.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {announcement.target_tags.slice(0, 2).map((tag: string) => (
                          <span key={tag} className="px-1.5 py-0.5 bg-[#2563EB]/10 text-[#2563EB] rounded text-xs">
                            {tag}
                          </span>
                        ))}
                        {announcement.target_tags.length > 2 && (
                          <span className="text-xs text-gray-400">+{announcement.target_tags.length - 2}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">全员可见</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleAnnouncementPin(announcement.id, announcement.is_pinned)}
                      className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                        announcement.is_pinned 
                          ? 'bg-[#2563EB]/10 text-[#2563EB] hover:bg-[#2563EB]/20' 
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <Pin className="w-3 h-3" />
                      {announcement.is_pinned ? '已置顶' : '未置顶'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(announcement)}`}>
                      {getStatusLabel(announcement)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(announcement.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEdit(announcement)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="编辑"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => toggleAnnouncementStatus(announcement.id, announcement.is_active)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          announcement.is_active 
                            ? 'text-orange-600 hover:bg-orange-50' 
                            : 'text-green-600 hover:bg-green-50'
                        }`}
                        title={announcement.is_active ? '禁用' : '启用'}
                      >
                        {announcement.is_active ? (
                          <ToggleRight className="w-4 h-4" />
                        ) : (
                          <ToggleLeft className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => deleteAnnouncement(announcement.id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
            共 {totalCount} 条记录，第 {page} / {totalPages || 1} 页
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
              disabled={page >= totalPages}
              className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingAnnouncement ? '编辑公告' : '发布公告'}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <span className="text-2xl">&times;</span>
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    标题 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full h-10 px-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                    placeholder="请输入公告标题"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    内容 <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    rows={6}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent resize-none"
                    placeholder="请输入公告内容"
                    required
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.is_pinned}
                      onChange={(e) => setFormData({ ...formData, is_pinned: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300 text-[#2563EB] focus:ring-[#2563EB]"
                    />
                    <span className="text-sm text-gray-700">置顶公告（显示在列表最前面）</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300 text-[#2563EB] focus:ring-[#2563EB]"
                    />
                    <span className="text-sm text-gray-700">启用（前台用户可见）</span>
                  </label>
                </div>
                {/* 目标身份标签 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    目标身份标签 <span className="text-gray-400 font-normal">（不选则全员可见）</span>
                  </label>
                  <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto p-2 border border-gray-200 rounded-lg bg-gray-50">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, target_tags: [] })}
                      className={`px-2 py-1 rounded-full text-xs transition-colors ${
                        formData.target_tags.length === 0
                          ? 'bg-[#2563EB] text-white'
                          : 'bg-white text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      全员
                    </button>
                    {FAITH_TAGS.map(tag => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          const newTags = formData.target_tags.includes(tag)
                            ? formData.target_tags.filter(t => t !== tag)
                            : [...formData.target_tags, tag];
                          setFormData({ ...formData, target_tags: newTags });
                        }}
                        className={`px-2 py-1 rounded-full text-xs transition-colors ${
                          formData.target_tags.includes(tag)
                            ? 'bg-[#2563EB] text-white'
                            : 'bg-white text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                  {formData.target_tags.length > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      已选 {formData.target_tags.length} 个标签，仅这些身份的用户可见
                    </p>
                  )}
                </div>
                <div className="flex gap-2 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-[#2563EB] text-white rounded-lg hover:bg-[#C41E3A] transition-colors"
                  >
                    {editingAnnouncement ? '保存' : '发布'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AnnouncementManagement;
