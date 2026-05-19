import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Users, Zap, Flame, MessageCircle, Heart, Eye, Crown, Lock, Send } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import PostDetailModal from '../components/PostDetailModal';
import { cachedFetch } from '../utils/apiCache';
import { useAuthStore } from '../stores/auth';

const PRIMARY_COLOR = '#3B82F6';

function formatCount(num: number): string {
  if (num < 10000) return String(num);
  const wan = num / 10000;
  if (wan < 10) {
    return wan % 1 === 0 ? `${wan}W` : `${wan.toFixed(1)}W`;
  }
  return `${Math.floor(wan)}W`;
}

const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkaHdtZWl0dGdkb3Nta3h0cGFrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODEzMjQ5MiwiZXhwIjoyMDkzNzA4NDkyfQ.bPatiu7NXaE2k48aTkjAGQsba6NzXlIdq2k_gGLYLBE';

export default function UserProfile() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [selectedPostIndex, setSelectedPostIndex] = useState<number | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [isFriend, setIsFriend] = useState(false);
  
  // 从 URL 获取用户 ID
  const userId = window.location.hash.split('/profile/')[1]?.split('?')[0]?.split('#')[0] 
    || window.location.hash.split('/user/')[1]?.split('?')[0]?.split('#')[0];
  const currentUserId = useAuthStore((state) => state.userInfo?.id);

  // 检查访问权限
  const checkAccessPermission = useCallback(async () => {
    if (!profile || !currentUserId) return true;
    
    // 自己可以访问
    if (currentUserId === userId) return true;
    
    // 如果设置了允许陌生人访问
    if (profile.allow_stranger_visit !== false) return true;
    
    // 检查是否是好友（双向关注）
    const followRes = await cachedFetch(
      `/sb-api/rest/v1/follows?follower_id=eq.${currentUserId}&following_id=eq.${userId}&select=id`,
      { headers: { 'apikey': SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SERVICE_ROLE_KEY}` } }
    );
    
    const reverseFollowRes = await cachedFetch(
      `/sb-api/rest/v1/follows?follower_id=eq.${userId}&following_id=eq.${currentUserId}&select=id`,
      { headers: { 'apikey': SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SERVICE_ROLE_KEY}` } }
    );
    
    const isMutualFollow = Array.isArray(followRes) && followRes.length > 0 
      && Array.isArray(reverseFollowRes) && reverseFollowRes.length > 0;
    
    // 如果设置了允许好友访问且是好友
    if (profile.allow_friend_visit !== false && isMutualFollow) return true;
    
    return false;
  }, [profile, currentUserId, userId]);

  // 获取用户资料
  const fetchUserProfile = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      const headers = { 'apikey': SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SERVICE_ROLE_KEY}` };

      // 获取用户资料
      const profileRes = await cachedFetch(
        `/sb-api/rest/v1/profiles?user_id=eq.${userId}&select=*`,
        { headers }
      );

      if (Array.isArray(profileRes) && profileRes.length > 0) {
        setProfile(profileRes[0]);
        
        // 检查访问权限
        const hasAccess = await checkAccessPermission();
        if (!hasAccess) {
          setAccessDenied(true);
          setLoading(false);
          return;
        }
      }

      // 获取用户发布的笔记
      const postsRes = await cachedFetch(
        `/sb-api/rest/v1/posts?user_id=eq.${userId}&select=id,title,content,cover_image,images,tags,status,created_at,likes_count,heat_count,comments_count,views_count,shares_count,favorites_count&order=created_at.desc&limit=50`,
        { headers }
      );

      if (Array.isArray(postsRes)) {
        setUserPosts(postsRes.filter((p: any) => p.status === 'published'));
      }

      // 检查是否已关注
      if (currentUserId) {
        const followRes = await cachedFetch(
          `/sb-api/rest/v1/follows?follower_id=eq.${currentUserId}&following_id=eq.${userId}&select=id`,
          { headers }
        );
        setIsFollowing(Array.isArray(followRes) && followRes.length > 0);
        
        // 检查是否是好友（双向关注）
        const reverseFollowRes = await cachedFetch(
          `/sb-api/rest/v1/follows?follower_id=eq.${userId}&following_id=eq.${currentUserId}&select=id`,
          { headers }
        );
        setIsFriend(
          Array.isArray(followRes) && followRes.length > 0 
          && Array.isArray(reverseFollowRes) && reverseFollowRes.length > 0
        );
      }
    } catch (e) {
      console.error('[UserProfile] fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [userId, currentUserId, checkAccessPermission]);

  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  // 关注/取消关注
  const handleFollow = async () => {
    if (!currentUserId || !userId) return;
    
    setFollowLoading(true);
    try {
      const headers = { 
        'apikey': SERVICE_ROLE_KEY, 
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      };

      if (isFollowing) {
        // 取消关注
        await fetch(
          `/sb-api/rest/v1/follows?follower_id=eq.${currentUserId}&following_id=eq.${userId}`,
          { method: 'DELETE', headers }
        );
        setIsFollowing(false);
        if (profile) {
          setProfile({ ...profile, followers_count: Math.max(0, (profile.followers_count || 1) - 1) });
        }
      } else {
        // 关注
        await fetch(
          `/sb-api/rest/v1/follows`,
          { 
            method: 'POST', 
            headers,
            body: JSON.stringify({
              follower_id: currentUserId,
              following_id: userId
            })
          }
        );
        setIsFollowing(true);
        if (profile) {
          setProfile({ ...profile, followers_count: (profile.followers_count || 0) + 1 });
        }
      }
    } catch (e) {
      console.error('[UserProfile] follow error:', e);
    } finally {
      setFollowLoading(false);
    }
  };

  // 发消息
  const handleMessage = () => {
    navigate(`/chat/${userId}`);
  };

  // 热值计算公式
  const calculateNoteHotValue = (note: any): number => {
    const views = note.views_count || 0;
    const heat = note.heat_count || 0;
    const comments = note.comments_count || 0;
    const shares = note.shares_count || 0;
    const favorites = note.favorites_count || 0;
    return (views * 0.5) + (heat * 5) + (comments * 2) + (shares * 3) + (favorites * 2);
  };

  const heatCount = userPosts.reduce((sum: number, p: any) => sum + calculateNoteHotValue(p), 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-color)' }}>
        <div className="animate-spin w-8 h-8 border-2 border-current border-t-transparent rounded-full" style={{ color: PRIMARY_COLOR }} />
      </div>
    );
  }

  // 访问被拒绝
  if (accessDenied) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ backgroundColor: 'var(--bg-color)' }}>
        <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6" style={{ backgroundColor: 'var(--bg-secondary)' }}>
          <Lock className="w-10 h-10" style={{ color: PRIMARY_COLOR }} />
        </div>
        <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-color)' }}>
          该用户未开放主页
        </h2>
        <p className="text-sm text-center mb-6" style={{ color: 'var(--text-secondary)' }}>
          该用户设置了隐私保护，暂不允许访问主页
        </p>
        <button
          onClick={() => window.history.back()}
          className="px-6 py-2 rounded-full"
          style={{ backgroundColor: PRIMARY_COLOR, color: 'white' }}
        >
          返回
        </button>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ backgroundColor: 'var(--bg-color)' }}>
        <p className="text-lg mb-4" style={{ color: 'var(--text-secondary)' }}>用户不存在</p>
        <button
          onClick={() => window.history.back()}
          className="px-4 py-2 rounded-full"
          style={{ backgroundColor: PRIMARY_COLOR, color: 'white' }}
        >
          返回
        </button>
      </div>
    );
  }

  const isOwnProfile = currentUserId === userId;
  const displayName = profile.nickname || profile.username || '用户';
  const avatarUrl = profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`;
  const bgUrl = profile.background_url || '';

  return (
    <div className="min-h-screen pb-20" style={{ backgroundColor: 'var(--bg-color)' }}>
      {/* 背景图 */}
      <div
        className="relative h-36"
        style={{ backgroundColor: 'var(--bg-secondary)' }}
      >
        {bgUrl && <img src={bgUrl} alt="" className="w-full h-full object-cover" />}
        
        {/* 返回按钮 */}
        <button
          onClick={() => window.history.back()}
          className="absolute top-4 left-4 w-10 h-10 rounded-full flex items-center justify-center shadow-md"
          style={{ backgroundColor: 'rgba(255,255,255,0.8)' }}
        >
          <ArrowLeft className="w-5 h-5" style={{ color: 'var(--text-color)' }} />
        </button>
      </div>

      {/* 头像和信息区域 */}
      <div className="relative -mt-16 px-4">
        <div className="flex items-start justify-between">
          <div className="flex items-end gap-3">
            <img
              src={avatarUrl}
              alt=""
              className={`w-24 h-24 rounded-full border-4 object-cover ${profile.is_vip ? 'ring-2 ring-offset-2' : ''}`}
              style={{ borderColor: 'var(--card-bg)' }}
            />
            <div className="pb-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold" style={{ color: PRIMARY_COLOR }}>{displayName}</h1>
                {profile.is_vip && <Crown className="w-4 h-4 text-yellow-500" />}
              </div>
              {profile.faith_tag && (
                <span
                  className="px-2 py-0.5 text-xs rounded-full"
                  style={{ backgroundColor: `${PRIMARY_COLOR}15`, color: PRIMARY_COLOR }}
                >
                  {profile.faith_tag}
                </span>
              )}
            </div>
          </div>

          {/* 操作按钮 */}
          {!isOwnProfile && (
            <div className="flex items-center gap-2">
              {/* 发消息按钮 */}
              <button
                onClick={handleMessage}
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'var(--bg-secondary)' }}
              >
                <MessageCircle className="w-5 h-5" style={{ color: PRIMARY_COLOR }} />
              </button>
              
              {/* 关注按钮 */}
              <button
                onClick={handleFollow}
                disabled={followLoading}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  isFollowing ? '' : ''
                }`}
                style={{ 
                  backgroundColor: isFollowing ? 'transparent' : PRIMARY_COLOR,
                  border: `1px solid ${isFollowing ? 'var(--border-color)' : PRIMARY_COLOR}`,
                  color: isFollowing ? 'var(--text-secondary)' : 'white'
                }}
              >
                {followLoading ? '...' : (isFollowing ? '已关注' : '关注')}
              </button>
            </div>
          )}
        </div>

        {/* 个人简介 */}
        {profile.bio && (
          <p className="mt-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
            {profile.bio}
          </p>
        )}

        {/* 统计信息 */}
        <div className="flex items-center justify-center gap-6 mt-6">
          <div className="flex flex-col items-center">
            <span className="font-bold" style={{ color: 'var(--text-color)' }}>
              {formatCount(profile.followers_count || 0)}
            </span>
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {t('profile.followers') || '粉丝'}
            </span>
          </div>
          <div className="flex flex-col items-center">
            <span className="font-bold" style={{ color: 'var(--text-color)' }}>
              {formatCount(profile.following_count || 0)}
            </span>
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {t('profile.following') || '关注'}
            </span>
          </div>
          <div className="flex flex-col items-center">
            <span className="font-bold" style={{ color: 'var(--text-color)' }}>
              {formatCount(heatCount)}
            </span>
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {t('profile.heat') || '热值'}
            </span>
          </div>
          <div className="flex flex-col items-center">
            <span className="font-bold" style={{ color: 'var(--text-color)' }}>
              {formatCount(profile.hot_points || 0)}
            </span>
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {t('profile.hotPoints') || '热点'}
            </span>
          </div>
        </div>

        {/* 等级 */}
        <div className="flex items-center justify-center gap-2 mt-4">
          <span
            className="px-3 py-1 text-sm font-medium rounded-full"
            style={{ backgroundColor: `${PRIMARY_COLOR}15`, color: PRIMARY_COLOR }}
          >
            LV.{profile.level || 1}
          </span>
        </div>
      </div>

      {/* 笔记列表 */}
      <div className="mt-6">
        <h2 className="px-4 py-2 font-medium" style={{ color: 'var(--text-color)' }}>
          {isOwnProfile ? '我的笔记' : '他的笔记'} ({userPosts.length})
        </h2>
        
        {userPosts.length === 0 ? (
          <div className="text-center py-12">
            <p style={{ color: 'var(--text-secondary)' }}>暂无笔记</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 p-4">
            {userPosts.map((post) => (
              <div
                key={post.id}
                className="relative aspect-[3/4] rounded-xl overflow-hidden cursor-pointer"
                onClick={() => setSelectedPostIndex(userPosts.indexOf(post))}
                style={{ backgroundColor: 'var(--bg-secondary)' }}
              >
                <img 
                  src={post.cover_image || 'https://picsum.photos/300/400'} 
                  alt="" 
                  className="w-full h-full object-cover" 
                />
                <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
                  <p className="text-white text-xs truncate">{post.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="flex items-center gap-0.5 text-white/80 text-xs">
                      <Heart className="w-3 h-3" />
                      {formatCount(post.likes_count || 0)}
                    </span>
                    <span className="flex items-center gap-0.5 text-white/80 text-xs">
                      <MessageCircle className="w-3 h-3" />
                      {formatCount(post.comments_count || 0)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 底部导航 */}
      <BottomNav />

      {/* 笔记详情弹窗 */}
      {selectedPostIndex !== null && (
        <PostDetailModal
          post={userPosts[selectedPostIndex]}
          onClose={() => setSelectedPostIndex(null)}
        />
      )}
    </div>
  );
}
