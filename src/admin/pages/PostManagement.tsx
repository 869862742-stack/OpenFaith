import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cachedFetch } from '../../utils/apiCache';
import { isGroupChat, filterOutGroupChats } from '../../utils/postUtils';
import {
  Search, Filter, MoreHorizontal, CheckCircle, XCircle, Trash2,
  Eye, ChevronLeft, ChevronRight, Flame, Pin, FlameKindling, Ban, Clock, X,
  ArrowUpDown, ArrowUp, ArrowDown
} from 'lucide-react';

const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkaHdtZWl0dGdkb3Nta3h0cGFrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODEzMjQ5MiwiZXhwIjoyMDkzNzA4NDkyfQ.bPatiu7NXaE2k48aTkjAGQsba6NzXlIdq2k_gGLYLBE';

// 使用 /sb-api 代理路径
const API_BASE = '/sb-api/rest/v1';

async function adminFetch(url: string, options: RequestInit = {}): Promise<any> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'apikey': SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    ...(options.headers as Record<string, string> || {}),
  };
  const response = await fetch(url, { ...options, headers });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

const statusOptions = [
  { value: 'all', label: '全部' },
  { value: 'pending', label: '待审核' },
  { value: 'published', label: '已发布' },
  { value: 'blocked', label: '已屏蔽' },
];

// 加热选项
const heatOptions = [
  { value: 10, label: '+10' },
  { value: 50, label: '+50' },
  { value: 100, label: '+100' },
  { value: 500, label: '+500' },
  { value: 1000, label: '+1000' },
];

// 加热持续时间选项
const heatDurationOptions = [
  { value: 1, label: '1小时' },
  { value: 6, label: '6小时' },
  { value: 24, label: '24小时' },
  { value: 168, label: '7天' },
];

// 置顶时间选项
const pinDurationOptions = [
  { value: 1, label: '1小时' },
  { value: 6, label: '6小时' },
  { value: 24, label: '24小时' },
  { value: 72, label: '3天' },
  { value: 168, label: '7天' },
  { value: -1, label: '永久' },
];

function PostManagement() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [selectedPosts, setSelectedPosts] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'created_at' | 'heat_count' | 'title'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const pageSize = 20;

  // 搜索防抖
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // 排序切换
  const handleSort = (column: 'created_at' | 'heat_count' | 'title') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder(column === 'title' ? 'asc' : 'desc');
    }
    setPage(1);
  };

  // 排序图标
  const SortIcon = ({ column }: { column: 'created_at' | 'heat_count' | 'title' }) => {
    if (sortBy !== column) return <ArrowUpDown className="w-4 h-4 ml-1 inline text-gray-400" />;
    return sortOrder === 'asc' 
      ? <ArrowUp className="w-4 h-4 ml-1 inline text-[#E11D48]" />
      : <ArrowDown className="w-4 h-4 ml-1 inline text-[#E11D48]" />;
  };

  // 加热弹窗状态
  const [showHeatModal, setShowHeatModal] = useState(false);
  const [selectedPostForHeat, setSelectedPostForHeat] = useState<any>(null);
  const [heatAmount, setHeatAmount] = useState(10);
  const [heatDuration, setHeatDuration] = useState(24);

  // 置顶弹窗状态
  const [showPinModal, setShowPinModal] = useState(false);
  const [selectedPostForPin, setSelectedPostForPin] = useState<any>(null);
  const [pinDuration, setPinDuration] = useState(24);

  const { data: posts, isLoading } = useQuery({
    queryKey: ['admin-posts', page, statusFilter, debouncedSearch, sortBy, sortOrder],
    queryFn: async () => {
      // 构建排序
      const sortColumn = sortBy === 'title' ? 'title' : sortBy;
      let url = `${API_BASE}/posts?select=*&order=${sortColumn}.${sortOrder}.nullslast&offset=${(page - 1) * pageSize}&limit=${pageSize}`;

      // 注意：不能在 Supabase 查询层面排除群聊（jsonb 不支持 not.cs）
      // 所有 posts 都会查询，然后在返回数据后进行前端过滤

      if (statusFilter !== 'all') {
        url += `&status=eq.${statusFilter}`;
      }
      if (debouncedSearch) {
        url += `&title=ilike.%25${debouncedSearch}%25`;
      }

      const response = await fetch(url, {
        headers: {
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'Prefer': 'count=exact',
        }
      });

      // 从响应头获取总数
      const contentRange = response.headers.get('content-range');
      const total = contentRange ? parseInt(contentRange.split('/')[1], 10) : 0;

      const text = await response.text();
      const postsData = text ? JSON.parse(text) : [];

      if (!Array.isArray(postsData) || postsData.length === 0) {
        return { data: [], total, page, pageSize };
      }

      // 第2步：查询 profiles
      const userIds = [...new Set(postsData.map((p: any) => p.user_id).filter(Boolean))];
      const profilesMap: Record<string, any> = {};
      if (userIds.length > 0) {
        const profilesData = await cachedFetch(
          `${API_BASE}/profiles?user_id=in.(${userIds.join(',')})&select=user_id,username,avatar_url,faith_tag`,
          {
            headers: {
              'apikey': SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
            }
          },
          { ttl: 30000 }
        );
        if (Array.isArray(profilesData)) {
          profilesData.forEach((p: any) => { profilesMap[p.user_id] = p; });
        }
      }

      // 合并
      const merged = postsData.map((p: any) => ({
        ...p,
        profiles: profilesMap[p.user_id] || null,
      }));

      // 前端过滤：排除群聊记录
      const filtered = filterOutGroupChats(merged);

      return { data: filtered, total, page, pageSize };
    },
  });

  const postsData = posts?.data || [];
  const totalPosts = posts?.total || 0;

  const updatePostMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, any> }) => {
      await adminFetch(`${API_BASE}/posts?id=eq.${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ ...updates, updated_at: new Date().toISOString() }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-posts'] });
    },
  });

  const deletePostMutation = useMutation({
    mutationFn: async (id: string) => {
      await adminFetch(`${API_BASE}/comments?post_id=eq.${id}`, { method: 'DELETE' });
      await adminFetch(`${API_BASE}/posts?id=eq.${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-posts'] });
    },
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: string }) => {
      for (const id of ids) {
        await adminFetch(`${API_BASE}/posts?id=eq.${id}`, {
          method: 'PATCH',
          body: JSON.stringify({ status, updated_at: new Date().toISOString() }),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-posts'] });
      setSelectedPosts([]);
    },
  });

  const toggleSelectAll = () => {
    setSelectedPosts(selectedPosts.length === postsData.length ? [] : postsData.map((p: any) => p.id));
  };

  const toggleSelect = (id: string) => {
    setSelectedPosts(selectedPosts.includes(id) ? selectedPosts.filter(p => p !== id) : [...selectedPosts, id]);
  };

  // 打开加热弹窗
  const handleHeatClick = (post: any) => {
    setSelectedPostForHeat(post);
    setHeatAmount(10);
    setHeatDuration(24);
    setShowHeatModal(true);
  };

  // 确认加热
  const handleHeatConfirm = () => {
    if (selectedPostForHeat) {
      const current = selectedPostForHeat.heat_count || 0;
      updatePostMutation.mutate({ 
        id: selectedPostForHeat.id, 
        updates: { heat_count: current + heatAmount } 
      });
      setShowHeatModal(false);
    }
  };

  // 打开置顶弹窗
  const handlePinClick = (post: any) => {
    setSelectedPostForPin(post);
    setPinDuration(24);
    setShowPinModal(true);
  };

  // 确认置顶 - 用 heat_count 大值模拟置顶效果
  const handlePinConfirm = () => {
    if (selectedPostForPin) {
      // 置顶：设置 heat_count >= 1000 表示置顶
      // 永久置顶用 999999
      const pinHeatValue = pinDuration === -1 ? 999999 : 1000 + pinDuration;
      updatePostMutation.mutate({ 
        id: selectedPostForPin.id, 
        updates: { heat_count: pinHeatValue } 
      });
      setShowPinModal(false);
    }
  };

  // 取消置顶
  const handleUnpin = (post: any) => {
    // 恢复原始热度值（减去1000的置顶标记）
    const currentHeat = post.heat_count || 0;
    const originalHeat = currentHeat > 1000 ? currentHeat - 1000 : 0;
    updatePostMutation.mutate({ 
      id: post.id, 
      updates: { heat_count: originalHeat } 
    });
  };

  // 判断是否为置顶状态
  const isPinned = (heatCount: number) => heatCount >= 1000;

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700',
      published: 'bg-green-100 text-green-700',
      blocked: 'bg-red-100 text-red-700',
    };
    const labels: Record<string, string> = {
      pending: '待审核', published: '已发布', blocked: '已屏蔽',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
        {labels[status] || status}
      </span>
    );
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">笔记管理</h1>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="搜索笔记标题..." value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-10 pr-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E11D48]" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="h-10 px-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E11D48]">
              {statusOptions.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
            </select>
          </div>
          <div className="text-sm text-gray-500 self-center">
            共 {totalPosts} 条记录
          </div>
        </div>

        {selectedPosts.length > 0 && (
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
            <span className="text-sm text-gray-600">已选择 {selectedPosts.length} 项</span>
            <button onClick={() => bulkUpdateMutation.mutate({ ids: selectedPosts, status: 'published' })}
              className="px-3 py-1.5 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600">批量通过</button>
            <button onClick={() => bulkUpdateMutation.mutate({ ids: selectedPosts, status: 'blocked' })}
              className="px-3 py-1.5 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600">批量屏蔽</button>
            <button onClick={async () => {
              for (const id of selectedPosts) {
                await fetch(`${API_BASE}/comments?post_id=eq.${id}`, { method: 'DELETE', headers: { 'apikey': SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SERVICE_ROLE_KEY}` } });
                await fetch(`${API_BASE}/posts?id=eq.${id}`, { method: 'DELETE', headers: { 'apikey': SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SERVICE_ROLE_KEY}` } });
              }
              setSelectedPosts([]);
              queryClient.invalidateQueries({ queryKey: ['admin-posts'] });
            }}
              className="px-3 py-1.5 bg-gray-500 text-white text-sm rounded-lg hover:bg-gray-600">批量删除</button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left">
                <input type="checkbox" checked={selectedPosts.length === postsData.length && postsData.length > 0}
                  onChange={toggleSelectAll} className="w-4 h-4 rounded" />
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('title')}>
                笔记信息 <SortIcon column="title" />
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">作者</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">标签</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('heat_count')}>
                热度 <SortIcon column="heat_count" />
              </th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">状态</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('created_at')}>
                时间 <SortIcon column="created_at" />
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {isLoading ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500">加载中...</td></tr>
            ) : postsData.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500">暂无数据</td></tr>
            ) : (
              postsData.map((post: any) => (
                <tr key={post.id} className={`hover:bg-gray-50 ${isPinned(post.heat_count) ? 'bg-orange-50' : ''}`}>
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={selectedPosts.includes(post.id)}
                      onChange={() => toggleSelect(post.id)} className="w-4 h-4 rounded" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {post.cover_image && (
                        <img src={post.cover_image} alt="" className="w-12 h-12 rounded-lg object-cover" />
                      )}
                      <div className="flex items-center gap-2">
                        {isPinned(post.heat_count) && (
                          <Pin className="w-4 h-4 text-orange-500 flex-shrink-0" />
                        )}
                        <div>
                          <p className="font-medium text-gray-900 line-clamp-1">{post.title}</p>
                          <p className="text-sm text-gray-500 line-clamp-1">{post.content}</p>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <img src={post.profiles?.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'}
                        alt="" className="w-8 h-8 rounded-full" />
                      <div>
                        <span className="text-sm text-gray-700">{post.profiles?.username || '未知用户'}</span>
                        {post.profiles?.faith_tag && (
                          <p className="text-xs text-gray-400">{post.profiles.faith_tag}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {post.tags?.slice(0, 2).map((tag: string) => (
                        <span key={tag} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">{tag}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-sm font-medium ${isPinned(post.heat_count) ? 'text-orange-600' : 'text-orange-500'}`}>
                      🔥 {post.heat_count || 0}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">{getStatusBadge(post.status)}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(post.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {post.status === 'pending' && (
                        <button onClick={() => updatePostMutation.mutate({ id: post.id, updates: { status: 'published' } })}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg" title="通过">
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                      {post.status === 'published' && (
                        <>
                          {/* 置顶按钮 */}
                          <button onClick={() => handlePinClick(post)}
                            className={`p-1.5 rounded-lg ${isPinned(post.heat_count) ? 'text-orange-600 bg-orange-50 hover:bg-orange-100' : 'text-gray-400 hover:bg-gray-50'}`} 
                            title={isPinned(post.heat_count) ? '已置顶' : '置顶'}>
                            <Pin className="w-4 h-4" />
                          </button>
                          {/* 加热按钮 */}
                          <button onClick={() => handleHeatClick(post)}
                            className="p-1.5 text-orange-500 hover:bg-orange-50 rounded-lg" title="加热">
                            <Flame className="w-4 h-4" />
                          </button>
                          {/* 屏蔽按钮 */}
                          <button onClick={() => updatePostMutation.mutate({ id: post.id, updates: { status: 'blocked' } })}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg" title="屏蔽">
                            <Ban className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      {post.status === 'blocked' && (
                        <button onClick={() => updatePostMutation.mutate({ id: post.id, updates: { status: 'published' } })}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg" title="恢复">
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={() => { if(confirm('确定删除？')) deletePostMutation.mutate(post.id); }}
                        className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg" title="删除">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
          <p className="text-sm text-gray-500">第 {page} / {Math.ceil(totalPosts / pageSize) || 1} 页，共 {totalPosts} 条</p>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(page - 1)} disabled={page === 1}
              className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-gray-600">第 {page} 页</span>
            <button onClick={() => setPage(page + 1)} disabled={postsData.length < pageSize || page >= Math.ceil(totalPosts / pageSize)}
              className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 加热弹窗 */}
      {showHeatModal && selectedPostForHeat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowHeatModal(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-orange-500" />
                <h3 className="font-bold text-gray-900">定时加热</h3>
              </div>
              <button onClick={() => setShowHeatModal(false)} className="p-1.5 rounded-full hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="p-5 space-y-5">
              {/* 笔记信息 */}
              <div className="p-3 rounded-lg bg-gray-50">
                <p className="font-medium text-gray-900 line-clamp-1">{selectedPostForHeat.title}</p>
                <p className="text-sm text-gray-500 mt-1">当前热度: 🔥 {selectedPostForHeat.heat_count || 0}</p>
              </div>

              {/* 加热量选择 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Flame className="w-4 h-4 inline mr-1 text-orange-500" />
                  加热量
                </label>
                <div className="flex flex-wrap gap-2">
                  {heatOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setHeatAmount(opt.value)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        heatAmount === opt.value 
                          ? 'bg-orange-500 text-white' 
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 加热持续时间 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Clock className="w-4 h-4 inline mr-1 text-gray-500" />
                  持续时间
                </label>
                <div className="flex flex-wrap gap-2">
                  {heatDurationOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setHeatDuration(opt.value)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        heatDuration === opt.value 
                          ? 'bg-orange-500 text-white' 
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-2">* 加热到期后热度将自动减少（功能后续实现）</p>
              </div>

              {/* 预览 */}
              <div className="p-3 rounded-lg bg-orange-50 border border-orange-200">
                <p className="text-sm text-orange-700">
                  加热后热度: 🔥 {(selectedPostForHeat.heat_count || 0) + heatAmount}
                </p>
              </div>
            </div>
            
            <div className="px-5 pb-5 flex gap-3">
              <button
                onClick={() => setShowHeatModal(false)}
                className="flex-1 py-3 rounded-xl font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
              >
                取消
              </button>
              <button
                onClick={handleHeatConfirm}
                className="flex-1 py-3 rounded-xl font-medium text-white bg-orange-500 hover:bg-orange-600"
              >
                确认加热
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 置顶弹窗 */}
      {showPinModal && selectedPostForPin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowPinModal(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Pin className="w-5 h-5 text-orange-500" />
                <h3 className="font-bold text-gray-900">置顶设置</h3>
              </div>
              <button onClick={() => setShowPinModal(false)} className="p-1.5 rounded-full hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="p-5 space-y-5">
              {/* 笔记信息 */}
              <div className="p-3 rounded-lg bg-gray-50">
                <p className="font-medium text-gray-900 line-clamp-1">{selectedPostForPin.title}</p>
                {isPinned(selectedPostForPin.heat_count) && (
                  <p className="text-sm text-orange-500 mt-1">⚠️ 当前已置顶</p>
                )}
              </div>

              {/* 置顶时间选择 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Clock className="w-4 h-4 inline mr-1 text-gray-500" />
                  置顶时间
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {pinDurationOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setPinDuration(opt.value)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        pinDuration === opt.value 
                          ? 'bg-orange-500 text-white' 
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-2">* 置顶期间笔记将排在最前面</p>
              </div>

              {/* 取消置顶按钮 */}
              {isPinned(selectedPostForPin.heat_count) && (
                <button
                  onClick={() => {
                    handleUnpin(selectedPostForPin);
                    setShowPinModal(false);
                  }}
                  className="w-full py-3 rounded-xl font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
                >
                  取消置顶
                </button>
              )}
            </div>
            
            <div className="px-5 pb-5 flex gap-3">
              <button
                onClick={() => setShowPinModal(false)}
                className="flex-1 py-3 rounded-xl font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
              >
                取消
              </button>
              <button
                onClick={handlePinConfirm}
                className="flex-1 py-3 rounded-xl font-medium text-white bg-orange-500 hover:bg-orange-600"
              >
                确认置顶
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PostManagement;
