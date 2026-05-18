import React, { useState, useEffect, useMemo } from 'react';
import { cachedFetch } from '../../utils/apiCache';
import {
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Trash2,
  ChevronDown,
  ChevronRight,
  MessageSquare,
  FolderOpen,
  FolderClosed,
  User,
  Loader2,
} from 'lucide-react';

// Service Role Key for bypassing RLS
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkaHdtZWl0dGdkb3Nta3h0cGFrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODEzMjQ5MiwiZXhwIjoyMDkzNzA4NDkyfQ.bPatiu7NXaE2k48aTkjAGQsba6NzXlIdq2k_gGLYLBE';
const API_BASE = '/sb-api/rest/v1';
const LARGE_DATA_THRESHOLD = 500; // 超过此数量使用服务端分页

const statusOptions = [
  { value: 'all', label: '全部' },
  { value: 'pending', label: '待审核' },
  { value: 'published', label: '已发布' },
  { value: 'blocked', label: '已屏蔽' },
];

// 评论类型定义
interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  status: string;
  created_at: string;
  updated_at?: string;
}

interface Profile {
  user_id: string;
  username: string;
  avatar_url: string;
}

interface Post {
  id: string;
  title: string;
}

// 合并后的评论数据
interface MergedComment extends Comment {
  profiles: Profile;
  posts: Post;
}

// 按笔记和作者分组的数据结构
interface AuthorGroup {
  user_id: string;
  username: string;
  avatar_url: string;
  comments: MergedComment[];
  isExpanded: boolean;
}

interface PostGroup {
  post_id: string;
  title: string;
  comments: MergedComment[];
  authors: AuthorGroup[];
  isExpanded: boolean;
}

function CommentManagement() {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedComments, setSelectedComments] = useState<string[]>([]);
  const [allComments, setAllComments] = useState<MergedComment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  // 分页状态
  const [useServerPagination, setUseServerPagination] = useState(false);
  const [serverPage, setServerPage] = useState(1);
  const pageSize = 50;

  // 展开/折叠状态
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set());
  const [expandedAuthors, setExpandedAuthors] = useState<Set<string>>(new Set());

  // 搜索防抖
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setServerPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // 全选/取消全选
  const toggleSelectAll = (comments: MergedComment[]) => {
    setSelectedComments(selectedComments.length === comments.length ? [] : comments.map(c => c.id));
  };

  // 单选/取消单选
  const toggleSelect = (id: string) => {
    setSelectedComments(selectedComments.includes(id) ? selectedComments.filter(c => c !== id) : [...selectedComments, id]);
  };

  // 切换笔记展开/折叠
  const togglePostExpand = (postId: string) => {
    setExpandedPosts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });
  };

  // 切换作者展开/折叠
  const toggleAuthorExpand = (authorKey: string) => {
    setExpandedAuthors(prev => {
      const newSet = new Set(prev);
      if (newSet.has(authorKey)) {
        newSet.delete(authorKey);
      } else {
        newSet.add(authorKey);
      }
      return newSet;
    });
  };

  // 展开/折叠所有
  const expandAll = () => {
    setExpandedPosts(new Set(groupedData.map(g => g.post_id)));
    setExpandedAuthors(new Set());
  };

  const collapseAll = () => {
    setExpandedPosts(new Set());
    setExpandedAuthors(new Set());
  };

  // 高亮搜索关键词
  const highlightText = (text: string, highlight: string) => {
    if (!highlight.trim()) return text;
    const regex = new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="bg-yellow-200 text-gray-900 px-0.5 rounded">{part}</mark>
      ) : part
    );
  };

  // 获取评论数据
  const fetchComments = async () => {
    setIsLoading(true);
    const headers = {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Prefer': 'count=exact',
    };

    try {
      if (useServerPagination) {
        // 服务端分页模式
        const params = new URLSearchParams();
        params.append('select', '*');
        params.append('order', 'created_at.desc');
        params.append('offset', String((serverPage - 1) * pageSize));
        params.append('limit', String(pageSize));

        if (statusFilter !== 'all') {
          params.append('status', `eq.${statusFilter}`);
        }

        const [commentsRes, profilesRes, postsRes] = await Promise.all([
          fetch(`${API_BASE}/comments?${params.toString()}`, { headers }),
          fetch(`${API_BASE}/profiles?select=user_id,username,avatar_url`, { headers }),
          fetch(`${API_BASE}/posts?select=id,title`, { headers })
        ]);

        const contentRange = commentsRes.headers.get('content-range');
        const total = contentRange ? parseInt(contentRange.split('/')[1], 10) : 0;
        setTotalCount(total);

        const commentsData = await commentsRes.json();
        const profilesData = await profilesRes.json();
        const postsData = await postsRes.json();

        const profilesMap: Record<string, Profile> = {};
        if (Array.isArray(profilesData)) {
          profilesData.forEach((p: Profile) => { profilesMap[p.user_id] = p; });
        }
        const postsMap: Record<string, Post> = {};
        if (Array.isArray(postsData)) {
          postsData.forEach((p: Post) => { postsMap[p.id] = p; });
        }

        const merged = (Array.isArray(commentsData) ? commentsData : []).map((c: Comment) => ({
          ...c,
          profiles: profilesMap[c.user_id] || { username: '未知用户', avatar_url: '' },
          posts: postsMap[c.post_id] || { title: '未知笔记' },
        }));

        setAllComments(merged);
      } else {
        // 全量加载模式
        const params = new URLSearchParams();
        params.append('select', '*');
        params.append('order', 'created_at.desc');

        if (statusFilter !== 'all') {
          params.append('status', `eq.${statusFilter}`);
        }

        const [commentsRes, profilesRes, postsRes] = await Promise.all([
          fetch(`${API_BASE}/comments?${params.toString()}`, { headers }),
          fetch(`${API_BASE}/profiles?select=user_id,username,avatar_url`, { headers }),
          fetch(`${API_BASE}/posts?select=id,title`, { headers })
        ]);

        const commentsData = await commentsRes.json();
        const profilesData = await profilesRes.json();
        const postsData = await postsRes.json();

        const profilesMap: Record<string, Profile> = {};
        if (Array.isArray(profilesData)) {
          profilesData.forEach((p: Profile) => { profilesMap[p.user_id] = p; });
        }
        const postsMap: Record<string, Post> = {};
        if (Array.isArray(postsData)) {
          postsData.forEach((p: Post) => { postsMap[p.id] = p; });
        }

        const merged = (Array.isArray(commentsData) ? commentsData : []).map((c: Comment) => ({
          ...c,
          profiles: profilesMap[c.user_id] || { username: '未知用户', avatar_url: '' },
          posts: postsMap[c.post_id] || { title: '未知笔记' },
        }));

        setTotalCount(merged.length);
        setAllComments(merged);

        // 如果数据量太大，切换到服务端分页
        if (merged.length > LARGE_DATA_THRESHOLD) {
          setUseServerPagination(true);
        }
      }

      // 重置展开状态
      setExpandedPosts(new Set());
      setExpandedAuthors(new Set());
      setSelectedComments([]);
    } catch (error) {
      console.error('Failed to fetch comments:', error);
      setAllComments([]);
    }
    setIsLoading(false);
  };

  // 过滤并分组评论
  const groupedData = useMemo(() => {
    let filtered = allComments;

    // 搜索过滤
    if (debouncedSearch) {
      const search = debouncedSearch.toLowerCase();
      filtered = allComments.filter(c =>
        c.content.toLowerCase().includes(search) ||
        c.profiles.username.toLowerCase().includes(search) ||
        c.posts.title.toLowerCase().includes(search)
      );
    }

    // 按笔记分组
    const postMap = new Map<string, PostGroup>();

    filtered.forEach(comment => {
      const postId = comment.post_id;
      if (!postMap.has(postId)) {
        postMap.set(postId, {
          post_id: postId,
          title: comment.posts.title,
          comments: [],
          authors: [],
          isExpanded: true,
        });
      }
      postMap.get(postId)!.comments.push(comment);
    });

    // 每个笔记下按作者分组
    postMap.forEach(postGroup => {
      const authorMap = new Map<string, AuthorGroup>();

      postGroup.comments.forEach(comment => {
        const userId = comment.user_id;
        if (!authorMap.has(userId)) {
          authorMap.set(userId, {
            user_id: userId,
            username: comment.profiles.username,
            avatar_url: comment.profiles.avatar_url,
            comments: [],
            isExpanded: true,
          });
        }
        authorMap.get(userId)!.comments.push(comment);
      });

      postGroup.authors = Array.from(authorMap.values());
    });

    return Array.from(postMap.values());
  }, [allComments, debouncedSearch]);

  // Update comment status
  const updateComment = async (id: string, status: string) => {
    const headers = {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    };

    try {
      await fetch(`/sb-api/rest/v1/comments?id=eq.${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status }),
      });
      fetchComments();
    } catch (error) {
      console.error('Failed to update comment:', error);
    }
  };

  // Delete comment
  const deleteComment = async (id: string) => {
    if (!confirm('确定要删除这条评论吗？')) return;

    const headers = {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    };

    try {
      await fetch(`/sb-api/rest/v1/comments?id=eq.${id}`, {
        method: 'DELETE',
        headers,
      });
      fetchComments();
    } catch (error) {
      console.error('Failed to delete comment:', error);
    }
  };

  // Delete comment with replies
  const deleteCommentWithReplies = async (id: string) => {
    if (!confirm('确定要删除这条评论及其所有回复吗？')) return;

    const headers = {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    };

    try {
      await fetch(`/sb-api/rest/v1/comments?parent_id=eq.${id}`, {
        method: 'DELETE',
        headers,
      });
      await fetch(`/sb-api/rest/v1/comments?id=eq.${id}`, {
        method: 'DELETE',
        headers,
      });
      fetchComments();
    } catch (error) {
      console.error('Failed to delete comment:', error);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [statusFilter, debouncedSearch, serverPage]);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700',
      published: 'bg-green-100 text-green-700',
      blocked: 'bg-red-100 text-red-700',
      deleted: 'bg-gray-100 text-gray-700',
    };
    const labels: Record<string, string> = {
      pending: '待审核',
      published: '已发布',
      blocked: '已屏蔽',
      deleted: '已删除',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || ''}`}>
        {labels[status] || status}
      </span>
    );
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  // 收集当前可见的所有评论（用于批量操作）
  const allVisibleComments = useMemo(() => {
    return groupedData.flatMap(post =>
      post.authors.flatMap(author => author.comments)
    );
  }, [groupedData]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">评论管理</h1>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜索评论内容、作者、笔记标题..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); }}
                className="w-full h-10 pl-10 pr-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E11D48] focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setServerPage(1); }}
              className="h-10 px-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E11D48] focus:border-transparent"
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={expandAll}
              className="h-10 px-3 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm"
            >
              全部展开
            </button>
            <button
              onClick={collapseAll}
              className="h-10 px-3 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm"
            >
              全部折叠
            </button>
          </div>
          <div className="text-sm text-gray-500 self-center">
            共 {totalCount} 条记录
            {useServerPagination && <span className="ml-2 text-xs text-orange-500">(服务端分页)</span>}
          </div>
        </div>

        {selectedComments.length > 0 && (
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
            <span className="text-sm text-gray-600">已选择 {selectedComments.length} 项</span>
            <button
              onClick={async () => {
                for (const id of selectedComments) {
                  await fetch(`${API_BASE}/comments?parent_id=eq.${id}`, {
                    method: 'DELETE',
                    headers: { 'apikey': SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SERVICE_ROLE_KEY}` },
                  });
                  await fetch(`${API_BASE}/comments?id=eq.${id}`, {
                    method: 'DELETE',
                    headers: { 'apikey': SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SERVICE_ROLE_KEY}` },
                  });
                }
                setSelectedComments([]);
                fetchComments();
              }}
              className="px-3 py-1.5 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600"
            >
              批量删除
            </button>
            <button
              onClick={() => setSelectedComments([])}
              className="px-3 py-1.5 border border-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-50"
            >
              取消选择
            </button>
          </div>
        )}
      </div>

      {/* Grouped Comments List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-[#E11D48] animate-spin" />
            <span className="ml-3 text-gray-500">加载中...</span>
          </div>
        ) : groupedData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <MessageSquare className="w-12 h-12 text-gray-300 mb-3" />
            <p className="text-gray-500">暂无评论数据</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {groupedData.map((postGroup) => {
              const isPostExpanded = expandedPosts.has(postGroup.post_id);
              const authorKey = `post-${postGroup.post_id}`;

              return (
                <div key={postGroup.post_id} className="bg-gray-50/50">
                  {/* 笔记分组标题 */}
                  <div
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => togglePostExpand(postGroup.post_id)}
                  >
                    {isPostExpanded ? (
                      <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    )}
                    {isPostExpanded ? (
                      <FolderOpen className="w-5 h-5 text-[#E11D48] flex-shrink-0" />
                    ) : (
                      <FolderClosed className="w-5 h-5 text-[#E11D48] flex-shrink-0" />
                    )}
                    <span className="font-medium text-gray-900 flex-1">
                      {highlightText(postGroup.title, debouncedSearch)}
                    </span>
                    <span className="text-sm text-gray-500">
                      共 {postGroup.comments.length} 条评论，{postGroup.authors.length} 位作者
                    </span>
                  </div>

                  {/* 作者分组 */}
                  {isPostExpanded && (
                    <div className="pl-4">
                      {postGroup.authors.map((authorGroup) => {
                        const isAuthorExpanded = expandedAuthors.has(`${postGroup.post_id}-${authorGroup.user_id}`);
                        const authorExpandKey = `${postGroup.post_id}-${authorGroup.user_id}`;

                        return (
                          <div key={authorGroup.user_id} className="border-t border-gray-100">
                            {/* 作者标题 */}
                            <div
                              className="flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-white/50 transition-colors ml-4"
                              onClick={() => toggleAuthorExpand(authorExpandKey)}
                            >
                              {isAuthorExpanded ? (
                                <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              )}
                              <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              <img
                                src={authorGroup.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'}
                                alt=""
                                className="w-6 h-6 rounded-full flex-shrink-0"
                              />
                              <span className="text-sm text-gray-700 flex-1">
                                {highlightText(authorGroup.username, debouncedSearch)}
                              </span>
                              <span className="text-xs text-gray-400">
                                {authorGroup.comments.length} 条评论
                              </span>
                              <input
                                type="checkbox"
                                checked={authorGroup.comments.every(c => selectedComments.includes(c.id))}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  const allSelected = authorGroup.comments.every(c => selectedComments.includes(c.id));
                                  if (allSelected) {
                                    setSelectedComments(selectedComments.filter(id => !authorGroup.comments.some(c => c.id === id)));
                                  } else {
                                    setSelectedComments([...new Set([...selectedComments, ...authorGroup.comments.map(c => c.id)])]);
                                  }
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="w-4 h-4 rounded"
                              />
                            </div>

                            {/* 评论列表 */}
                            {isAuthorExpanded && (
                              <div className="pl-8 pr-4 pb-2">
                                <table className="w-full">
                                  <thead>
                                    <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                                      <th className="pb-2 w-8">
                                        <input
                                          type="checkbox"
                                          checked={authorGroup.comments.every(c => selectedComments.includes(c.id))}
                                          onChange={() => {
                                            const allSelected = authorGroup.comments.every(c => selectedComments.includes(c.id));
                                            if (allSelected) {
                                              setSelectedComments(selectedComments.filter(id => !authorGroup.comments.some(c => c.id === id)));
                                            } else {
                                              setSelectedComments([...new Set([...selectedComments, ...authorGroup.comments.map(c => c.id)])]);
                                            }
                                          }}
                                          className="w-4 h-4 rounded"
                                        />
                                      </th>
                                      <th className="pb-2 text-sm font-medium text-gray-700">评论内容</th>
                                      <th className="pb-2 w-24 text-sm font-medium text-gray-700">状态</th>
                                      <th className="pb-2 w-28 text-sm font-medium text-gray-700">发布时间</th>
                                      <th className="pb-2 w-28 text-sm font-medium text-gray-700">操作</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100">
                                    {authorGroup.comments.map((comment) => (
                                      <tr key={comment.id} className="hover:bg-white/30">
                                        <td className="py-2">
                                          <input
                                            type="checkbox"
                                            checked={selectedComments.includes(comment.id)}
                                            onChange={() => toggleSelect(comment.id)}
                                            className="w-4 h-4 rounded"
                                          />
                                        </td>
                                        <td className="py-2">
                                          <div>
                                            {comment.parent_id && (
                                              <span className="text-xs text-[#E11D48] mr-2 font-medium">[回复]</span>
                                            )}
                                            <p className="text-sm text-gray-900">
                                              {highlightText(comment.content, debouncedSearch)}
                                            </p>
                                          </div>
                                        </td>
                                        <td className="py-2">{getStatusBadge(comment.status)}</td>
                                        <td className="py-2 text-sm text-gray-500">
                                          {new Date(comment.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="py-2">
                                          <div className="flex items-center gap-1">
                                            <button
                                              onClick={() => updateComment(comment.id, 'published')}
                                              className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                              title="通过"
                                            >
                                              <CheckCircle className="w-4 h-4" />
                                            </button>
                                            <button
                                              onClick={() => updateComment(comment.id, 'blocked')}
                                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                              title="屏蔽"
                                            >
                                              <XCircle className="w-4 h-4" />
                                            </button>
                                            <button
                                              onClick={() => deleteCommentWithReplies(comment.id)}
                                              className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                              title="删除（含回复）"
                                            >
                                              <Trash2 className="w-4 h-4" />
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {useServerPagination && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              第 {serverPage} / {totalPages || 1} 页，共 {totalCount} 条
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setServerPage(serverPage - 1)}
                disabled={serverPage === 1}
                className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4 rotate-180" />
              </button>
              <span className="text-sm text-gray-600">第 {serverPage} 页</span>
              <button
                onClick={() => setServerPage(serverPage + 1)}
                disabled={serverPage >= totalPages}
                className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CommentManagement;
