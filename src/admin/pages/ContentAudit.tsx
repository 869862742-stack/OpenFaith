import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Filter,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
} from 'lucide-react';
import { getSupabaseUrl } from '../supabase/client';

// Service Role Key - 绕过 RLS
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkaHdtZWl0dGdkb3Nta3h0cGFrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODEzMjQ5MiwiZXhwIjoyMDkzNzA4NDkyfQ.bPatiu7NXaE2k48aTkjAGQsba6NzXlIdq2k_gGLYLBE';

type PostItem = {
  id: string;
  title: string;
  content: string;
  cover_image: string | null;
  images: string[] | null;
  user_id: string;
  likes: number;
  comments: number;
  tags: string[] | null;
  status: string;
  
  created_at: string;
  profiles?: {
    id: string;
    username: string;
    avatar_url: string;
    faith_tag: string | null;
  };
};

export default function ContentAudit() {
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [selectedPost, setSelectedPost] = useState<PostItem | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);
  const pageSize = 10;

  const supabaseUrl = getSupabaseUrl();

  // 获取待审核的笔记：status=pending
  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      // 查询 pending 或 ai_flagged 的笔记
      const params = new URLSearchParams({
        select: '*',
        status: 'eq.pending',
        order: 'created_at.desc',
      });

      const res = await fetch(`${supabaseUrl}/rest/v1/posts?${params}`, {
        headers: {
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        },
      });
      let data = await res.json();
      
      // 手动 join profiles 获取作者信息
      if (Array.isArray(data) && data.length > 0) {
        const userIds = [...new Set(data.map((p: PostItem) => p.user_id).filter(Boolean))];
        if (userIds.length > 0) {
          const usersParams = new URLSearchParams({
            select: 'id,username,avatar_url,faith_tag',
          });
          userIds.forEach(uid => {
            usersParams.append('id', `eq.${uid}`);
          });
          
          const usersRes = await fetch(`${supabaseUrl}/rest/v1/profiles?user_id=in.(${userIds.join(',')})&select=user_id,username,avatar_url,faith_tag`, {
            headers: {
              'apikey': SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
            },
          });
          const users = await usersRes.json();
          const userMap: Record<string, any> = {};
          
          if (Array.isArray(users)) {
            users.forEach((u: any) => {
              userMap[u.user_id] = u;
            });
          }
          
          data = data.map((p: PostItem) => ({
            ...p,
            profiles: userMap[p.user_id] || null,
          }));
        }
      }
      
      setPosts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('加载待审核内容失败:', error);
      setPosts([]);
    }
    setLoading(false);
  }, [supabaseUrl]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  // 过滤
  const filteredPosts = posts.filter((post) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        post.title?.toLowerCase().includes(query) ||
        post.content?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const totalCount = filteredPosts.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const paginatedPosts = filteredPosts.slice((page - 1) * pageSize, page * pageSize);

  // 审核通过
  const handleApprove = async (post: PostItem) => {
    if (!confirm('确定通过此笔记吗？')) return;
    setProcessing(post.id);

    try {
      await fetch(`${supabaseUrl}/rest/v1/posts?id=eq.${post.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          status: 'published',
          
        }),
      });
      await loadPosts();
    } catch (error) {
      console.error('审核失败:', error);
      alert('操作失败');
    }
    setProcessing(null);
  };

  // 审核屏蔽
  const handleBlock = async (post: PostItem) => {
    if (!confirm('确定屏蔽此笔记吗？')) return;
    setProcessing(post.id);

    try {
      await fetch(`${supabaseUrl}/rest/v1/posts?id=eq.${post.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          status: 'blocked',
          
        }),
      });
      await loadPosts();
    } catch (error) {
      console.error('审核失败:', error);
      alert('操作失败');
    }
    setProcessing(null);
  };

  const viewDetail = (post: PostItem) => {
    setSelectedPost(post);
    setShowModal(true);
  };

  const pendingCount = posts.filter(p => p.status === 'pending').length;
  const flaggedCount = 0; // AI标记功能暂未实现

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">内容审核</h1>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">待审核笔记</p>
              <p className="text-2xl font-bold text-gray-900">{pendingCount}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">AI标记笔记</p>
              <p className="text-2xl font-bold text-gray-900">{flaggedCount}</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">总待审核</p>
              <p className="text-2xl font-bold text-gray-900">{posts.length}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜索笔记标题或内容..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-10 pr-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E11D48] focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-500">按标题或内容搜索</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">内容</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">作者</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">状态</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">AI标记</th>
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
            ) : paginatedPosts.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  暂无待审核内容
                </td>
              </tr>
            ) : (
              paginatedPosts.map((post) => (
                <tr key={post.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {post.cover_image && (
                        <img
                          src={post.cover_image}
                          alt=""
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      )}
                      <div className="max-w-md">
                        <p className="font-medium text-gray-900 line-clamp-1">{post.title || '无标题'}</p>
                        <p className="text-sm text-gray-500 line-clamp-1">{post.content}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <img
                        src={post.profiles?.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'}
                        alt=""
                        className="w-8 h-8 rounded-full"
                      />
                      <div>
                        <p className="text-sm text-gray-700">{post.profiles?.username || '未知用户'}</p>
                        {post.profiles?.faith_tag && (
                          <p className="text-xs text-gray-400">{post.profiles.faith_tag}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      post.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {post.status === 'pending' ? '待审核' : post.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    false ? (
                      <span className="text-sm text-orange-600 flex items-center justify-center gap-1">
                        <AlertTriangle className="w-4 h-4" />
                        已标记
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">正常</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(post.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => viewDetail(post)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="查看详情"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleApprove(post)}
                        disabled={processing === post.id}
                        className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                        title="通过"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleBlock(post)}
                        disabled={processing === post.id}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        title="屏蔽"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
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

      {/* Detail Modal */}
      {showModal && selectedPost && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">笔记详情</h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <span className="text-2xl">&times;</span>
                </button>
              </div>

              {/* Author Info */}
              <div className="flex items-center gap-3 mb-6 p-4 bg-gray-50 rounded-xl">
                <img
                  src={selectedPost.profiles?.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'}
                  alt=""
                  className="w-12 h-12 rounded-full"
                />
                <div>
                  <p className="font-medium text-gray-900">{selectedPost.profiles?.username || '未知用户'}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(selectedPost.created_at).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Cover Image */}
              {selectedPost.cover_image && (
                <div className="mb-4">
                  <img
                    src={selectedPost.cover_image}
                    alt=""
                    className="w-full h-48 object-cover rounded-xl"
                  />
                </div>
              )}

              {/* Title */}
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {selectedPost.title || '无标题'}
              </h3>

              {/* Content */}
              <div className="text-gray-700 whitespace-pre-wrap mb-4">
                {selectedPost.content}
              </div>

              {/* Images */}
              {selectedPost.images && selectedPost.images.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {selectedPost.images.map((img, idx) => (
                    <img
                      key={idx}
                      src={img}
                      alt=""
                      className="w-full h-24 object-cover rounded-lg"
                    />
                  ))}
                </div>
              )}

              {/* Tags */}
              {selectedPost.tags && selectedPost.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {selectedPost.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Stats */}
              <div className="flex items-center gap-4 text-sm text-gray-500 mb-6">
                <span>❤️ {selectedPost.likes_count || 0} 点赞</span>
                <span>💬 {selectedPost.comments_count || 0} 评论</span>
                {selectedPost.profiles?.faith_tag && (
                  <span>🏷️ {selectedPost.profiles.faith_tag}</span>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    handleApprove(selectedPost);
                    setShowModal(false);
                  }}
                  className="flex-1 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" />
                  通过审核
                </button>
                <button
                  onClick={() => {
                    handleBlock(selectedPost);
                    setShowModal(false);
                  }}
                  className="flex-1 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
                >
                  <XCircle className="w-5 h-5" />
                  屏蔽笔记
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
