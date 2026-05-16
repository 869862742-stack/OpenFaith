import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase/client';
import { Check, X, Clock, Image as ImageIcon, User, Calendar, Users, AlertCircle } from 'lucide-react';

// Service Role Key 用于绕过 RLS
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkaHdtZWl0dGdkb3Nta3h0cGFrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODEzMjQ5MiwiZXhwIjoyMDkzNzA4NDkyfQ.bPatiu7NXaE2k48aTkjAGQsba6NzXlIdq2k_gGLYLBE';
// 使用 Cloudflare Worker 代理加速（走香港/日本节点）
const SUPABASE_URL = window.location.origin + '/sb-api';

// 封装 fetch 请求
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

interface GroupTagRequest {
  id: string;
  user_id: string;
  tag_name: string;
  description: string | null;
  cover_image_url: string | null;
  status: 'pending' | 'approved' | 'rejected';
  reject_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  profiles?: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
}

interface GroupChat {
  id: string;
  user_id: string;
  title: string;
  content: string;
  tags: string[];
  status: 'pending' | 'published' | 'rejected';
  created_at: string;
  profiles?: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
}

// 快捷拒绝原因
const REJECT_REASONS = [
  '群聊名称不符合规范',
  '群聊描述不够清晰',
  '标签选择不当',
  '群聊内容涉及敏感话题',
  '已存在相同主题的群聊',
];

function GroupTagReview() {
  const [activeTab, setActiveTab] = useState<'group' | 'tag'>('group');
  const [selectedGroup, setSelectedGroup] = useState<GroupChat | null>(null);
  const [selectedTag, setSelectedTag] = useState<GroupTagRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [groupRequests, setGroupRequests] = useState<GroupChat[]>([]);
  const [tagRequests, setTagRequests] = useState<GroupTagRequest[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // 获取群聊审核列表
  const fetchGroupRequests = async () => {
    setIsLoading(true);
    try {
      // 查询待审核的群聊
      const params = new URLSearchParams();
      params.append('select', 'id,user_id,title,content,tags,status,created_at');
      params.append('tags', 'cs.__group_chat__');
      params.append('status', 'eq.pending');
      params.append('order', 'created_at.desc');

      const groups = await adminFetch(`${SUPABASE_URL}/rest/v1/posts?${params.toString()}`) || [];
      
      // 获取所有群聊创建者的用户ID
      const userIds = [...new Set(groups.map((g: GroupChat) => g.user_id))];
      
      if (userIds.length > 0) {
        // 并行获取用户信息
        // 注意：profiles 表的 id 是自增 UUID，user_id 才是关联字段
        const userParams = new URLSearchParams();
        userParams.append('select', 'user_id,username,avatar_url');
        userParams.append('user_id', `in.(${userIds.join(',')})`);
        
        const profiles = await adminFetch(`${SUPABASE_URL}/rest/v1/profiles?${userParams.toString()}`) || [];
        const profileMap = new Map(profiles.map((p: any) => [p.user_id, p]));
        
        // 合并数据
        const mergedGroups = groups.map((g: GroupChat) => ({
          ...g,
          profiles: profileMap.get(g.user_id) || null,
        }));
        
        // VIP用户优先排序
        mergedGroups.sort((a: any, b: any) => {
          const aIsVip = a.profiles?.is_vip || false;
          const bIsVip = b.profiles?.is_vip || false;
          if (aIsVip && !bIsVip) return -1;
          if (!aIsVip && bIsVip) return 1;
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        });
        
        setGroupRequests(mergedGroups);
      } else {
        setGroupRequests([]);
      }
    } catch (error) {
      console.error('Error fetching group requests:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 获取标签审核列表
  const fetchTagRequests = async () => {
    setIsLoading(true);
    try {
      // 查询 tag_requests 表
      const params = new URLSearchParams();
      params.append('select', 'id,user_id,tag_name,description,cover_image_url,status,reject_reason,reviewed_by,reviewed_at,created_at');
      params.append('order', 'created_at.desc');

      const requests = await adminFetch(`${SUPABASE_URL}/rest/v1/tag_requests?${params.toString()}`) || [];
      
      // 获取所有申请者的用户ID
      const userIds = [...new Set(requests.map((r: GroupTagRequest) => r.user_id))];
      
      if (userIds.length > 0) {
        // 并行获取用户信息
        // 注意：profiles 表的 id 是自增 UUID，user_id 才是关联字段
        const userParams = new URLSearchParams();
        userParams.append('select', 'user_id,username,avatar_url');
        userParams.append('user_id', `in.(${userIds.join(',')})`);
        
        const profiles = await adminFetch(`${SUPABASE_URL}/rest/v1/profiles?${userParams.toString()}`) || [];
        const profileMap = new Map(profiles.map((p: any) => [p.user_id, p]));
        
        // 合并数据
        const mergedRequests = requests.map((r: GroupTagRequest) => ({
          ...r,
          profiles: profileMap.get(r.user_id) || null,
        }));
        
        setTagRequests(mergedRequests);
      } else {
        setTagRequests([]);
      }
    } catch (error) {
      console.error('Error fetching tag requests:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'group') {
      fetchGroupRequests();
    } else {
      fetchTagRequests();
    }
  }, [activeTab]);

  // 审核群聊 - 通过
  const handleApproveGroup = async (group: GroupChat) => {
    if (!confirm('确认通过此群聊申请？')) return;
    
    setIsProcessing(true);
    try {
      // 更新群聊状态为 published
      await adminFetch(`${SUPABASE_URL}/rest/v1/posts?id=eq.${group.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'published' }),
      });
      
      // 发送通知
      await adminFetch(`${SUPABASE_URL}/rest/v1/announcements`, {
        method: 'POST',
        body: JSON.stringify({
          title: `[user:${group.user_id}] 群聊审核通过`,
          content: `您创建的群聊「${group.title}」已审核通过，现在可以在群聊列表中显示了。`,
          type: 'group_approved',
          is_active: true,
          is_pinned: false,
          created_at: new Date().toISOString(),
        }),
      });
      
      setSelectedGroup(null);
      fetchGroupRequests();
    } catch (error) {
      console.error('Error approving group:', error);
      alert('操作失败');
    } finally {
      setIsProcessing(false);
    }
  };

  // 审核群聊 - 拒绝
  const handleRejectGroup = async () => {
    if (!selectedGroup || !rejectReason.trim()) {
      alert('请输入拒绝原因');
      return;
    }
    
    setIsProcessing(true);
    try {
      // 更新群聊状态为 rejected
      await adminFetch(`${SUPABASE_URL}/rest/v1/posts?id=eq.${selectedGroup.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ 
          status: 'rejected',
          content: (selectedGroup.content || '') + `\n\n【审核拒绝原因】${rejectReason}`
        }),
      });
      
      // 发送通知
      await adminFetch(`${SUPABASE_URL}/rest/v1/announcements`, {
        method: 'POST',
        body: JSON.stringify({
          title: `[user:${selectedGroup.user_id}] 群聊审核未通过`,
          content: `您创建的群聊「${selectedGroup.title}」未通过审核。\n\n拒绝原因：${rejectReason}`,
          type: 'group_rejected',
          is_active: true,
          is_pinned: false,
          created_at: new Date().toISOString(),
        }),
      });
      
      setShowRejectModal(false);
      setRejectReason('');
      setSelectedGroup(null);
      fetchGroupRequests();
    } catch (error) {
      console.error('Error rejecting group:', error);
      alert('操作失败');
    } finally {
      setIsProcessing(false);
    }
  };

  // 审核标签 - 通过
  const handleApproveTag = async (request: GroupTagRequest) => {
    if (!confirm('确认通过此标签申请？')) return;
    
    setIsProcessing(true);
    try {
      // 更新请求状态为 approved
      await adminFetch(`${SUPABASE_URL}/rest/v1/tag_requests?id=eq.${request.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
        }),
      });
      
      // 可选：向 tags 表插入新标签
      await adminFetch(`${SUPABASE_URL}/rest/v1/tags`, {
        method: 'POST',
        body: JSON.stringify({
          name: request.tag_name,
          description: request.description,
          requires_review: false,
        }),
      }).catch(() => {/* 忽略重复标签错误 */});
      
      setSelectedTag(null);
      fetchTagRequests();
    } catch (error) {
      console.error('Error approving tag:', error);
      alert('操作失败');
    } finally {
      setIsProcessing(false);
    }
  };

  // 审核标签 - 拒绝
  const handleRejectTag = async () => {
    if (!selectedTag || !rejectReason.trim()) {
      alert('请输入拒绝原因');
      return;
    }
    
    setIsProcessing(true);
    try {
      await adminFetch(`${SUPABASE_URL}/rest/v1/tag_requests?id=eq.${selectedTag.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'rejected',
          reject_reason: rejectReason,
          reviewed_at: new Date().toISOString(),
        }),
      });
      
      setShowRejectModal(false);
      setRejectReason('');
      setSelectedTag(null);
      fetchTagRequests();
    } catch (error) {
      console.error('Error rejecting tag:', error);
      alert('操作失败');
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">待审核</span>;
      case 'approved':
      case 'published':
        return <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">已通过</span>;
      case 'rejected':
        return <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">已拒绝</span>;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E11D48]"></div>
      </div>
    );
  }

  const pendingGroups = groupRequests.filter(g => g.status === 'pending');
  const pendingTags = tagRequests.filter(r => r.status === 'pending');
  const processedTags = tagRequests.filter(r => r.status !== 'pending');

  return (
    <div className="space-y-6">
      {/* 标题和Tab */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">群聊审核管理</h1>
        <p className="text-sm text-gray-500 mt-1">管理群聊创建申请和标签审核</p>
      </div>

      {/* Tab切换 */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('group')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'group' 
              ? 'bg-[#E11D48] text-white' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            群聊审核
            {pendingGroups.length > 0 && (
              <span className="px-1.5 py-0.5 bg-yellow-400 text-white text-xs rounded-full">
                {pendingGroups.length}
              </span>
            )}
          </div>
        </button>
        <button
          onClick={() => setActiveTab('tag')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'tag' 
              ? 'bg-[#E11D48] text-white' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4" />
            标签审核
            {pendingTags.length > 0 && (
              <span className="px-1.5 py-0.5 bg-yellow-400 text-white text-xs rounded-full">
                {pendingTags.length}
              </span>
            )}
          </div>
        </button>
      </div>

      {/* 群聊审核内容 */}
      {activeTab === 'group' && (
        <>
          {pendingGroups.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">暂无待审核的群聊申请</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingGroups.map((group) => (
                <div
                  key={group.id}
                  className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setSelectedGroup(group)}
                >
                  <div className="flex items-start gap-3">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: '#E11D48' + '15' }}
                    >
                      <Users className="w-6 h-6 text-[#E11D48]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-medium text-gray-900 truncate">{group.title}</h3>
                        {getStatusBadge(group.status)}
                      </div>
                      {group.content && (
                        <p className="text-sm text-gray-600 line-clamp-2 mb-2">{group.content}</p>
                      )}
                      <div className="flex flex-wrap gap-1 mb-2">
                        {group.tags?.filter(t => t !== '__group_chat__').slice(0, 3).map((tag) => (
                          <span 
                            key={tag} 
                            className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <User className="w-3 h-3" />
                        <span>{group.profiles?.username || '未知用户'}</span>
                        {group.profiles?.is_vip && (
                          <span className="px-1 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs">VIP</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(group.created_at).toLocaleDateString('zh-CN')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* 标签审核内容 */}
      {activeTab === 'tag' && (
        <>
          {/* 待审核标签 */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-yellow-500" />
              待审核标签
              <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs">
                {pendingTags.length}
              </span>
            </h2>

            {pendingTags.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">暂无待审核的标签申请</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendingTags.map((request) => (
                  <div
                    key={request.id}
                    className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setSelectedTag(request)}
                  >
                    {request.cover_image_url && (
                      <div className="w-full h-32 rounded-lg overflow-hidden mb-3 bg-gray-100">
                        <img
                          src={request.cover_image_url}
                          alt={request.tag_name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-medium text-gray-900">{request.tag_name}</h3>
                      {getStatusBadge(request.status)}
                    </div>
                    {request.description && (
                      <p className="text-sm text-gray-600 line-clamp-2 mb-3">{request.description}</p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <User className="w-3 h-3" />
                      <span>{request.profiles?.username || '未知用户'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(request.created_at).toLocaleDateString('zh-CN')}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 已处理记录 */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">已处理记录</h2>
            {processedTags.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                <p className="text-gray-500 text-sm">暂无已处理记录</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">标签名称</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">申请人</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">申请时间</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {processedTags.map((request) => (
                      <tr key={request.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">{request.tag_name}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{request.profiles?.username || '未知用户'}</td>
                        <td className="px-4 py-3">{getStatusBadge(request.status)}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {new Date(request.created_at).toLocaleDateString('zh-CN')}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setSelectedTag(request)}
                            className="text-[#E11D48] hover:text-[#be123c] text-sm font-medium"
                          >
                            查看详情
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* 群聊详情弹窗 */}
      {selectedGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">群聊申请详情</h2>
                <button
                  onClick={() => {
                    setSelectedGroup(null);
                    setShowRejectModal(false);
                    setRejectReason('');
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">群聊名称</label>
                  <p className="text-gray-900 mt-1 text-lg font-medium">{selectedGroup.title}</p>
                </div>

                {selectedGroup.content && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">群聊描述</label>
                    <p className="text-gray-900 mt-1">{selectedGroup.content}</p>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-gray-500">群聊标签</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {selectedGroup.tags?.filter(t => t !== '__group_chat__').map((tag) => (
                      <span 
                        key={tag} 
                        className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">创建者</label>
                  <div className="flex items-center gap-2 mt-1">
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden"
                      style={{ backgroundColor: '#E11D4815' }}
                    >
                      {selectedGroup.profiles?.avatar_url ? (
                        <img 
                          src={selectedGroup.profiles.avatar_url} 
                          alt="" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-4 h-4 text-[#E11D48]" />
                      )}
                    </div>
                    <span className="text-gray-900">{selectedGroup.profiles?.username || '未知用户'}</span>
                    {selectedGroup.profiles?.is_vip && (
                      <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs">VIP</span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">创建时间</label>
                  <p className="text-gray-900 mt-1">
                    {new Date(selectedGroup.created_at).toLocaleString('zh-CN')}
                  </p>
                </div>

                {selectedGroup.status === 'pending' && !showRejectModal && (
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => handleApproveGroup(selectedGroup)}
                      disabled={isProcessing}
                      className="flex-1 h-12 bg-green-600 text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-green-700 disabled:opacity-50"
                    >
                      <Check className="w-5 h-5" />
                      通过
                    </button>
                    <button
                      onClick={() => setShowRejectModal(true)}
                      disabled={isProcessing}
                      className="flex-1 h-12 bg-red-600 text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-red-700 disabled:opacity-50"
                    >
                      <X className="w-5 h-5" />
                      拒绝
                    </button>
                  </div>
                )}

                {selectedGroup.status === 'pending' && showRejectModal && (
                  <div className="pt-4 space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">拒绝原因</label>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {REJECT_REASONS.map((reason) => (
                          <button
                            key={reason}
                            onClick={() => setRejectReason(reason)}
                            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                              rejectReason === reason 
                                ? 'bg-red-100 text-red-700 border border-red-300' 
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {reason}
                          </button>
                        ))}
                      </div>
                      <textarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="请输入或选择拒绝原因..."
                        rows={3}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-[#E11D48] focus:outline-none resize-none"
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setShowRejectModal(false);
                          setRejectReason('');
                        }}
                        className="flex-1 h-11 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200"
                      >
                        取消
                      </button>
                      <button
                        onClick={handleRejectGroup}
                        disabled={isProcessing || !rejectReason.trim()}
                        className="flex-1 h-11 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 disabled:opacity-50"
                      >
                        确认拒绝
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 标签详情弹窗 */}
      {selectedTag && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">标签申请详情</h2>
                <button
                  onClick={() => {
                    setSelectedTag(null);
                    setShowRejectModal(false);
                    setRejectReason('');
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {selectedTag.cover_image_url && (
                <div className="w-full h-48 rounded-xl overflow-hidden mb-4 bg-gray-100">
                  <img
                    src={selectedTag.cover_image_url}
                    alt={selectedTag.tag_name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">标签名称</label>
                  <p className="text-gray-900 mt-1">{selectedTag.tag_name}</p>
                </div>

                {selectedTag.description && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">描述</label>
                    <p className="text-gray-900 mt-1">{selectedTag.description}</p>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-gray-500">申请人</label>
                  <div className="flex items-center gap-2 mt-1">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-900">{selectedTag.profiles?.username || '未知用户'}</span>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">申请时间</label>
                  <p className="text-gray-900 mt-1">
                    {new Date(selectedTag.created_at).toLocaleString('zh-CN')}
                  </p>
                </div>

                {selectedTag.status === 'rejected' && selectedTag.reject_reason && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">拒绝原因</label>
                    <p className="text-red-600 mt-1">{selectedTag.reject_reason}</p>
                  </div>
                )}

                {selectedTag.status === 'pending' && !showRejectModal && (
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => handleApproveTag(selectedTag)}
                      disabled={isProcessing}
                      className="flex-1 h-12 bg-green-600 text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-green-700 disabled:opacity-50"
                    >
                      <Check className="w-5 h-5" />
                      通过
                    </button>
                    <button
                      onClick={() => setShowRejectModal(true)}
                      disabled={isProcessing}
                      className="flex-1 h-12 bg-red-600 text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-red-700 disabled:opacity-50"
                    >
                      <X className="w-5 h-5" />
                      拒绝
                    </button>
                  </div>
                )}

                {selectedTag.status === 'pending' && showRejectModal && (
                  <div className="pt-4 space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">拒绝原因</label>
                      <textarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="请输入拒绝原因..."
                        rows={3}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-[#E11D48] focus:outline-none resize-none"
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setShowRejectModal(false);
                          setRejectReason('');
                        }}
                        className="flex-1 h-11 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200"
                      >
                        取消
                      </button>
                      <button
                        onClick={handleRejectTag}
                        disabled={isProcessing}
                        className="flex-1 h-11 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 disabled:opacity-50"
                      >
                        确认拒绝
                      </button>
                    </div>
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

export default GroupTagReview;
