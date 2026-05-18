import React, { useState, useEffect } from 'react';
import { getSupabaseUrl } from '../supabase/client';
import {
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Eye,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

// Service Role Key for bypassing RLS
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkaHdtZWl0dGdkb3Nta3h0cGFrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODEzMjQ5MiwiZXhwIjoyMDkzNzA4NDkyfQ.bPatiu7NXaE2k48aTkjAGQsba6NzXlIdq2k_gGLYLBE';

const statusOptions = [
  { value: 'all', label: '全部' },
  { value: 'pending', label: '待处理' },
  { value: 'processed', label: '已处理' },
  { value: 'ignored', label: '已忽略' },
];

function ReportManagement() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [reports, setReports] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const pageSize = 10;

  // Fetch reports using fetch API with Service Role Key
  const fetchReports = async () => {
    setIsLoading(true);
    const supabaseUrl = getSupabaseUrl();
    const headers = {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    };

    try {
      // Build query params
      const params = new URLSearchParams();
      params.append('select', '*, profiles:reporter_id(username, avatar_url)');
      params.append('order', 'created_at.desc');
      params.append('offset', String((page - 1) * pageSize));
      params.append('limit', String(pageSize));

      if (statusFilter !== 'all') {
        params.append('status', `eq.${statusFilter}`);
      }

      if (searchQuery) {
        params.append('reason', `ilike.%${searchQuery}%`);
      }

      const res = await fetch(`${supabaseUrl}/rest/v1/reports?${params.toString()}`, { headers });
      const data = await res.json();
      setReports(Array.isArray(data) ? data : []);

      // Get total count
      const countParams = new URLSearchParams();
      countParams.append('select', 'id');
      if (statusFilter !== 'all') {
        countParams.append('status', `eq.${statusFilter}`);
      }
      if (searchQuery) {
        countParams.append('reason', `ilike.%${searchQuery}%`);
      }

      const countRes = await fetch(`${supabaseUrl}/rest/v1/reports?${countParams.toString()}`, { headers });
      const countData = await countRes.json();
      setTotalCount(Array.isArray(countData) ? countData.length : 0);
    } catch (error) {
      console.error('Failed to fetch reports:', error);
      setReports([]);
    }
    setIsLoading(false);
  };

  // Update report status
  const updateReport = async (id: string, status: string, note?: string) => {
    const supabaseUrl = getSupabaseUrl();
    const headers = {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    };

    const updateData: Record<string, any> = { status };
    if (note) updateData.admin_note = note;
    updateData.processed_at = new Date().toISOString();

    try {
      await fetch(`${supabaseUrl}/rest/v1/reports?id=eq.${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(updateData),
      });
      fetchReports();
      setShowModal(false);
    } catch (error) {
      console.error('Failed to update report:', error);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [page, statusFilter, searchQuery]);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700',
      processed: 'bg-green-100 text-green-700',
      ignored: 'bg-gray-100 text-gray-700',
    };
    const labels: Record<string, string> = {
      pending: '待处理',
      processed: '已处理',
      ignored: '已忽略',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || ''}`}>
        {labels[status] || status}
      </span>
    );
  };

  const getTargetTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      post: '笔记',
      comment: '评论',
      user: '用户',
    };
    return labels[type] || type;
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">举报处理</h1>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜索举报原因..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                className="w-full h-10 pl-10 pr-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E11D48] focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
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
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">举报人</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">举报类型</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">目标ID</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">举报原因</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">状态</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">举报时间</th>
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
            ) : reports.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  暂无数据
                </td>
              </tr>
            ) : (
              reports.map((report) => (
                <tr key={report.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <img
                        src={report.profiles?.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'}
                        alt=""
                        className="w-8 h-8 rounded-full"
                      />
                      <span className="text-sm text-gray-700">{report.profiles?.username || '未知用户'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                      {getTargetTypeLabel(report.target_type)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 font-mono text-xs">
                    {report.target_id?.slice(0, 8)}...
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 line-clamp-1">{report.reason}</td>
                  <td className="px-4 py-3">{getStatusBadge(report.status)}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(report.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setSelectedReport(report);
                          setShowModal(true);
                        }}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="查看详情"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {report.status === 'pending' && (
                        <>
                          <button
                            onClick={() => updateReport(report.id, 'processed')}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="处理"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => updateReport(report.id, 'ignored')}
                            className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title="忽略"
                          >
                            <XCircle className="w-4 h-4" />
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

      {/* Report Detail Modal */}
      {showModal && selectedReport && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">举报详情</h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <span className="text-2xl">&times;</span>
                </button>
              </div>
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">举报人</p>
                  <div className="flex items-center gap-2">
                    <img
                      src={selectedReport.profiles?.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'}
                      alt=""
                      className="w-10 h-10 rounded-full"
                    />
                    <span className="font-medium text-gray-900">{selectedReport.profiles?.username || '未知用户'}</span>
                  </div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">举报类型</p>
                  <p className="font-medium text-gray-900">{getTargetTypeLabel(selectedReport.target_type)}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">目标ID</p>
                  <p className="font-mono text-sm text-gray-900 break-all">{selectedReport.target_id}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">举报原因</p>
                  <p className="font-medium text-gray-900">{selectedReport.reason}</p>
                </div>
                {selectedReport.description && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500 mb-1">详细描述</p>
                    <p className="text-gray-900">{selectedReport.description}</p>
                  </div>
                )}
                {selectedReport.status === 'pending' && (
                  <div className="flex gap-2 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => updateReport(selectedReport.id, 'processed')}
                      className="flex-1 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                    >
                      处理举报
                    </button>
                    <button
                      onClick={() => updateReport(selectedReport.id, 'ignored')}
                      className="flex-1 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                    >
                      忽略举报
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ReportManagement;
