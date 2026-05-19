import React, { useState } from 'react';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Globe,
} from 'lucide-react';

// 管理端统一 API 调用
const adminFetch = async (url: string, options: RequestInit = {}) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkaHdtZWl0dGdkb3Nta3h0cGFrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODEzMjQ5MiwiZXhwIjoyMDkzNzA4NDkyfQ.bPatiu7NXaE2k48aTkjAGQsba6NzXlIdq2k_gGLYLBE',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkaHdtZWl0dGdkb3Nta3h0cGFrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODEzMjQ5MiwiZXhwIjoyMDkzNzA4NDkyfQ.bPatiu7NXaE2k48aTkjAGQsba6NzXlIdq2k_gGLYLBE',
    ...(options.headers as Record<string, string> || {}),
  };
  
  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || 'Request failed');
  }
  // DELETE请求通常不返回body，直接返回
  if (options.method === 'DELETE') {
    return null;
  }
  return response.json();
};

function ReligionManagement() {
  const [religions, setReligions] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editingReligion, setEditingReligion] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    origin_place: '',
    origin_time: '',
    distribution: '',
    followers_scale: '',
    core_belief: '',
    introduction: '',
    history: '',
    doctrines: '',
    classics: '',
    festivals: '',
    rituals: '',
    taboos: '',
    sacred_sites: '',
    famous_figures: '',
    is_active: true,
  });
  const pageSize = 10;

  // 加载宗教列表
  const loadReligions = async () => {
    setIsLoading(true);
    try {
      let url = '/sb-api/rest/v1/religions?';
      const params: string[] = [];
      
      if (searchQuery) {
        params.push(`name=ilike.*${encodeURIComponent(searchQuery)}*`);
      }
      params.push('order=created_at.desc');
      params.push(`offset=${(page - 1) * pageSize}`);
      params.push(`limit=${pageSize}`);
      
      url += params.join('&');
      const data = await adminFetch(url);
      setReligions(data || []);
      
      // 获取总数
      let countUrl = '/sb-api/rest/v1/religions?';
      if (searchQuery) {
        countUrl += `name=ilike.*${encodeURIComponent(searchQuery)}*`;
      }
      const countData = await adminFetch(countUrl);
      setTotalCount(countData?.length || 0);
    } catch (error) {
      console.error('Load religions error:', error);
      alert('加载失败: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  // 初始加载
  React.useEffect(() => {
    loadReligions();
  }, [page, searchQuery]);

  const handleAddClick = () => {
    setEditingReligion(null);
    resetForm();
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: '',
      origin_place: '',
      origin_time: '',
      distribution: '',
      followers_scale: '',
      core_belief: '',
      introduction: '',
      history: '',
      doctrines: '',
      classics: '',
      festivals: '',
      rituals: '',
      taboos: '',
      sacred_sites: '',
      famous_figures: '',
      is_active: true,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingReligion) {
        await adminFetch(`/sb-api/rest/v1/religions?id=eq.${editingReligion.id}`, {
          method: 'PATCH',
          body: JSON.stringify(formData),
        });
        setShowModal(false);
        setEditingReligion(null);
        resetForm();
        alert('保存成功！');
      } else {
        await adminFetch('/sb-api/rest/v1/religions', {
          method: 'POST',
          body: JSON.stringify({ ...formData, id: crypto.randomUUID() }),
        });
        setShowModal(false);
        resetForm();
        alert('添加成功！');
      }
      loadReligions();
    } catch (error) {
      console.error('Submit error:', error);
      alert('操作失败: ' + (error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (religion: any) => {
    setEditingReligion(religion);
    setFormData({
      name: religion.name,
      type: religion.type,
      origin_place: religion.origin_place || '',
      origin_time: religion.origin_time || '',
      distribution: religion.distribution || '',
      followers_scale: religion.followers_scale || '',
      core_belief: religion.core_belief || '',
      introduction: religion.introduction || '',
      history: religion.history || '',
      doctrines: religion.doctrines || '',
      classics: religion.classics || '',
      festivals: religion.festivals || '',
      rituals: religion.rituals || '',
      taboos: religion.taboos || '',
      sacred_sites: religion.sacred_sites || '',
      famous_figures: religion.famous_figures || '',
      is_active: religion.is_active,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除吗？')) return;
    try {
      await adminFetch(`/sb-api/rest/v1/religions?id=eq.${id}`, {
        method: 'DELETE',
      });
      alert('删除成功！');
      loadReligions();
    } catch (error) {
      console.error('Delete error:', error);
      alert('删除失败: ' + (error as Error).message);
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">百科管理</h1>
        <button
          onClick={handleAddClick}
          className="flex items-center gap-2 px-4 py-2 bg-[#2563EB] text-white rounded-lg hover:bg-[#C41E3A] transition-colors"
        >
          <Plus className="w-4 h-4" />
          添加宗教
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="搜索宗教名称..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="w-full h-10 pl-10 pr-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">宗教名称</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">类型</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">起源地</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">信徒规模</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">状态</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  加载中...
                </td>
              </tr>
            ) : religions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  暂无数据
                </td>
              </tr>
            ) : (
              religions.map((religion) => (
                <tr key={religion.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Globe className="w-5 h-5 text-[#2563EB]" />
                      <span className="font-medium text-gray-900">{religion.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{religion.type}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{religion.origin_place || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{religion.followers_scale || '-'}</td>
                  <td className="px-4 py-3">
                    {religion.is_active ? (
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                        启用
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                        禁用
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEdit(religion)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="编辑"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(religion.id)}
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
        {totalCount > 0 && (
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
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingReligion ? '编辑宗教' : '添加宗教'}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <span className="text-2xl">&times;</span>
                </button>
              </div>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    宗教名称
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full h-10 px-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    类型
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full h-10 px-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                    required
                  >
                    <option value="">请选择</option>
                    <option value="一神教">一神教</option>
                    <option value="多神教">多神教</option>
                    <option value="泛神教">泛神教</option>
                    <option value="自然宗教">自然宗教</option>
                    <option value="其他">其他</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    起源地
                  </label>
                  <input
                    type="text"
                    value={formData.origin_place}
                    onChange={(e) => setFormData({ ...formData, origin_place: e.target.value })}
                    className="w-full h-10 px-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    起源时间
                  </label>
                  <input
                    type="text"
                    value={formData.origin_time}
                    onChange={(e) => setFormData({ ...formData, origin_time: e.target.value })}
                    className="w-full h-10 px-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    主要分布
                  </label>
                  <input
                    type="text"
                    value={formData.distribution}
                    onChange={(e) => setFormData({ ...formData, distribution: e.target.value })}
                    className="w-full h-10 px-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    信徒规模
                  </label>
                  <input
                    type="text"
                    value={formData.followers_scale}
                    onChange={(e) => setFormData({ ...formData, followers_scale: e.target.value })}
                    className="w-full h-10 px-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  核心主张
                </label>
                <input
                  type="text"
                  value={formData.core_belief}
                  onChange={(e) => setFormData({ ...formData, core_belief: e.target.value })}
                  className="w-full h-10 px-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  简介
                </label>
                <textarea
                  value={formData.introduction}
                  onChange={(e) => setFormData({ ...formData, introduction: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  起源与历史
                </label>
                <textarea
                  value={formData.history}
                  onChange={(e) => setFormData({ ...formData, history: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  核心教义
                </label>
                <textarea
                  value={formData.doctrines}
                  onChange={(e) => setFormData({ ...formData, doctrines: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  经典典籍
                </label>
                <textarea
                  value={formData.classics}
                  onChange={(e) => setFormData({ ...formData, classics: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  主要节日
                </label>
                <textarea
                  value={formData.festivals}
                  onChange={(e) => setFormData({ ...formData, festivals: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  仪式与习俗
                </label>
                <textarea
                  value={formData.rituals}
                  onChange={(e) => setFormData({ ...formData, rituals: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  禁忌与规范
                </label>
                <textarea
                  value={formData.taboos}
                  onChange={(e) => setFormData({ ...formData, taboos: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  圣地与象征物
                </label>
                <textarea
                  value={formData.sacred_sites}
                  onChange={(e) => setFormData({ ...formData, sacred_sites: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  著名人物
                </label>
                <textarea
                  value={formData.famous_figures}
                  onChange={(e) => setFormData({ ...formData, famous_figures: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent resize-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-[#2563EB] focus:ring-[#2563EB]"
                />
                <span className="text-sm text-gray-700">启用</span>
              </div>
              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={isSubmitting}
                  className="flex-1 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2 bg-[#2563EB] text-white rounded-lg hover:bg-[#C41E3A] transition-colors disabled:opacity-50 flex items-center justify-center"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      处理中...
                    </span>
                  ) : (
                    editingReligion ? '保存' : '添加'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ReligionManagement;
