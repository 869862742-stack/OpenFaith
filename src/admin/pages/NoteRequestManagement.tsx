import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  CheckCircle,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  X,
  FileText,
  RefreshCw,
} from 'lucide-react';
import { getSupabaseUrl } from '../supabase/client';

const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkaHdtZWl0dGdkb3Nta3h0cGFrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODEzMjQ5MiwiZXhwIjoyMDkzNzA4NDkyfQ.bPatiu7NXaE2k48aTkjAGQsba6NzXlIdq2k_gGLYLBE';

type NoteRequestItem = {
  id: string;
  user_id: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  profiles?: {
    username: string;
    nickname: string | null;
    avatar_url: string | null;
  };
  admin_profile?: {
    username: string;
    nickname: string | null;
  };
};

const statusFilters = [
  { value: 'all', label: '全部' },
  { value: 'pending', label: '待处理' },
  { value: 'approved', label: '已通过' },
  { value: 'rejected', label: '已拒绝' },
];

const getStatusBadge = (status: string) => {
  const styles: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
  };
  const labels: Record<string, string> = {
    pending: '待处理',
    approved: '已通过',
    rejected: '已拒绝',
  };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
      {labels[status] || status}
    </span>
  );
};

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export default function NoteRequestManagement() {
  const [requests, setRequests] = useState<NoteRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [selectedRequest, setSelectedRequest] = useState<NoteRequestItem | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [adminNote, setAdminNote] = useState('');
  const [processing, setProcessing] = useState(false);
  const pageSize = 10;

  const supabaseUrl = getSupabaseUrl();

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        select: '*',
        order: 'created_at.desc',
      });
      const res = await fetch(`${supabaseUrl}/rest/v1/note_requests?${params}`, {
        headers: {
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        },
      });
      let data: NoteRequestItem[] = await res.json();

      if (!Array.isArray(data)) data = [];

      // join profiles（申请人）
      const userIds = [...new Set(data.map((r) => r.user_id).filter(Boolean))];
      const adminIds = [...new Set(data.map((r) => r.reviewed_by).filter(Boolean))];

      const profileMap: Record<string, any> = {};
      const adminMap: Record<string, any> = {};

      if (userIds.length > 0) {
        const usersRes = await fetch(
          `${supabaseUrl}/rest/v1/profiles?user_id=in.(${userIds.map(encodeURIComponent).join(',')})&select=user_id,username,nickname,avatar_url`,
          { headers: { 'apikey': SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SERVICE_ROLE_KEY}` } }
        );
        const users = await usersRes.json();
        if (Array.isArray(users)) {
          users.forEach((u: any) => { profileMap[u.user_id] = u; });
        }
      }

      if (adminIds.length > 0) {
        const adminsRes = await fetch(
          `${supabaseUrl}/rest/v1/profiles?user_id=in.(${adminIds.map(encodeURIComponent).join(',')})&select=user_id,username,nickname`,
          { headers: { 'apikey': SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SERVICE_ROLE_KEY}` } }
        );
        const admins = await adminsRes.json();
        if (Array.isArray(admins)) {
          admins.forEach((a: any) => { adminMap[a.user_id] = a; });
        }
      }

      data = data.map((r) => ({
        ...r,
        profiles: profileMap[r.user_id] || null,
        admin_profile: r.reviewed_by ? adminMap[r.reviewed_by] || null : null,
      }));

      // pending 优先排序
      data.sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      setRequests(data);
    } catch (error) {
      console.error('加载笔记申请失败:', error);
      setRequests([]);
    }
    setLoading(false);
  }, [supabaseUrl]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const filteredRequests = requests.filter((r) => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const name = (r.profiles?.nickname || r.profiles?.username || '').toLowerCase();
      const reason = (r.reason || '').toLowerCase();
      return name.includes(q) || reason.includes(q);
    }
    return true;
  });

  const totalCount = filteredRequests.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const paginatedRequests = filteredRequests.slice((page - 1) * pageSize, page * pageSize);

  // 获取当前管理员 user_id（从 localStorage）
  const getAdminUserId = (): string | null => {
    const adminInfo = localStorage.getItem('admin_info');
    if (!adminInfo) return null;
    try {
      return JSON.parse(adminInfo).user_id || null;
    } catch {
      return null;
    }
  };

  // 发送通知给用户
  const sendNotification = async (userId: string, type: string, title: string, content: string) => {
    await fetch(`${supabaseUrl}/rest/v1/notifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ user_id: userId, type, title, content }),
    });
  };

  // 通过申请
  const approveRequest = async (item: NoteRequestItem) => {
    if (!confirm(`确认通过「${item.profiles?.nickname || item.profiles?.username || '该用户'}」的申请？`)) return;
    setProcessing(true);
    try {
      const adminUserId = getAdminUserId();
      const now = new Date().toISOString();

      // 1. 更新工单状态
      await fetch(`${supabaseUrl}/rest/v1/note_requests?id=eq.${item.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          status: 'approved',
          reviewed_by: adminUserId,
          reviewed_at: now,
          admin_note: adminNote || null,
        }),
      });

      // 2. 给用户 extra_note_granted +1
      const profileRes = await fetch(
        `${supabaseUrl}/rest/v1/profiles?user_id=eq.${item.user_id}&select=extra_note_granted`,
        { headers: { 'apikey': SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SERVICE_ROLE_KEY}` } }
      );
      const profileData = await profileRes.json();
      const currentExtra = profileData?.[0]?.extra_note_granted ?? 0;
      await fetch(`${supabaseUrl}/rest/v1/profiles?user_id=eq.${item.user_id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ extra_note_granted: currentExtra + 1 }),
      });

      // 3. 发通知
      await sendNotification(
        item.user_id,
        'note_request_approved',
        '笔记发布申请已通过',
        '管理员已通过您的笔记发布申请，您现在可以再发布一条笔记啦！'
      );

      await loadRequests();
      setShowModal(false);
      setAdminNote('');
      alert('已通过申请并发放额外发布额度');
    } catch (error) {
      console.error('通过申请失败:', error);
      alert('操作失败');
    }
    setProcessing(false);
  };

  // 拒绝申请
  const rejectRequest = async (item: NoteRequestItem) => {
    if (!adminNote.trim()) {
      alert('请填写拒绝理由');
      return;
    }
    if (!confirm(`确认拒绝「${item.profiles?.nickname || item.profiles?.username || '该用户'}」的申请？`)) return;
    setProcessing(true);
    try {
      const adminUserId = getAdminUserId();
      const now = new Date().toISOString();

      await fetch(`${supabaseUrl}/rest/v1/note_requests?id=eq.${item.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          status: 'rejected',
          reviewed_by: adminUserId,
          reviewed_at: now,
          admin_note: adminNote.trim(),
        }),
      });

      await sendNotification(
        item.user_id,
        'note_request_rejected',
        '笔记发布申请已被拒绝',
        `管理员拒绝了您的申请。理由：${adminNote.trim()}`
      );

      await loadRequests();
      setShowModal(false);
      setAdminNote('');
      alert('已拒绝申请');
    } catch (error) {
      console.error('拒绝申请失败:', error);
      alert('操作失败');
    }
    setProcessing(false);
  };

  const openModal = (item: NoteRequestItem) => {
    setSelectedRequest(item);
    setAdminNote(item.admin_note || '');
    setShowModal(true);
  };

  const pendingCount = requests.filter((r) => r.status === 'pending').length;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">笔记发布申请</h1>
          <p className="text-sm text-gray-500 mt-1">管理用户每日笔记超额发布申请</p>
        </div>
        {pendingCount > 0 && (
          <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700">
            {pendingCount} 条待处理
          </span>
        )}
      </div>

      {/* 搜索 + 筛选 */}
      <div className="bg-white rounded-xl p-4 mb-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              placeholder="搜索申请人姓名或申请理由..."
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {statusFilters.map((f) => (
              <button
                key={f.value}
                onClick={() => { setStatusFilter(f.value); setPage(1); }}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === f.value
                    ? 'bg-[#2563EB] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => loadRequests()}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600"
            title="刷新"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 列表 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">
            <div className="w-8 h-8 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            加载中...
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
            暂无申请记录
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">申请人</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">申请理由</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">申请时间</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">状态</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">操作</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRequests.map((item) => (
                  <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {item.profiles?.avatar_url ? (
                          <img src={item.profiles.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-500">
                            {item.profiles?.username?.charAt(0).toUpperCase() || '?'}
                          </div>
                        )}
                        <span className="text-sm font-medium text-gray-900">
                          {item.profiles?.nickname || item.profiles?.username || '未知用户'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <p className="text-sm text-gray-600 truncate" title={item.reason}>
                        {item.reason}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                      {formatDate(item.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(item.status)}
                      {item.admin_note && (
                        <p className="text-xs text-gray-400 mt-1 truncate max-w-[120px]" title={item.admin_note}>
                          备注: {item.admin_note}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {item.status === 'pending' ? (
                          <>
                            <button
                              onClick={() => openModal(item)}
                              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                            >
                              审核
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => openModal(item)}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-50 text-gray-500 hover:bg-gray-100 transition-colors"
                          >
                            详情
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* 分页 */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <p className="text-sm text-gray-500">
                  共 {totalCount} 条，第 {page}/{totalPages} 页
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 rounded-lg text-sm border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    const p = page <= 3 ? i + 1 : page + i - 2;
                    if (p < 1 || p > totalPages) return null;
                    return (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`px-3 py-1.5 rounded-lg text-sm ${
                          page === p ? 'bg-[#2563EB] text-white' : 'border border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1.5 rounded-lg text-sm border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* 审核弹窗 */}
      {showModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* 弹窗头部 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">审核申请</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 弹窗内容 */}
            <div className="px-6 py-4">
              {/* 申请人信息 */}
              <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50 rounded-xl">
                {selectedRequest.profiles?.avatar_url ? (
                  <img src={selectedRequest.profiles.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm text-gray-500">
                    {selectedRequest.profiles?.username?.charAt(0).toUpperCase() || '?'}
                  </div>
                )}
                <div>
                  <p className="font-medium text-gray-900">
                    {selectedRequest.profiles?.nickname || selectedRequest.profiles?.username || '未知用户'}
                  </p>
                  <p className="text-xs text-gray-400">
                    申请时间：{formatDate(selectedRequest.created_at)}
                  </p>
                </div>
                <div className="ml-auto">
                  {getStatusBadge(selectedRequest.status)}
                </div>
              </div>

              {/* 申请理由 */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">申请理由</label>
                <div className="p-3 bg-gray-50 rounded-xl text-sm text-gray-700 whitespace-pre-wrap">
                  {selectedRequest.reason}
                </div>
              </div>

              {/* 拒绝理由（查看） */}
              {selectedRequest.status === 'rejected' && selectedRequest.admin_note && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">拒绝理由</label>
                  <div className="p-3 bg-red-50 rounded-xl text-sm text-red-700">
                    {selectedRequest.admin_note}
                  </div>
                </div>
              )}

              {/* 管理员备注（仅 pending 可编辑） */}
              {selectedRequest.status === 'pending' ? (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    管理员备注 <span className="text-gray-400 font-normal">(拒绝时必填)</span>
                  </label>
                  <textarea
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    placeholder="填写备注或拒绝理由..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
                  />
                </div>
              ) : selectedRequest.admin_note ? (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">管理员备注</label>
                  <div className="p-3 bg-gray-50 rounded-xl text-sm text-gray-600">
                    {selectedRequest.admin_note}
                  </div>
                </div>
              ) : null}

              {/* 审核信息 */}
              {selectedRequest.status !== 'pending' && (
                <div className="flex items-center gap-2 text-xs text-gray-400 mb-4">
                  {selectedRequest.admin_profile && (
                    <span>审核人：{selectedRequest.admin_profile.nickname || selectedRequest.admin_profile.username}</span>
                  )}
                  {selectedRequest.reviewed_at && (
                    <span>审核时间：{formatDate(selectedRequest.reviewed_at)}</span>
                  )}
                </div>
              )}
            </div>

            {/* 弹窗操作 */}
            {selectedRequest.status === 'pending' && (
              <div className="flex gap-3 px-6 pb-6">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={() => rejectRequest(selectedRequest)}
                  disabled={processing || !adminNote.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                >
                  <XCircle className="w-4 h-4" />
                  拒绝
                </button>
                <button
                  onClick={() => approveRequest(selectedRequest)}
                  disabled={processing}
                  className="flex-1 py-2.5 rounded-xl bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                >
                  <CheckCircle className="w-4 h-4" />
                  {processing ? '处理中...' : '通过'}
                </button>
              </div>
            )}
            {selectedRequest.status !== 'pending' && (
              <div className="px-6 pb-6">
                <button
                  onClick={() => setShowModal(false)}
                  className="w-full py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  关闭
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
