import React, { useState, useEffect, useCallback } from 'react';
import {
  Flame,
  Trophy,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Filter,
  Edit2,
  Save,
  X,
} from 'lucide-react';
import { getSupabaseUrl } from '../supabase/client';

// Service Role Key - 绕过 RLS
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkaHdtZWl0dGdkb3Nta3h0cGFrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODEzMjQ5MiwiZXhwIjoyMDkzNzA4NDkyfQ.bPatiu7NXaE2k48aTkjAGQsba6NzXlIdq2k_gGLYLBE';

type RankingItem = {
  id: string;
  user_id: string;
  type: string;
  rank: number;
  score: number;
  period: string;
  created_at: string;
  profiles?: {
    id: string;
    username: string;
    avatar_url: string;
    faith_tag: string | null;
  };
};

const typeOptions = [
  { value: 'all', label: '全部类型' },
  { value: 'weekly', label: '周榜' },
  { value: 'monthly', label: '月榜' },
  { value: 'all_time', label: '总榜' },
];

const periodOptions = [
  { value: 'today', label: '今日' },
  { value: 'week', label: '本周' },
  { value: 'month', label: '本月' },
  { value: 'year', label: '年度' },
  { value: 'all', label: '全部' },
];

const getTypeLabel = (type: string) => {
  const opt = typeOptions.find(o => o.value === type);
  return opt?.label || type;
};

export default function RankingManagement() {
  const [rankings, setRankings] = useState<RankingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [periodFilter, setPeriodFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [editingRank, setEditingRank] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ rank: number; score: number }>({ rank: 0, score: 0 });
  const [processing, setProcessing] = useState(false);
  const pageSize = 10;

  const supabaseUrl = getSupabaseUrl();

  const loadRankings = useCallback(async () => {
    setLoading(true);
    try {
      // 构建查询参数
      const params = new URLSearchParams({
        select: '*',
        order: 'rank.asc',
      });

      const conditions: string[] = [];
      if (typeFilter !== 'all') {
        conditions.push(`type.eq.${typeFilter}`);
      }
      if (periodFilter !== 'all') {
        conditions.push(`period.eq.${periodFilter}`);
      }

      let queryParams = params.toString();
      if (conditions.length > 0) {
        queryParams = `select=*&${conditions.map(c => c).join('&')}&order=rank.asc`;
      }

      const res = await fetch(`${supabaseUrl}/rest/v1/rankings?${queryParams}`, {
        headers: {
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        },
      });
      let data = await res.json();

      // 手动 join profiles 获取用户信息
      if (Array.isArray(data) && data.length > 0) {
        const userIds = [...new Set(data.map((r: RankingItem) => r.user_id).filter(Boolean))];
        if (userIds.length > 0) {
          const usersRes = await fetch(`${supabaseUrl}/rest/v1/profiles?id=in.(${userIds.join(',')})`, {
            headers: {
              'apikey': SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
            },
          });
          const users = await usersRes.json();
          const userMap: Record<string, any> = {};

          if (Array.isArray(users)) {
            users.forEach((u: any) => {
              userMap[u.id] = u;
            });
          }

          data = data.map((r: RankingItem) => ({
            ...r,
            profiles: userMap[r.user_id] || null,
          }));
        }
      }

      setRankings(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('加载排行榜失败:', error);
      setRankings([]);
    }
    setLoading(false);
  }, [supabaseUrl, typeFilter, periodFilter]);

  useEffect(() => {
    loadRankings();
  }, [loadRankings]);

  // 过滤
  const filteredRankings = rankings;

  const totalCount = filteredRankings.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const paginatedRankings = filteredRankings.slice((page - 1) * pageSize, page * pageSize);

  // 删除排行榜记录
  const handleDelete = async (id: string) => {
    if (!confirm('确定删除此排行记录吗？')) return;
    setProcessing(true);

    try {
      await fetch(`${supabaseUrl}/rest/v1/rankings?id=eq.${id}`, {
        method: 'DELETE',
        headers: {
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        },
      });
      await loadRankings();
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败');
    }
    setProcessing(false);
  };

  // 开始编辑
  const startEdit = (ranking: RankingItem) => {
    setEditingRank(ranking.id);
    setEditForm({ rank: ranking.rank, score: ranking.score });
  };

  // 保存编辑
  const handleSaveEdit = async (ranking: RankingItem) => {
    setProcessing(true);

    try {
      await fetch(`${supabaseUrl}/rest/v1/rankings?id=eq.${ranking.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          rank: editForm.rank,
          score: editForm.score,
        }),
      });
      setEditingRank(null);
      await loadRankings();
    } catch (error) {
      console.error('保存失败:', error);
      alert('保存失败');
    }
    setProcessing(false);
  };

  // 取消编辑
  const cancelEdit = () => {
    setEditingRank(null);
    setEditForm({ rank: 0, score: 0 });
  };

  // 获取排名样式
  const getRankStyle = (rank: number) => {
    if (rank === 1) return 'bg-yellow-400 text-white';
    if (rank === 2) return 'bg-gray-300 text-white';
    if (rank === 3) return 'bg-amber-600 text-white';
    return 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">排行榜管理</h1>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-6">
        <div className="flex flex-wrap gap-4">
          {/* Type Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              className="h-10 px-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E11D48] focus:border-transparent"
            >
              {typeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Period Filter */}
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-gray-400" />
            <select
              value={periodFilter}
              onChange={(e) => {
                setPeriodFilter(e.target.value);
                setPage(1);
              }}
              className="h-10 px-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E11D48] focus:border-transparent"
            >
              {periodOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="ml-auto text-sm text-gray-500">
            共 {totalCount} 条记录
          </div>
        </div>
      </div>

      {/* Ranking List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">排名</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">用户</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">类型</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">周期</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">分数</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">更新时间</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  加载中...
                </td>
              </tr>
            ) : paginatedRankings.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  暂无排行榜数据
                </td>
              </tr>
            ) : (
              paginatedRankings.map((ranking, index) => (
                <tr key={ranking.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    {editingRank === ranking.id ? (
                      <input
                        type="number"
                        value={editForm.rank}
                        onChange={(e) => setEditForm({ ...editForm, rank: parseInt(e.target.value) || 0 })}
                        className="w-16 h-8 px-2 text-center border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-[#E11D48]"
                      />
                    ) : (
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${getRankStyle(ranking.rank)}`}>
                        {ranking.rank}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={ranking.profiles?.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'}
                        alt=""
                        className="w-10 h-10 rounded-full"
                      />
                      <div>
                        <p className="font-medium text-gray-900">{ranking.profiles?.username || '未知用户'}</p>
                        {ranking.profiles?.faith_tag && (
                          <p className="text-xs text-gray-400">{ranking.profiles.faith_tag}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                      {getTypeLabel(ranking.type)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-gray-600">
                    {periodOptions.find(p => p.value === ranking.period)?.label || ranking.period}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {editingRank === ranking.id ? (
                      <input
                        type="number"
                        value={editForm.score}
                        onChange={(e) => setEditForm({ ...editForm, score: parseInt(e.target.value) || 0 })}
                        className="w-20 h-8 px-2 text-center border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-[#E11D48]"
                      />
                    ) : (
                      <div className="flex items-center justify-center gap-1 text-[#E11D48]">
                        <Flame className="w-4 h-4" />
                        <span className="font-bold">{ranking.score}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(ranking.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {editingRank === ranking.id ? (
                        <>
                          <button
                            onClick={() => handleSaveEdit(ranking)}
                            disabled={processing}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                            title="保存"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                            title="取消"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => startEdit(ranking)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="编辑"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(ranking.id)}
                            disabled={processing}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                            title="删除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              共 {totalCount} 条记录，第 {page} / {totalPages} 页
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

      {/* Top 3 Highlight */}
      {!loading && paginatedRankings.length > 0 && (
        <div className="mt-6 grid grid-cols-3 gap-4">
          {paginatedRankings.slice(0, 3).map((ranking, idx) => (
            <div
              key={ranking.id}
              className={`bg-gradient-to-br rounded-xl p-6 ${
                idx === 0 ? 'from-yellow-100 to-yellow-50 border-yellow-200' :
                idx === 1 ? 'from-gray-100 to-gray-50 border-gray-200' :
                'from-amber-100 to-amber-50 border-amber-200'
              } border`}
            >
              <div className="flex items-center justify-center mb-3">
                <Trophy className={`w-8 h-8 ${
                  idx === 0 ? 'text-yellow-500' :
                  idx === 1 ? 'text-gray-400' :
                  'text-amber-600'
                }`} />
              </div>
              <div className="text-center">
                <p className="text-4xl font-bold text-gray-900 mb-2">#{ranking.rank}</p>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <img
                    src={ranking.profiles?.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'}
                    alt=""
                    className="w-12 h-12 rounded-full border-2 border-white"
                  />
                </div>
                <p className="font-medium text-gray-900">{ranking.profiles?.username || '未知用户'}</p>
                <p className="text-2xl font-bold text-[#E11D48] mt-2">
                  <Flame className="w-5 h-5 inline" /> {ranking.score}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
