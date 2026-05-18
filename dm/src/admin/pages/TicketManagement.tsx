import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Filter,
  MessageCircle,
  CheckCircle,
  XCircle,
  Crown,
  ChevronLeft,
  ChevronRight,
  Send,
  X,
} from 'lucide-react';
import { getSupabaseUrl } from '../supabase/client';

// Service Role Key - 绕过 RLS
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkaHdtZWl0dGdkb3Nta3h0cGFrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODEzMjQ5MiwiZXhwIjoyMDkzNzA4NDkyfQ.bPatiu7NXaE2k48aTkjAGQsba6NzXlIdq2k_gGLYLBE';

type TicketItem = {
  id: string;
  user_id: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  admin_reply: string | null;
  replied_by: string | null;
  replied_at: string | null;
  created_at: string;
  profiles?: {
    id: string;
    username: string;
    avatar_url: string;
    role: string;
  };
};

const statusOptions = [
  { value: 'all', label: '全部' },
  { value: 'open', label: '待处理' },
  { value: 'in_progress', label: '处理中' },
  { value: 'resolved', label: '已解决' },
  { value: 'closed', label: '已关闭' },
];

const priorityOptions = [
  { value: 'vip', label: 'VIP优先', color: 'bg-amber-100 text-amber-700', isVip: true },
  { value: 'urgent', label: '紧急', color: 'bg-red-100 text-red-700' },
  { value: 'high', label: '高', color: 'bg-orange-100 text-orange-700' },
  { value: 'normal', label: '中', color: 'bg-blue-100 text-blue-700' },
  { value: 'low', label: '低', color: 'bg-gray-100 text-gray-700' },
];

const getStatusBadge = (status: string) => {
  const styles: Record<string, string> = {
    open: 'bg-yellow-100 text-yellow-700',
    in_progress: 'bg-blue-100 text-blue-700',
    resolved: 'bg-green-100 text-green-700',
    closed: 'bg-gray-100 text-gray-700',
  };
  const labels: Record<string, string> = {
    open: '待处理',
    in_progress: '处理中',
    resolved: '已解决',
    closed: '已关闭',
  };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
      {labels[status] || status}
    </span>
  );
};

const getPriorityBadge = (priority: string) => {
  const option = priorityOptions.find((o) => o.value === priority);
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${option?.color || 'bg-gray-100 text-gray-700'}`}>
      {option?.label || priority}
    </span>
  );
};

export default function TicketManagement() {
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [selectedTicket, setSelectedTicket] = useState<TicketItem | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [processing, setProcessing] = useState(false);
  const pageSize = 10;

  const supabaseUrl = getSupabaseUrl();

  const loadTickets = useCallback(async () => {
    setLoading(true);
    try {
      // 构建查询参数
      const params = new URLSearchParams({
        select: '*',
        order: 'created_at.desc',
      });

      if (statusFilter !== 'all') {
        params.set('status', `eq.${statusFilter}`);
      }

      const res = await fetch(`${supabaseUrl}/rest/v1/support_tickets?${params}`, {
        headers: {
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        },
      });
      let data = await res.json();

      // 手动 join profiles 获取用户信息
      if (Array.isArray(data) && data.length > 0) {
        const userIds = [...new Set(data.map((t: TicketItem) => t.user_id).filter(Boolean))];
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

          data = data.map((t: TicketItem) => ({
            ...t,
            profiles: userMap[t.user_id] || null,
          }));
        }
      }

      // 按 VIP 优先级排序：vip 优先，然后按创建时间
      data = Array.isArray(data) ? data.sort((a: TicketItem, b: TicketItem) => {
        if (a.priority === 'vip' && b.priority !== 'vip') return -1;
        if (a.priority !== 'vip' && b.priority === 'vip') return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }) : [];

      setTickets(data);
    } catch (error) {
      console.error('加载工单失败:', error);
      setTickets([]);
    }
    setLoading(false);
  }, [supabaseUrl, statusFilter]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  // 过滤
  const filteredTickets = tickets.filter((ticket) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        ticket.subject?.toLowerCase().includes(query) ||
        ticket.description?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const totalCount = filteredTickets.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const paginatedTickets = filteredTickets.slice((page - 1) * pageSize, page * pageSize);

  // 更新工单状态
  const updateStatus = async (id: string, status: string) => {
    setProcessing(true);
    try {
      await fetch(`${supabaseUrl}/rest/v1/support_tickets?id=eq.${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ status }),
      });
      await loadTickets();
      if (selectedTicket?.id === id) {
        setSelectedTicket({ ...selectedTicket, status });
      }
    } catch (error) {
      console.error('更新状态失败:', error);
      alert('操作失败');
    }
    setProcessing(false);
  };

  // 回复工单
  const handleReply = async () => {
    if (!selectedTicket || !replyContent.trim()) {
      alert('请输入回复内容');
      return;
    }

    setProcessing(true);
    try {
      await fetch(`${supabaseUrl}/rest/v1/support_tickets?id=eq.${selectedTicket.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          admin_reply: replyContent,
          replied_at: new Date().toISOString(),
          status: 'in_progress',
        }),
      });
      await loadTickets();
      setSelectedTicket({
        ...selectedTicket,
        admin_reply: replyContent,
        replied_at: new Date().toISOString(),
        status: 'in_progress',
      });
      setReplyContent('');
      alert('回复成功');
    } catch (error) {
      console.error('回复失败:', error);
      alert('回复失败');
    }
    setProcessing(false);
  };

  const viewDetail = (ticket: TicketItem) => {
    setSelectedTicket(ticket);
    setReplyContent(ticket.admin_reply || '');
    setShowModal(true);
  };

  const isVip = (priority: string) => priority === 'vip';

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">客服工单</h1>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜索工单主题或内容..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-10 pr-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E11D48] focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="h-10 px-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E11D48] focus:border-transparent"
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
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
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">工单主题</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">用户</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">优先级</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">状态</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">提交时间</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  加载中...
                </td>
              </tr>
            ) : paginatedTickets.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  暂无数据
                </td>
              </tr>
            ) : (
              paginatedTickets.map((ticket) => (
                <tr key={ticket.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {isVip(ticket.priority) && (
                        <Crown className="w-4 h-4 text-amber-500" />
                      )}
                      <span className="font-medium text-gray-900">{ticket.subject}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <img
                        src={ticket.profiles?.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'}
                        alt=""
                        className="w-8 h-8 rounded-full"
                      />
                      <div>
                        <span className="text-sm text-gray-700">{ticket.profiles?.username || '未知用户'}</span>
                        {ticket.profiles?.role === 'vip' && (
                          <span className="ml-1 text-xs text-amber-500">VIP</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">{getPriorityBadge(ticket.priority)}</td>
                  <td className="px-4 py-3">{getStatusBadge(ticket.status)}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(ticket.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => viewDetail(ticket)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="查看详情"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </button>
                      {ticket.status === 'open' && (
                        <button
                          onClick={() => updateStatus(ticket.id, 'in_progress')}
                          disabled={processing}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                          title="开始处理"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                      {ticket.status !== 'closed' && ticket.status !== 'resolved' && (
                        <button
                          onClick={() => updateStatus(ticket.id, 'resolved')}
                          disabled={processing}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                          title="标记为已解决"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
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
      </div>

      {/* Detail Modal */}
      {showModal && selectedTicket && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">工单详情</h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* User Info */}
              <div className="flex items-center gap-3 mb-4 p-4 bg-gray-50 rounded-xl">
                <img
                  src={selectedTicket.profiles?.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'}
                  alt=""
                  className="w-12 h-12 rounded-full"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900">{selectedTicket.profiles?.username || '未知用户'}</p>
                    {selectedTicket.profiles?.role === 'vip' && (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs">VIP</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">{new Date(selectedTicket.created_at).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  {getPriorityBadge(selectedTicket.priority)}
                  {getStatusBadge(selectedTicket.status)}
                </div>
              </div>

              {/* Subject */}
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{selectedTicket.subject}</h3>

              {/* Description */}
              <div className="text-gray-700 whitespace-pre-wrap mb-6 p-4 bg-gray-50 rounded-xl">
                {selectedTicket.description}
              </div>

              {/* Admin Reply */}
              {selectedTicket.admin_reply && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">管理员回复</h4>
                  <div className="text-gray-700 whitespace-pre-wrap p-4 bg-blue-50 rounded-xl border border-blue-100">
                    {selectedTicket.admin_reply}
                  </div>
                  {selectedTicket.replied_at && (
                    <p className="text-xs text-gray-500 mt-2">
                      回复时间: {new Date(selectedTicket.replied_at).toLocaleString()}
                    </p>
                  )}
                </div>
              )}

              {/* Reply Input */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {selectedTicket.admin_reply ? '追加回复' : '回复工单'}
                </label>
                <textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="请输入回复内容..."
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E11D48] focus:border-transparent resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={handleReply}
                  disabled={processing || !replyContent.trim()}
                  className="flex-1 py-3 bg-[#E11D48] text-white rounded-lg hover:bg-[#C41E3A] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Send className="w-5 h-5" />
                  发送回复
                </button>
                {selectedTicket.status !== 'resolved' && (
                  <button
                    onClick={() => {
                      updateStatus(selectedTicket.id, 'resolved');
                      setShowModal(false);
                    }}
                    disabled={processing}
                    className="flex-1 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-5 h-5" />
                    标记已解决
                  </button>
                )}
                {selectedTicket.status !== 'closed' && (
                  <button
                    onClick={() => {
                      updateStatus(selectedTicket.id, 'closed');
                      setShowModal(false);
                    }}
                    disabled={processing}
                    className="flex-1 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <XCircle className="w-5 h-5" />
                    关闭工单
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
