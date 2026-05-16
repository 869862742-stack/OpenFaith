import React, { useState, useEffect } from 'react';
import { getSupabaseUrl } from '../supabase/client';
import {
  Search,
  Filter,
  MoreHorizontal,
  Ban,
  CheckCircle,
  Crown,
  Eye,
  ChevronLeft,
  ChevronRight,
  Shield,
  UserX,
  UserCheck,
  Trash2,
  AlertTriangle,
} from 'lucide-react';

// Service Role Key for bypassing RLS
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkaHdtZWl0dGdkb3Nta3h0cGFrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODEzMjQ5MiwiZXhwIjoyMDkzNzA4NDkyfQ.bPatiu7NXaE2k48aTkjAGQsba6NzXlIdq2k_gGLYLBE';
const SUPABASE_URL = getSupabaseUrl();

const roleOptions = [
  { value: 'all', label: '全部' },
  { value: 'admin', label: '管理员' },
  { value: 'user', label: '普通用户' },
];

const statusOptions = [
  { value: 'all', label: '全部状态' },
  { value: 'normal', label: '正常' },
  { value: 'muted', label: '禁言' },
  { value: 'banned', label: '封号' },
];

function UserManagement() {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [users, setUsers] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const pageSize = 10;

  // Toast notification
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Fetch users
  const fetchUsers = async () => {
    setIsLoading(true);
    const headers = {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    };

    try {
      const params = new URLSearchParams();
      params.append('select', '*');
      params.append('order', 'created_at.desc');
      params.append('offset', String((page - 1) * pageSize));
      params.append('limit', String(pageSize));

      if (roleFilter !== 'all') {
        params.append('role', `eq.${roleFilter}`);
      }

      if (statusFilter === 'banned') {
        params.append('is_banned', 'eq.true');
      } else if (statusFilter === 'muted') {
        params.append('is_muted', 'eq.true');
      } else if (statusFilter === 'normal') {
        params.append('is_banned', 'eq.false');
        params.append('is_muted', 'eq.false');
      }

      if (searchQuery) {
        params.append('or', `(username.ilike.%${searchQuery}%,nickname.ilike.%${searchQuery}%)`);
      }

      const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?${params.toString()}`, { headers });
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);

      // Get total count
      const countParams = new URLSearchParams();
      countParams.append('select', 'id');
      if (roleFilter !== 'all') {
        countParams.append('role', `eq.${roleFilter}`);
      }
      if (statusFilter === 'banned') {
        countParams.append('is_banned', 'eq.true');
      } else if (statusFilter === 'muted') {
        countParams.append('is_muted', 'eq.true');
      } else if (statusFilter === 'normal') {
        countParams.append('is_banned', 'eq.false');
        countParams.append('is_muted', 'eq.false');
      }
      if (searchQuery) {
        countParams.append('or', `(username.ilike.%${searchQuery}%,nickname.ilike.%${searchQuery}%)`);
      }

      const countRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?${countParams.toString()}`, { headers });
      const countData = await countRes.json();
      setTotalCount(Array.isArray(countData) ? countData.length : 0);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      setUsers([]);
    }
    setIsLoading(false);
  };

  // Update user role
  const setUserAsAdmin = async (userId: string, isAdmin: boolean) => {
    const headers = {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    };

    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${userId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ role: isAdmin ? 'admin' : 'user' }),
      });
      if (res.ok) {
        showToast(isAdmin ? '已设为管理员' : '已取消管理员');
        fetchUsers();
      } else {
        const err = await res.json();
        showToast('操作失败：' + (err.message || '未知错误'), 'error');
      }
    } catch (error) {
      showToast('操作失败：网络错误', 'error');
    }
  };

  // Update user status (mute/ban)
  const updateUserStatus = async (userId: string, updates: { is_muted?: boolean; is_banned?: boolean }) => {
    const headers = {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    };

    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${userId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        let msg = '';
        if (updates.is_muted === true) msg = '已禁言该用户';
        else if (updates.is_muted === false) msg = '已取消禁言';
        else if (updates.is_banned === true) msg = '已封号该用户';
        else if (updates.is_banned === false) msg = '已解封该用户';
        showToast(msg);
        fetchUsers();
      } else {
        const err = await res.json();
        // If column doesn't exist, try creating it
        if (err.message?.includes('column') || err.code === '42703') {
          showToast('数据库缺少对应字段，请在Supabase SQL Editor执行：ALTER TABLE profiles ADD COLUMN is_muted boolean DEFAULT false; ALTER TABLE profiles ADD COLUMN is_banned boolean DEFAULT false;', 'error');
        } else {
          showToast('操作失败：' + (err.message || '未知错误'), 'error');
        }
      }
    } catch (error) {
      showToast('操作失败：网络错误', 'error');
    }
  };

  // Delete user
  const deleteUser = async (userId: string) => {
    const headers = {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Prefer': 'return=minimal'
    };

    try {
      // 1. Delete profile
      const profileRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${userId}`, {
        method: 'DELETE',
        headers,
      });
      
      if (!profileRes.ok) {
        const err = await profileRes.json();
        showToast('删除资料失败：' + (err.message || '未知错误'), 'error');
        return;
      }

      // 2. Delete user's comments
      await fetch(`${SUPABASE_URL}/rest/v1/comments?user_id=eq.${userId}`, {
        method: 'DELETE',
        headers,
      });

      // 3. Delete user's posts
      await fetch(`${SUPABASE_URL}/rest/v1/posts?user_id=eq.${userId}`, {
        method: 'DELETE',
        headers,
      });

      // 4. Delete auth user via Supabase Admin API
      const adminRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        },
      });

      if (adminRes.ok || adminRes.status === 204 || adminRes.status === 404) {
        showToast('用户已删除');
        fetchUsers();
      } else {
        showToast('用户资料已删除，但认证账户删除失败（可能需要手动在Supabase Dashboard删除）', 'error');
        fetchUsers();
      }
    } catch (error) {
      showToast('删除失败：网络错误', 'error');
    }
    setShowDeleteConfirm(false);
    setDeleteTarget(null);
    setShowModal(false);
  };

  useEffect(() => {
    fetchUsers();
  }, [page, roleFilter, statusFilter, searchQuery]);

  const getStatusBadge = (user: any) => {
    if (user.is_banned) {
      return <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">封号</span>;
    }
    if (user.is_muted) {
      return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">禁言</span>;
    }
    return <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">正常</span>;
  };

  const getRoleBadge = (role: string) => {
    if (role === 'admin') {
      return <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium flex items-center gap-1">
        <Shield className="w-3 h-3" /> 管理员
      </span>;
    }
    return <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">用户</span>;
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div>
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg text-white font-medium transition-all ${
          toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        }`}>
          {toast.message}
        </div>
      )}

      <h1 className="text-2xl font-bold text-gray-900 mb-6">用户管理</h1>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜索用户名或昵称..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                className="w-full h-10 pl-10 pr-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E11D48] focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={roleFilter}
              onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
              className="h-10 px-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E11D48] focus:border-transparent"
            >
              {roleOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="h-10 px-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E11D48] focus:border-transparent"
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">用户信息</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">信仰标签</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">角色</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">状态</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">注册时间</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">加载中...</td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">暂无数据</td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.user_id || user.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={user.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'}
                        alt=""
                        className="w-10 h-10 rounded-full"
                      />
                      <div>
                        <p className="font-medium text-gray-900">{user.nickname || user.username || '未设置昵称'}</p>
                        <p className="text-sm text-gray-500 truncate max-w-[150px]">{user.username || user.user_id?.slice(0, 8)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{user.faith_tag || '-'}</td>
                  <td className="px-4 py-3">{getRoleBadge(user.role)}</td>
                  <td className="px-4 py-3">{getStatusBadge(user)}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {user.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => { setSelectedUser(user); setShowModal(true); }}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="查看详情"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => updateUserStatus(user.user_id || user.id, { is_muted: !user.is_muted })}
                        className={`p-1.5 rounded-lg transition-colors ${
                          user.is_muted 
                            ? 'text-green-600 hover:bg-green-50' 
                            : 'text-yellow-600 hover:bg-yellow-50'
                        }`}
                        title={user.is_muted ? '取消禁言' : '禁言'}
                      >
                        {user.is_muted ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => updateUserStatus(user.user_id || user.id, { is_banned: !user.is_banned })}
                        className={`p-1.5 rounded-lg transition-colors ${
                          user.is_banned 
                            ? 'text-green-600 hover:bg-green-50' 
                            : 'text-red-600 hover:bg-red-50'
                        }`}
                        title={user.is_banned ? '解封' : '封号'}
                      >
                        <Ban className="w-4 h-4" />
                      </button>
                      {user.role === 'admin' ? (
                        <button
                          onClick={() => setUserAsAdmin(user.user_id || user.id, false)}
                          className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="取消管理员"
                        >
                          <Shield className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => setUserAsAdmin(user.user_id || user.id, true)}
                          className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="设为管理员"
                        >
                          <Crown className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => { setDeleteTarget(user); setShowDeleteConfirm(true); }}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="删除用户"
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

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && deleteTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">确认删除用户</h3>
                <p className="text-sm text-gray-500">此操作不可恢复</p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <p className="text-sm text-gray-700">
                昵称：<span className="font-medium">{deleteTarget.nickname || deleteTarget.username || '未设置'}</span>
              </p>
              <p className="text-sm text-gray-700">
                ID：<span className="font-medium">{deleteTarget.username || deleteTarget.user_id?.slice(0, 8)}</span>
              </p>
            </div>
            <p className="text-sm text-red-600 mb-4">
              将删除该用户的资料、所有笔记、评论和认证账户，且不可恢复！
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowDeleteConfirm(false); setDeleteTarget(null); }}
                className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => deleteUser(deleteTarget.user_id || deleteTarget.id)}
                className="flex-1 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Detail Modal */}
      {showModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">用户详情</h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <span className="text-2xl">&times;</span>
                </button>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <img
                    src={selectedUser.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'}
                    alt=""
                    className="w-20 h-20 rounded-full"
                  />
                  <div>
                    <p className="text-lg font-semibold text-gray-900">{selectedUser.nickname || selectedUser.username || '未设置昵称'}</p>
                    <p className="text-sm text-gray-500">ID: {selectedUser.username || selectedUser.user_id?.slice(0, 8)}</p>
                    <div className="flex items-center gap-2 mt-2">
                      {getStatusBadge(selectedUser)}
                      {getRoleBadge(selectedUser.role)}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">信仰标签</p>
                    <p className="text-lg font-semibold text-gray-900">{selectedUser.faith_tag || '-'}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">注册时间</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleDateString() : '-'}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">热点</p>
                    <p className="text-lg font-semibold text-gray-900">{selectedUser.hot_points ?? 0}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">经验/等级</p>
                    <p className="text-lg font-semibold text-gray-900">{selectedUser.experience ?? 0} / Lv.{selectedUser.level ?? 1}</p>
                  </div>
                </div>
                <div className="flex gap-2 pt-4 border-t border-gray-200">
                  {selectedUser.role === 'admin' ? (
                    <button
                      onClick={() => { setUserAsAdmin(selectedUser.user_id || selectedUser.id, false); setShowModal(false); }}
                      className="flex-1 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                    >
                      取消管理员
                    </button>
                  ) : (
                    <button
                      onClick={() => { setUserAsAdmin(selectedUser.user_id || selectedUser.id, true); setShowModal(false); }}
                      className="flex-1 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                    >
                      设为管理员
                    </button>
                  )}
                  {selectedUser.is_banned ? (
                    <button
                      onClick={() => { updateUserStatus(selectedUser.user_id || selectedUser.id, { is_banned: false }); setShowModal(false); }}
                      className="flex-1 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                    >
                      解封
                    </button>
                  ) : (
                    <button
                      onClick={() => { updateUserStatus(selectedUser.user_id || selectedUser.id, { is_banned: true }); setShowModal(false); }}
                      className="flex-1 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                    >
                      封号
                    </button>
                  )}
                  <button
                    onClick={() => { setDeleteTarget(selectedUser); setShowModal(false); setShowDeleteConfirm(true); }}
                    className="flex-1 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors"
                  >
                    删除用户
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserManagement;
