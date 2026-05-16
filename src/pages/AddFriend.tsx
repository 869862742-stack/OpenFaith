import React, { useState, useEffect } from 'react';
import { ArrowLeft, Search, UserPlus, Users, Loader2, X, Check, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useThemeContext } from '../contexts/ThemeContext';

const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkaHdtZWl0dGdkb3Nta3h0cGFrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODEzMjQ5MiwiZXhwIjoyMDkzNzA4NDkyfQ.bPatiu7NXaE2k48aTkjAGQsba6NzXlIdq2k_gGLYLBE';

interface UserProfile {
  id: string;
  user_id: string;
  username: string;
  nickname: string | null;
  avatar_url: string | null;
  created_at: string;
}

interface FollowRecord {
  follower_id: string;
  following_id: string;
  status: string;
}

interface GreetingModal {
  targetUser: UserProfile;
  message: string;
}

function AddFriend() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { primaryColor } = useThemeContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [recommendedUsers, setRecommendedUsers] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingRecommended, setIsLoadingRecommended] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserNickname, setCurrentUserNickname] = useState<string>('用户');
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [pendingRequests, setPendingRequests] = useState<Set<string>>(new Set());
  const [sendingRequestId, setSendingRequestId] = useState<string | null>(null);
  const [greetingModal, setGreetingModal] = useState<GreetingModal | null>(null);

  // 夜间模式颜色
  const bgColor = 'var(--bg-color)';
  const cardBg = 'var(--bg-secondary)';
  const textColor = 'var(--text-color)';
  const textSecondary = 'var(--text-secondary)';
  const borderColor = 'var(--border-color)';

  // 获取当前用户
  useEffect(() => {
    const userId = localStorage.getItem('user_id');
    if (userId) {
      setCurrentUserId(userId);
      // 获取当前用户昵称
      loadCurrentUserProfile(userId);
    }
  }, []);

  // 加载当前用户昵称
  const loadCurrentUserProfile = async (userId: string) => {
    try {
      const params = new URLSearchParams();
      params.append('select', 'nickname,username');
      params.append('user_id', `eq.${userId}`);
      params.append('limit', '1');

      const res = await fetch(`/sb-api/rest/v1/profiles?${params.toString()}`, {
        headers: {
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        }
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          setCurrentUserNickname(data[0].nickname || data[0].username || '用户');
        }
      }
    } catch (error) {
      console.error('Error loading current user profile:', error);
    }
  };

  // 加载推荐用户（最近注册的）
  const loadRecommendedUsers = async () => {
    setIsLoadingRecommended(true);
    try {
      const params = new URLSearchParams();
      params.append('select', 'id,user_id,username,nickname,avatar_url,created_at');
      params.append('order', 'created_at.desc');
      params.append('limit', '20');

      const res = await fetch(`/sb-api/rest/v1/profiles?${params.toString()}`, {
        headers: {
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        }
      });

      if (res.ok) {
        const data = await res.json();
        const filtered = (data || []).filter((u: UserProfile) => (u.user_id || u.id) !== currentUserId);
        setRecommendedUsers(filtered);
        
        if (currentUserId && filtered.length > 0) {
          loadFollowingStatus(filtered.map((u: UserProfile) => u.user_id || u.id));
        }
      }
    } catch (error) {
      console.error('Error loading recommended users:', error);
    } finally {
      setIsLoadingRecommended(false);
    }
  };

  // 加载已关注状态
  const loadFollowingStatus = async (userIds: string[]) => {
    if (!currentUserId || userIds.length === 0) return;
    
    try {
      const params = new URLSearchParams();
      params.append('select', 'following_id,status');
      params.append('follower_id', `eq.${currentUserId}`);
      params.append('following_id', `in.(${userIds.join(',')})`);

      const res = await fetch(`/sb-api/rest/v1/follows?${params.toString()}`, {
        headers: {
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        }
      });

      if (res.ok) {
        const data = await res.json();
        const following = new Set<string>();
        const pending = new Set<string>();
        
        (data || []).forEach((record: FollowRecord) => {
          if (record.status === 'active') {
            following.add(record.following_id);
          } else if (record.status === 'pending') {
            pending.add(record.following_id);
          }
        });
        
        setFollowingIds(following);
        setPendingRequests(pending);
      }
    } catch (error) {
      console.error('Error loading following status:', error);
    }
  };

  useEffect(() => {
    if (currentUserId) {
      loadRecommendedUsers();
    }
  }, [currentUserId]);

  // 搜索用户
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const query = searchQuery.trim();
      
      // 使用 URLSearchParams 避免编码问题
      // 分别搜索 username 和 nickname，合并结果
      const params1 = new URLSearchParams();
      params1.append('select', 'id,user_id,username,nickname,avatar_url,created_at');
      params1.append('username', `ilike.%${query}%`);
      params1.append('order', 'created_at.desc');
      params1.append('limit', '30');
      
      const params2 = new URLSearchParams();
      params2.append('select', 'id,user_id,username,nickname,avatar_url,created_at');
      params2.append('nickname', `ilike.%${query}%`);
      params2.append('order', 'created_at.desc');
      params2.append('limit', '30');

      const [res1, res2] = await Promise.all([
        fetch(`/sb-api/rest/v1/profiles?${params1.toString()}`, {
          headers: {
            'apikey': SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          }
        }),
        fetch(`/sb-api/rest/v1/profiles?${params2.toString()}`, {
          headers: {
            'apikey': SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          }
        })
      ]);

      const data1 = res1.ok ? await res1.json() : [];
      const data2 = res2.ok ? await res2.json() : [];
      
      // 合并去重
      const allResults = [...(data1 || []), ...(data2 || [])];
      const uniqueMap = new Map();
      allResults.forEach((u: UserProfile) => uniqueMap.set(u.id, u));
      const unique = Array.from(uniqueMap.values());
      
      // 过滤掉当前用户
      const filtered = unique.filter((u: UserProfile) => (u.user_id || u.id) !== currentUserId);
      setSearchResults(filtered);
      
      if (filtered.length > 0) {
        loadFollowingStatus(filtered.map((u: UserProfile) => u.user_id || u.id));
      }
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // 打开打招呼弹窗（像微信添加好友一样）
  const handleAddFriend = (user: UserProfile) => {
    if (!currentUserId) {
      alert('请先登录');
      navigate('/login');
      return;
    }

    const defaultMessage = `你好，我是${currentUserNickname}，希望能添加你为好友`;
    setGreetingModal({
      targetUser: user,
      message: defaultMessage,
    });
  };

  // 发送带打招呼消息的好友请求
  const sendFriendRequest = async () => {
    if (!greetingModal || !currentUserId) return;

    const { targetUser, message } = greetingModal;
    const targetUserId = targetUser.user_id || targetUser.id;

    setSendingRequestId(targetUserId);
    try {
      const followRecord: Record<string, string> = {
        follower_id: currentUserId,
        following_id: targetUserId,
        status: 'pending',
        created_at: new Date().toISOString(),
      };

      // 添加打招呼消息
      if (message.trim()) {
        followRecord.message = message.trim();
      }

      const res = await fetch('/sb-api/rest/v1/follows', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'Prefer': 'return=representation',
        },
        body: JSON.stringify(followRecord),
      });

      if (res.ok || res.status === 201) {
        setPendingRequests(prev => new Set([...prev, targetUserId]));
        setGreetingModal(null);
      } else {
        const errText = await res.text();
        throw new Error(errText);
      }
    } catch (error) {
      console.error('Error sending friend request:', error);
      alert('发送好友请求失败，请稍后重试');
    } finally {
      setSendingRequestId(null);
    }
  };

  // 输入框回车搜索
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // 获取显示的用户列表
  const displayUsers = searchQuery.trim() ? searchResults : recommendedUsers;

  // 渲染用户卡片
  const renderUserCard = (user: UserProfile) => {
    const isFollowing = followingIds.has(user.user_id || user.id);
    const isPending = pendingRequests.has(user.user_id || user.id);
    const isSending = sendingRequestId === (user.user_id || user.id);

    return (
      <div
        key={user.id}
        className="flex items-center gap-3 p-3 rounded-xl theme-transition"
        style={{ backgroundColor: cardBg }}
      >
        {/* 头像 */}
        <div 
          className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden"
          style={{ backgroundColor: `${primaryColor}20` }}
        >
          {user.avatar_url ? (
            <img 
              src={user.avatar_url} 
              alt={user.username}
              className="w-full h-full object-cover"
            />
          ) : (
            <Users className="w-6 h-6" style={{ color: primaryColor }} />
          )}
        </div>

        {/* 信息 */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate" style={{ color: textColor }}>
            {user.nickname || user.username || '未命名用户'}
          </p>
          <p className="text-xs truncate" style={{ color: textSecondary }}>
            ID: {(user.user_id || user.id).slice(0, 8)}...
          </p>
        </div>

        {/* 操作按钮 */}
        <div className="flex-shrink-0">
          {isFollowing ? (
            <button
              disabled
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
            >
              <Check className="w-3 h-3" />
              已关注
            </button>
          ) : isPending || isSending ? (
            <button
              disabled
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ backgroundColor: `${textSecondary}20`, color: textSecondary }}
            >
              <Loader2 className="w-3 h-3 animate-spin" />
              待确认
            </button>
          ) : (
            <button
              onClick={() => handleAddFriend(user)}
              disabled={isSending}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-white"
              style={{ backgroundColor: primaryColor }}
            >
              <UserPlus className="w-3 h-3" />
              添加
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen theme-transition" style={{ backgroundColor: bgColor }}>
      <header 
        className="sticky top-0 z-40 px-4 py-3 border-b flex items-center gap-3 theme-transition" 
        style={{ borderColor }}
      >
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 theme-transition" style={{ color: textColor }}>
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold theme-transition" style={{ color: textColor }}>
          {t('sidebar.addFriend') || '添加好友'}
        </h1>
      </header>

      <div className="p-4">
        {/* 搜索框 */}
        <div className="flex items-center gap-2 mb-6">
          <div 
            className="flex-1 flex items-center h-11 px-4 rounded-xl theme-transition" 
            style={{ backgroundColor: cardBg }}
          >
            <Search className="w-4 h-4 mr-2 theme-transition" style={{ color: textSecondary }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="搜索昵称、ID..."
              className="flex-1 bg-transparent text-sm outline-none theme-transition"
              style={{ color: textColor }}
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="p-1"
              >
                <X className="w-4 h-4" style={{ color: textSecondary }} />
              </button>
            )}
          </div>
          <button
            onClick={handleSearch}
            disabled={isSearching}
            className="px-5 h-11 rounded-xl text-sm font-medium whitespace-nowrap text-white flex items-center gap-2"
            style={{ backgroundColor: primaryColor }}
          >
            {isSearching ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              t('common.search')
            )}
          </button>
        </div>

        {/* 结果列表 */}
        {isSearching || isLoadingRecommended ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: primaryColor }} />
          </div>
        ) : displayUsers.length > 0 ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-4 h-4" style={{ color: primaryColor }} />
              <span className="text-sm font-medium theme-transition" style={{ color: primaryColor }}>
                {searchQuery.trim() 
                  ? `搜索结果 (${searchResults.length})`
                  : `推荐用户 (${recommendedUsers.length})`
                }
              </span>
            </div>
            {displayUsers.map(renderUserCard)}
            
            {searchQuery.trim() && searchResults.length === 0 && (
              <div className="text-center py-8">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-30" style={{ color: textSecondary }} />
                <p className="text-sm" style={{ color: textSecondary }}>
                  未找到匹配的用户
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" style={{ color: textSecondary }} />
            <p className="text-sm" style={{ color: textSecondary }}>
              {searchQuery.trim() 
                ? '未找到匹配的用户'
                : '暂无推荐用户'
              }
            </p>
          </div>
        )}
      </div>

      {/* 打招呼弹窗 */}
      {greetingModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div 
            className="w-full max-w-lg rounded-t-2xl p-5 theme-transition"
            style={{ backgroundColor: bgColor }}
          >
            {/* 顶部 */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold" style={{ color: textColor }}>添加好友</h3>
              <button 
                onClick={() => setGreetingModal(null)}
                className="p-1"
              >
                <X className="w-5 h-5" style={{ color: textSecondary }} />
              </button>
            </div>

            {/* 目标用户信息 */}
            <div className="flex items-center gap-3 mb-4 p-3 rounded-xl" style={{ backgroundColor: cardBg }}>
              <div 
                className="w-12 h-12 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0"
                style={{ backgroundColor: `${primaryColor}20` }}
              >
                {greetingModal.targetUser.avatar_url ? (
                  <img 
                    src={greetingModal.targetUser.avatar_url} 
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Users className="w-6 h-6" style={{ color: primaryColor }} />
                )}
              </div>
              <div>
                <p className="font-medium text-sm" style={{ color: textColor }}>
                  {greetingModal.targetUser.nickname || greetingModal.targetUser.username || '未命名用户'}
                </p>
                <p className="text-xs" style={{ color: textSecondary }}>
                  发送好友请求并打招呼
                </p>
              </div>
            </div>

            {/* 打招呼消息输入 */}
            <div className="mb-4">
              <label className="text-sm font-medium mb-2 block" style={{ color: textSecondary }}>
                打招呼消息
              </label>
              <textarea
                value={greetingModal.message}
                onChange={(e) => setGreetingModal({ ...greetingModal, message: e.target.value })}
                placeholder="说点什么打个招呼吧..."
                rows={3}
                className="w-full p-3 rounded-xl text-sm resize-none outline-none theme-transition"
                style={{ 
                  backgroundColor: cardBg, 
                  color: textColor,
                  borderColor: borderColor,
                  border: `1px solid ${borderColor}`
                }}
              />
            </div>

            {/* 发送按钮 */}
            <button
              onClick={sendFriendRequest}
              disabled={!!sendingRequestId}
              className="w-full py-3 rounded-xl text-sm font-medium text-white flex items-center justify-center gap-2"
              style={{ backgroundColor: primaryColor }}
            >
              {sendingRequestId ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              发送好友请求
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AddFriend;
