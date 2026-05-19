import React, { useState, useEffect, useMemo } from 'react';
import { Search, Flame, MessageSquare, UserPlus, Bell, ChevronRight, Users, Plus, Loader2, Check, X, Bookmark, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import { cachedFetch } from '../utils/apiCache';
import RoomList from './RoomList';
import CreateRoom from './CreateRoom';

const PRIMARY_COLOR = '#2563EB';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkaHdtZWl0dGdkb3Nta3h0cGFrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODEzMjQ5MiwiZXhwIjoyMDkzNzA4NDkyfQ.bPatiu7NXaE2k48aTkjAGQsba6NzXlIdq2k_gGLYLBE';

interface Announcement {
  id: string;
  title: string;
  content: string;
  type?: string;
  is_pinned: boolean;
  is_active: boolean;
  status: string;
  created_at: string;
}

interface GroupChat {
  id: string;
  title: string;
  content: string;
  tags: string[];
  user_id: string;
  heat_count: number;
  created_at: string;
  profiles?: {
    username: string;
    avatar_url: string;
  };
}

// 好友相关接口
interface FriendProfile {
  id: string;
  user_id: string;
  username: string;
  nickname: string | null;
  avatar_url: string | null;
  created_at: string;
}

// 收藏记录接口
interface FavoriteRecord {
  id: string;
  user_id: string;
  note_id: string;
  created_at: string;
  favoriter_username?: string;
  favoriter_avatar_url?: string;
  favoriter_nickname?: string;
  note_title?: string;
  note_type?: string;
}

// 统一消息类型
type UnifiedMessage = {
  id: string;
  type: 'private' | 'group' | 'announcement' | 'notification';
  title: string;
  subtitle: string;
  avatar?: string;
  avatarType?: 'user' | 'group' | 'system';
  time: string;
  timeRaw: string;
  isRead: boolean;
  isPinned?: boolean;
  badge?: number;
  // 原始数据
  rawData?: any;
};

function Messages() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('messages');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  // 数据状态
  const [friendsList, setFriendsList] = useState<FriendProfile[]>([]);
  const [latestChatMessages, setLatestChatMessages] = useState<Record<string, {content: string, time: string, messageType: string}>>({});
  const [groupChats, setGroupChats] = useState<GroupChat[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [noteNotifications, setNoteNotifications] = useState<any[]>([]);
  const [favoriteRecords, setFavoriteRecords] = useState<FavoriteRecord[]>([]);
  
  // 加载状态
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const [isLoadingAnnouncements, setIsLoadingAnnouncements] = useState(false);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [isLoadingFavorites, setIsLoadingFavorites] = useState(false);
  
  // 未读数统计
  const [unreadAnnouncements, setUnreadAnnouncements] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadFavorites, setUnreadFavorites] = useState(0);
  
  // 弹窗状态
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  
  // 群聊相关状态
  const [pendingGroupChats, setPendingGroupChats] = useState<GroupChat[]>([]);
  
  // 好友相关状态
  const [friendSearchQuery, setFriendSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FriendProfile[]>([]);
  const [recommendedUsers, setRecommendedUsers] = useState<FriendProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingRecommended, setIsLoadingRecommended] = useState(false);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [pendingRequests, setPendingRequests] = useState<Set<string>>(new Set());
  const [sendingRequestId, setSendingRequestId] = useState<string | null>(null);
  const [friendRequests, setFriendRequests] = useState<(FriendProfile & { message?: string; requestId?: string })[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);
  
  // 打招呼弹窗
  const [greetingModal, setGreetingModal] = useState<{
    targetUser: FriendProfile;
    message: string;
  } | null>(null);
  
  // 收藏面板弹窗
  const [showFavoritesModal, setShowFavoritesModal] = useState(false);

  // 顶部图标分类
  const messageCategories = [
    { id: 'likes', label: t('messages.heat') || '热值', icon: Flame, count: 0 },
    { id: 'comments', label: t('messages.comments') || '评论', icon: MessageSquare, count: 0 },
    { id: 'follows', label: t('messages.follows') || '关注', icon: UserPlus, count: 0 },
    { id: 'favorites', label: '收藏', icon: Bookmark, count: unreadFavorites },
  ];

  // 标签栏（合并后）
  const tabs = [
    { id: 'messages', label: '消息' },
    { id: 'friends', label: '好友' },
    { id: 'groups', label: '群聊' },
    { id: 'rooms', label: '房间' },
  ];

  // 格式化时间
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  // 加载好友列表
  const loadFriendsList = async () => {
    if (!currentUserId) return;
    setIsLoadingFriends(true);
    try {
      const params = new URLSearchParams();
      params.append('select', 'following_id,created_at');
      params.append('follower_id', `eq.${currentUserId}`);
      params.append('status', 'eq.active');
      params.append('order', 'created_at.desc');

      const res = await fetch(`/sb-api/rest/v1/follows?${params.toString()}`, {
        headers: { 'apikey': SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SERVICE_ROLE_KEY}` }
      });

      if (res.ok) {
        const data = await res.json();
        const friendIds = (data || []).map((r: any) => r.following_id);

        if (friendIds.length === 0) {
          setFriendsList([]);
          return;
        }

        const profileParams = new URLSearchParams();
        profileParams.append('select', 'id,user_id,username,nickname,avatar_url,created_at');
        profileParams.append('user_id', `in.(${friendIds.join(',')})`);

        const profileRes = await fetch(`/sb-api/rest/v1/profiles?${profileParams.toString()}`, {
          headers: { 'apikey': SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SERVICE_ROLE_KEY}` }
        });

        if (profileRes.ok) {
          const profiles = await profileRes.json();
          setFriendsList(profiles || []);
        }
      }
    } catch (error) {
      console.error('Error loading friends list:', error);
    } finally {
      setIsLoadingFriends(false);
    }
  };

  // 加载好友最新聊天消息
  const loadLatestChatMessages = async () => {
    const userInfo = localStorage.getItem('user_info');
    if (!userInfo) return;
    
    try {
      const parsed = JSON.parse(userInfo);
      const authUserId = parsed.user_id || parsed.id;
      if (!authUserId) return;
      
      // 获取当前用户的 profile ID
      const profileRes = await fetch(`/sb-api/rest/v1/profiles?user_id=eq.${authUserId}&select=id&limit=1`, {
        headers: { 'apikey': SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SERVICE_ROLE_KEY}` }
      });
      if (!profileRes.ok) return;
      const profileData = await profileRes.json();
      if (!Array.isArray(profileData) || profileData.length === 0) return;
      const myProfileId = profileData[0].id;
      
      // 查询当前用户发送或接收的所有消息，按时间倒序
      const msgRes = await fetch(`/sb-api/rest/v1/private_messages?or=(sender_id.eq.${myProfileId},receiver_id.eq.${myProfileId})&select=sender_id,receiver_id,content,message_type,created_at&order=created_at.desc&limit=100`, {
        headers: { 'apikey': SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SERVICE_ROLE_KEY}` }
      });
      
      if (!msgRes.ok) return;
      const messages = await msgRes.json();
      if (!Array.isArray(messages)) return;
      
      // 按对话分组，取每个好友的最新消息
      const latestMap: Record<string, {content: string, time: string, messageType: string}> = {};
      for (const msg of messages) {
        const otherId = msg.sender_id === myProfileId ? msg.receiver_id : msg.sender_id;
        if (!latestMap[otherId]) {
          let displayContent = msg.content;
          if (msg.message_type === 'image') displayContent = '[图片]';
          else if (msg.message_type === 'voice') displayContent = '[语音]';
          else if (msg.message_type === 'faith_bubble') displayContent = '[信仰之光]';
          else if (displayContent.startsWith('[emoji:')) displayContent = '[表情]';
          latestMap[otherId] = {
            content: displayContent,
            time: msg.created_at,
            messageType: msg.message_type,
          };
        }
      }
      
      setLatestChatMessages(latestMap);
    } catch (err) {
      console.error('Error loading latest chat messages:', err);
    }
  };

  // 加载推荐用户
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
        const filtered = (data || []).filter((u: FriendProfile) => (u.user_id || u.id) !== currentUserId);
        setRecommendedUsers(filtered);
        
        if (currentUserId && filtered.length > 0) {
          loadFollowingStatus(filtered.map((u: FriendProfile) => u.user_id || u.id));
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

  // 搜索用户
  const handleFriendSearch = async () => {
    if (!friendSearchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const query = friendSearchQuery.trim();
      
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
      
      const allResults = [...(data1 || []), ...(data2 || [])];
      const uniqueMap = new Map();
      allResults.forEach((u: FriendProfile) => uniqueMap.set(u.id, u));
      const unique = Array.from(uniqueMap.values());
      
      const filtered = unique.filter((u: FriendProfile) => (u.user_id || u.id) !== currentUserId);
      setSearchResults(filtered);
      
      if (filtered.length > 0) {
        loadFollowingStatus(filtered.map((u: FriendProfile) => u.user_id || u.id));
      }
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // 添加好友
  const handleAddFriend = (user: FriendProfile) => {
    if (!currentUserId) {
      navigate('/login');
      return;
    }
    
    const currentUser = recommendedUsers.find(u => (u.user_id || u.id) === currentUserId);
    const currentNickname = currentUser?.nickname || currentUser?.username || '用户';
    const defaultMessage = `你好，我是${currentNickname}，希望能添加你为好友`;
    
    setGreetingModal({
      targetUser: user,
      message: defaultMessage,
    });
  };

  // 发送好友请求
  const sendFriendRequest = async () => {
    if (!greetingModal || !currentUserId) return;
    
    const { targetUser, message } = greetingModal;
    const targetUserId = targetUser.user_id || targetUser.id;
    
    setSendingRequestId(targetUserId);
    try {
      const followRecord = {
        follower_id: currentUserId,
        following_id: targetUserId,
        status: 'pending',
        created_at: new Date().toISOString(),
        ...(message.trim() ? { message: message.trim() } : {}),
      };

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
      alert('发送好友请求失败');
    } finally {
      setSendingRequestId(null);
    }
  };

  // 获取好友请求列表
  const loadFriendRequests = async () => {
    if (!currentUserId) return;
    
    setIsLoadingRequests(true);
    try {
      const params = new URLSearchParams();
      params.append('select', 'follower_id,following_id,status,message,created_at');
      params.append('following_id', `eq.${currentUserId}`);
      params.append('status', 'eq.pending');
      params.append('order', 'created_at.desc');
      params.append('limit', '20');

      const res = await fetch(`/sb-api/rest/v1/follows?${params.toString()}`, {
        headers: {
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        }
      });

      if (res.ok) {
        const data = await res.json();
        const followerIds = (data || []).map((r: FollowRecord) => r.follower_id);
        
        if (followerIds.length === 0) {
          setFriendRequests([]);
          return;
        }

        const profileParams = new URLSearchParams();
        profileParams.append('select', 'id,user_id,username,nickname,avatar_url,created_at');
        profileParams.append('user_id', `in.(${followerIds.join(',')})`);

        const profileRes = await fetch(`/sb-api/rest/v1/profiles?${profileParams.toString()}`, {
          headers: {
            'apikey': SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          }
        });

        if (profileRes.ok) {
          const profiles = await profileRes.json();
          const requestsWithProfiles = (data || []).map((request: any) => {
            const profile = (profiles || []).find(
              (p: FriendProfile) => p.user_id === request.follower_id
            );
            return {
              ...(profile || {}),
              message: request.message,
              requestId: request.follower_id,
            };
          });
          setFriendRequests(requestsWithProfiles);
        }
      }
    } catch (error) {
      console.error('Error loading friend requests:', error);
    } finally {
      setIsLoadingRequests(false);
    }
  };

  // 接受好友请求
  const acceptFriendRequest = async (requesterId: string) => {
    if (!currentUserId) return;
    
    setProcessingRequestId(requesterId);
    try {
      const params = new URLSearchParams();
      params.append('follower_id', `eq.${requesterId}`);
      params.append('following_id', `eq.${currentUserId}`);
      params.append('status', 'eq.pending');

      const res = await fetch(`/sb-api/rest/v1/follows?${params.toString()}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ status: 'active' }),
      });

      if (res.ok) {
        setFriendRequests(prev => prev.filter(r => r.requestId !== requesterId));
        setFollowingIds(prev => new Set([...prev, requesterId]));
      }
    } catch (error) {
      console.error('Error accepting friend request:', error);
      alert('接受请求失败');
    } finally {
      setProcessingRequestId(null);
    }
  };

  // 拒绝好友请求
  const rejectFriendRequest = async (requesterId: string) => {
    if (!currentUserId) return;
    
    setProcessingRequestId(requesterId);
    try {
      const params = new URLSearchParams();
      params.append('follower_id', `eq.${requesterId}`);
      params.append('following_id', `eq.${currentUserId}`);
      params.append('status', 'eq.pending');

      const res = await fetch(`/sb-api/rest/v1/follows?${params.toString()}`, {
        method: 'DELETE',
        headers: {
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        }
      });

      if (res.ok) {
        setFriendRequests(prev => prev.filter(r => r.requestId !== requesterId));
      }
    } catch (error) {
      console.error('Error rejecting friend request:', error);
      alert('拒绝请求失败');
    } finally {
      setProcessingRequestId(null);
    }
  };

  // 加载群聊列表
  const loadGroupChats = async () => {
    setIsLoadingGroups(true);
    try {
      const params = new URLSearchParams();
      params.append('select', 'id,title,content,tags,user_id,heat_count,status,created_at');
      params.append('order', 'heat_count.desc,created_at.desc');
      params.append('limit', '100');

      const data = await cachedFetch(`/sb-api/rest/v1/posts?${params.toString()}`, {
        headers: {
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        }
      });
      
      if (Array.isArray(data)) {
        const memberTag = currentUserId ? `member_${currentUserId}` : '';
        const groupChatsData = data.filter((post: GroupChat) => {
          if (!post.tags?.includes('__group_chat__')) return false;
          if (post.status !== 'published') return false;
          if (memberTag && post.tags?.includes(memberTag)) return true;
          return false;
        });
        setGroupChats(groupChatsData);
        
        // 加载待审核的群聊
        const pendingData = data.filter((post: GroupChat) => {
          if (!post.tags?.includes('__group_chat__')) return false;
          if (post.status === 'published') return false;
          if (memberTag && post.tags?.includes(memberTag)) return true;
          return false;
        });
        setPendingGroupChats(pendingData);
      }
    } catch (error) {
      console.error('Error fetching group chats:', error);
    } finally {
      setIsLoadingGroups(false);
    }
  };

  // 加载公告列表
  const loadAnnouncements = async () => {
    setIsLoadingAnnouncements(true);
    try {
      const params = new URLSearchParams();
      params.append('select', 'id,title,content,type,is_pinned,is_active,created_at');
      params.append('is_active', 'eq.true');
      params.append('order', 'is_pinned.desc,created_at.desc');
      params.append('limit', '50');

      const data = await cachedFetch(`/sb-api/rest/v1/announcements?${params.toString()}`, {
        headers: {
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        }
      });
      
      if (Array.isArray(data)) {
        // 获取当前用户的身份标签过滤
        const userInfo = localStorage.getItem('user_info');
        let userFaithTag = '';
        try {
          if (userInfo) {
            const parsed = JSON.parse(userInfo);
            const profileRes = await fetch(`/sb-api/rest/v1/profiles?user_id=eq.${parsed.user_id || parsed.id}&select=faith_tag`, {
              headers: { 'apikey': SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SERVICE_ROLE_KEY}` }
            });
            if (profileRes.ok) {
              const profileData = await profileRes.json();
              if (profileData?.[0]?.faith_tag) {
                userFaithTag = profileData[0].faith_tag;
              }
            }
          }
        } catch (e) {
          console.warn('[Announcements] Failed to get user faith_tag:', e);
        }

        const filtered = data.filter((a: any) => {
          if (!a.target_tags || a.target_tags.length === 0) return true;
          return userFaithTag && a.target_tags.includes(userFaithTag);
        });

        setAnnouncements(filtered);
        
        // 计算未读数
        const lastReadId = localStorage.getItem('last_read_announcement_id');
        const unread = filtered.filter((a: any) => a.id !== lastReadId).length;
        setUnreadAnnouncements(unread);
      }
    } catch (error) {
      console.error('Error fetching announcements:', error);
    } finally {
      setIsLoadingAnnouncements(false);
    }
  };

  // 加载通知列表
  const loadNoteNotifications = async () => {
    const userId = localStorage.getItem('user_id');
    if (!userId) return;
    setIsLoadingNotifications(true);
    try {
      const params = new URLSearchParams();
      params.append('select', 'id,type,title,content,is_read,created_at');
      params.append('user_id', `eq.${userId}`);
      params.append('order', 'created_at.desc');
      params.append('limit', '50');

      const res = await fetch(`/sb-api/rest/v1/notifications?${params.toString()}`, {
        headers: {
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setNoteNotifications(Array.isArray(data) ? data : []);
        setUnreadNotifications(Array.isArray(data) ? data.filter((n: any) => !n.is_read).length : 0);
      }
    } catch (error) {
      console.error('Error fetching note notifications:', error);
    } finally {
      setIsLoadingNotifications(false);
    }
  };

  // 加载收藏列表
  const loadFavoriteRecords = async () => {
    const userId = localStorage.getItem('user_id');
    if (!userId) return;
    setIsLoadingFavorites(true);
    try {
      // 尝试查询 favorites 表获取被收藏的记录
      // 查询用户发布的笔记关联的收藏记录
      const params = new URLSearchParams();
      params.append('select', 'id,user_id,note_id,created_at');
      params.append('order', 'created_at.desc');
      params.append('limit', '100');

      const res = await fetch(`/sb-api/rest/v1/favorites?${params.toString()}`, {
        headers: {
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          // 获取收藏者信息和笔记信息
          const favoriterIds = [...new Set(data.map((f: any) => f.user_id))];
          const noteIds = [...new Set(data.map((f: any) => f.note_id))];
          
          // 获取收藏者信息
          const profileParams = new URLSearchParams();
          profileParams.append('select', 'id,user_id,username,nickname,avatar_url');
          profileParams.append('user_id', `in.(${favoriterIds.join(',')})`);
          
          const profileRes = await fetch(`/sb-api/rest/v1/profiles?${profileParams.toString()}`, {
            headers: { 'apikey': SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SERVICE_ROLE_KEY}` }
          });
          const profiles = profileRes.ok ? await profileRes.json() : [];
          
          // 获取笔记信息
          const noteParams = new URLSearchParams();
          noteParams.append('select', 'id,title,user_id,type');
          noteParams.append('id', `in.(${noteIds.join(',')})`);
          
          const noteRes = await fetch(`/sb-api/rest/v1/notes?${noteParams.toString()}`, {
            headers: { 'apikey': SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SERVICE_ROLE_KEY}` }
          });
          const notes = noteRes.ok ? await noteRes.json() : [];
          
          // 筛选出当前用户笔记的收藏
          const myNoteIds = new Set(notes.filter((n: any) => n.user_id === userId).map((n: any) => n.id));
          const userNotes = notes.filter((n: any) => n.user_id === userId);
          const userNoteIds = new Set(userNotes.map((n: any) => n.id));
          
          // 筛选当前用户笔记被收藏的记录
          const myFavorites = data.filter((f: any) => userNoteIds.has(f.note_id));
          
          // 合并数据
          const enrichedFavorites: FavoriteRecord[] = myFavorites.map((f: any) => {
            const favoriter = (profiles || []).find((p: any) => p.user_id === f.user_id);
            const note = (notes || []).find((n: any) => n.id === f.note_id);
            return {
              id: f.id,
              user_id: f.user_id,
              note_id: f.note_id,
              created_at: f.created_at,
              favoriter_username: favoriter?.username,
              favoriter_avatar_url: favoriter?.avatar_url,
              favoriter_nickname: favoriter?.nickname,
              note_title: note?.title,
              note_type: note?.type,
            };
          });
          
          // 计算未读数（本地存储标记）
          const lastReadFavorites = localStorage.getItem('last_read_favorites') || '';
          const lastReadIds = lastReadFavorites ? lastReadFavorites.split(',') : [];
          const unread = enrichedFavorites.filter((f: any) => !lastReadIds.includes(f.id)).length;
          setUnreadFavorites(unread);
          
          setFavoriteRecords(enrichedFavorites);
        } else {
          setFavoriteRecords([]);
          setUnreadFavorites(0);
        }
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
      // 表不存在时显示空列表
      setFavoriteRecords([]);
      setUnreadFavorites(0);
    } finally {
      setIsLoadingFavorites(false);
    }
  };

  // 初始化加载
  useEffect(() => {
    const userId = localStorage.getItem('user_id');
    if (userId) {
      setCurrentUserId(userId);
    }
    
    // 预加载所有数据
    loadAnnouncements();
    loadNoteNotifications();
    loadFavoriteRecords();
  }, []);

  // Tab 切换时加载数据
  useEffect(() => {
    if (activeTab === 'messages') {
      loadFriendsList();
      loadLatestChatMessages();
      loadGroupChats();
      loadAnnouncements();
      loadNoteNotifications();
    } else if (activeTab === 'favorites') {
      loadFavoriteRecords();
      // 标记收藏为已读
      if (favoriteRecords.length > 0) {
        const allIds = favoriteRecords.map(f => f.id).join(',');
        localStorage.setItem('last_read_favorites', allIds);
        setUnreadFavorites(0);
      }
    } else if (activeTab === 'friends') {
      loadFriendsList();
      loadFriendRequests();
      loadRecommendedUsers();
    } else if (activeTab === 'groups') {
      loadGroupChats();
    }
  }, [activeTab, currentUserId]);

  // 构建统一消息列表
  const unifiedMessages = useMemo((): UnifiedMessage[] => {
    const messages: UnifiedMessage[] = [];
    
    // 添加私聊消息
    friendsList.forEach(friend => {
      const userId = friend.user_id || friend.id;
      const latestMsg = latestChatMessages[friend.id];
      messages.push({
        id: `private_${userId}`,
        type: 'private',
        title: friend.nickname || friend.username || '未命名用户',
        subtitle: latestMsg ? latestMsg.content : '点击开始聊天',
        avatar: friend.avatar_url || undefined,
        avatarType: 'user',
        time: latestMsg ? formatTime(latestMsg.time) : formatTime(friend.created_at),
        timeRaw: latestMsg ? latestMsg.time : friend.created_at,
        isRead: true,
        rawData: friend,
      });
    });
    
    // 添加群聊消息
    groupChats.forEach(group => {
      messages.push({
        id: `group_${group.id}`,
        type: 'group',
        title: group.title,
        subtitle: group.content || '群聊',
        avatarType: 'group',
        time: formatTime(group.created_at),
        timeRaw: group.created_at,
        isRead: true,
        badge: group.heat_count,
        rawData: group,
      });
    });
    
    // 添加公告
    const lastReadAnnouncementId = localStorage.getItem('last_read_announcement_id');
    announcements.forEach(ann => {
      messages.push({
        id: `announcement_${ann.id}`,
        type: 'announcement',
        title: ann.title,
        subtitle: ann.content,
        avatarType: 'system',
        time: formatTime(ann.created_at),
        timeRaw: ann.created_at,
        isRead: lastReadAnnouncementId === ann.id,
        isPinned: ann.is_pinned,
        rawData: ann,
      });
    });
    
    // 添加通知
    noteNotifications.forEach(notif => {
      messages.push({
        id: `notification_${notif.id}`,
        type: 'notification',
        title: notif.title || '系统通知',
        subtitle: notif.content || '',
        avatarType: 'system',
        time: formatTime(notif.created_at),
        timeRaw: notif.created_at,
        isRead: notif.is_read,
        rawData: notif,
      });
    });
    
    // 按时间倒序排序
    messages.sort((a, b) => new Date(b.timeRaw).getTime() - new Date(a.timeRaw).getTime());
    
    // 搜索过滤
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return messages.filter(m => 
        m.title.toLowerCase().includes(query) || 
        m.subtitle.toLowerCase().includes(query)
      );
    }
    
    return messages;
  }, [friendsList, groupChats, announcements, noteNotifications, searchQuery]);

  // 处理收藏点击
  const handleFavoriteClick = () => {
    setShowFavoritesModal(true);
    loadFavoriteRecords();
    // 标记已读
    if (favoriteRecords.length > 0) {
      const allIds = favoriteRecords.map(f => f.id).join(',');
      localStorage.setItem('last_read_favorites', allIds);
      setUnreadFavorites(0);
    }
  };

  // 分类点击处理
  const handleCategoryClick = (categoryId: string) => {
    if (categoryId === 'favorites') {
      handleFavoriteClick();
    }
  };

  // 点击消息条目
  const handleMessageClick = (message: UnifiedMessage) => {
    switch (message.type) {
      case 'private':
        const friendData = message.rawData;
        // 确保使用 user_id (auth UUID)，而不是 profiles.id
        const targetUserId = friendData.user_id || friendData.id;
        console.log('[Messages] Navigate to chat with userId:', targetUserId);
        navigate(`/chat/${targetUserId}`);
        break;
      case 'group':
        navigate(`/group-chat/${message.rawData.id}`);
        break;
      case 'announcement':
        setSelectedAnnouncement(message.rawData);
        // 标记已读
        localStorage.setItem('last_read_announcement_id', message.rawData.id);
        setUnreadAnnouncements(prev => Math.max(0, prev - 1));
        break;
      case 'notification':
        // 标记通知已读
        markNotificationAsRead(message.rawData);
        break;
    }
  };

  // 标记通知已读
  const markNotificationAsRead = async (notification: any) => {
    if (notification.is_read) return;
    try {
      await fetch(`/sb-api/rest/v1/notifications?id=eq.${notification.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ is_read: true }),
      });
      setNoteNotifications(prev =>
        prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
      );
      setUnreadNotifications(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // 点击收藏记录跳转到笔记详情
  const handleFavoriteRecordClick = (record: FavoriteRecord) => {
    // 标记已读
    const lastReadFavorites = localStorage.getItem('last_read_favorites') || '';
    const lastReadIds = lastReadFavorites ? lastReadFavorites.split(',') : [];
    if (!lastReadIds.includes(record.id)) {
      const newReadIds = [...lastReadIds, record.id].join(',');
      localStorage.setItem('last_read_favorites', newReadIds);
      setUnreadFavorites(prev => Math.max(0, prev - 1));
    }
    // 跳转到笔记详情
    navigate(`/note/${record.note_id}`);
  };

  // 渲染消息列表
  const renderMessagesTab = () => {
    const isLoading = isLoadingFriends || isLoadingGroups || isLoadingAnnouncements || isLoadingNotifications;
    
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
        </div>
      );
    }

    if (unifiedMessages.length === 0) {
      return (
        <div className="text-center py-12">
          <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" style={{ color: 'var(--text-secondary)' }} />
          <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>暂无消息</p>
          <button
            onClick={() => setActiveTab('favorites')}
            className="px-4 py-2 rounded-xl text-sm font-medium text-white"
            style={{ backgroundColor: PRIMARY_COLOR }}
          >
            <Bookmark className="w-4 h-4 inline mr-1" />
            查看收藏
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {unifiedMessages.map((message) => (
          <button
            key={message.id}
            onClick={() => handleMessageClick(message)}
            className="w-full text-left p-4 rounded-xl transition-colors hover:opacity-80"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              borderLeft: message.type === 'announcement' ? '3px solid #f59e0b' :
                         message.type === 'notification' ? '3px solid #8b5cf6' : 'none'
            }}
          >
            <div className="flex items-start gap-3">
              {/* 未读指示器 */}
              {!message.isRead && (
                <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{ backgroundColor: PRIMARY_COLOR }} />
              )}
              
              {/* 头像 */}
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden"
                style={{
                  backgroundColor: message.type === 'announcement' ? '#fef3c7' :
                                   message.type === 'notification' ? '#ede9fe' :
                                   message.type === 'group' ? `${PRIMARY_COLOR}15` : `${PRIMARY_COLOR}20`
                }}
              >
                {message.avatar ? (
                  <img src={message.avatar} className="w-full h-full object-cover" alt="" />
                ) : message.type === 'announcement' ? (
                  <span className="text-lg">📢</span>
                ) : message.type === 'notification' ? (
                  <Bell className="w-5 h-5" style={{ color: '#8b5cf6' }} />
                ) : message.type === 'group' ? (
                  <Users className="w-5 h-5" style={{ color: PRIMARY_COLOR }} />
                ) : (
                  <Users className="w-5 h-5" style={{ color: PRIMARY_COLOR }} />
                )}
              </div>
              
              {/* 内容 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span
                    className="font-medium text-sm truncate"
                    style={{
                      color: 'var(--text-color)',
                      fontWeight: message.type === 'announcement' ? '700' : '500'
                    }}
                  >
                    {message.type === 'announcement' && '📢 '}
                    {message.title}
                  </span>
                  {message.badge && message.badge > 0 && (
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      🔥 {message.badge}
                    </span>
                  )}
                </div>
                <p
                  className="text-xs line-clamp-1 mb-1"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {message.subtitle}
                </p>
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {message.time}
                </span>
              </div>
              
              <ChevronRight className="w-4 h-4 flex-shrink-0 mt-1" style={{ color: 'var(--text-secondary)' }} />
            </div>
          </button>
        ))}
      </div>
    );
  };

  // 渲染收藏列表
  const renderFavoritesTab = () => {
    if (isLoadingFavorites) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
        </div>
      );
    }

    if (favoriteRecords.length === 0) {
      return (
        <div className="text-center py-12">
          <Bookmark className="w-12 h-12 mx-auto mb-3 opacity-30" style={{ color: 'var(--text-secondary)' }} />
          <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>暂无收藏记录</p>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            当有人收藏你的笔记时，会在这里显示
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {favoriteRecords.map((record) => (
          <button
            key={record.id}
            onClick={() => handleFavoriteRecordClick(record)}
            className="w-full text-left p-4 rounded-xl transition-colors hover:opacity-80"
            style={{ backgroundColor: 'var(--bg-secondary)' }}
          >
            <div className="flex items-start gap-3">
              {/* 收藏者头像 */}
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden"
                style={{ backgroundColor: `${PRIMARY_COLOR}20` }}
              >
                {record.favoriter_avatar_url ? (
                  <img
                    src={record.favoriter_avatar_url}
                    className="w-full h-full object-cover"
                    alt=""
                  />
                ) : (
                  <Users className="w-5 h-5" style={{ color: PRIMARY_COLOR }} />
                )}
              </div>
              
              {/* 内容 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="font-medium text-sm"
                    style={{ color: 'var(--text-color)' }}
                  >
                    {record.favoriter_nickname || record.favoriter_username || '某用户'}
                  </span>
                  <span
                    className="px-2 py-0.5 text-xs rounded-full"
                    style={{ backgroundColor: `${PRIMARY_COLOR}15`, color: PRIMARY_COLOR }}
                  >
                    收藏了你的{record.note_type === 'plan' ? '计划' : '笔记'}
                  </span>
                </div>
                <p
                  className="text-xs line-clamp-1 mb-1"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  《{record.note_title || '未知内容'}》
                </p>
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {formatTime(record.created_at)}
                </span>
              </div>
              
              <ChevronRight className="w-4 h-4 flex-shrink-0 mt-1" style={{ color: 'var(--text-secondary)' }} />
            </div>
          </button>
        ))}
      </div>
    );
  };

  // 渲染房间列表
  const renderRoomsTab = () => (
    <RoomList
      onClose={() => setActiveTab('messages')}
      onCreateRoom={() => setShowCreateRoom(true)}
    />
  );

  // 渲染群聊Tab
  const renderGroupsTab = () => {
    if (isLoadingGroups) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
        </div>
      );
    }

    if (groupChats.length === 0 && pendingGroupChats.length === 0) {
      return (
        <div className="text-center py-12">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" style={{ color: 'var(--text-secondary)' }} />
          <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>暂无群聊</p>
          <button
            onClick={() => navigate('/add/group')}
            className="px-4 py-2 rounded-xl text-sm font-medium text-white"
            style={{ backgroundColor: PRIMARY_COLOR }}
          >
            <Plus className="w-4 h-4 inline mr-1" />
            创建群聊
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {/* 待审核群聊区域 */}
        {pendingGroupChats.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4" style={{ color: '#f59e0b' }} />
              <span className="text-sm font-medium" style={{ color: '#f59e0b' }}>
                待审核群聊 ({pendingGroupChats.length})
              </span>
            </div>
            <div className="space-y-2">
              {pendingGroupChats.map((group) => (
                <div
                  key={group.id}
                  className="p-4 rounded-xl"
                  style={{ backgroundColor: 'var(--bg-secondary)', borderLeft: '3px solid #f59e0b' }}
                >
                  <div className="flex items-start gap-3">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${PRIMARY_COLOR}15` }}
                    >
                      <Users className="w-5 h-5" style={{ color: PRIMARY_COLOR }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span 
                          className="font-medium text-sm truncate"
                          style={{ color: 'var(--text-color)' }}
                        >
                          {group.title}
                        </span>
                        <span 
                          className="px-2 py-0.5 text-xs rounded-full"
                          style={{ 
                            backgroundColor: group.status === 'pending' ? '#fef3c7' : '#fee2e2',
                            color: group.status === 'pending' ? '#d97706' : '#dc2626'
                          }}
                        >
                          {group.status === 'pending' ? '待审核' : '已拒绝'}
                        </span>
                      </div>
                      {group.content && (
                        <p 
                          className="text-xs line-clamp-1 mb-2"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          {group.content}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-1">
                        {group.tags?.filter(tag => tag !== '__group_chat__').slice(0, 3).map((tag) => (
                          <span 
                            key={tag} 
                            className="px-2 py-0.5 text-xs rounded-full"
                            style={{ backgroundColor: `${PRIMARY_COLOR}15`, color: PRIMARY_COLOR }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                      <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
                        提交时间: {formatTime(group.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 已通过群聊列表 */}
        {groupChats.map((group) => (
          <button
            key={group.id}
            onClick={() => navigate(`/group-chat/${group.id}`)}
            className="w-full text-left p-4 rounded-xl transition-colors hover:opacity-80"
            style={{ backgroundColor: 'var(--bg-secondary)' }}
          >
            <div className="flex items-start gap-3">
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${PRIMARY_COLOR}15` }}
              >
                <Users className="w-6 h-6" style={{ color: PRIMARY_COLOR }} />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span 
                    className="font-medium text-sm truncate"
                    style={{ color: 'var(--text-color)' }}
                  >
                    {group.title}
                  </span>
                  {group.heat_count > 0 && (
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      🔥 {group.heat_count}
                    </span>
                  )}
                </div>
                {group.content && (
                  <p 
                    className="text-xs line-clamp-1 mb-2"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {group.content}
                  </p>
                )}
                <div className="flex flex-wrap gap-1">
                  {group.tags?.filter(tag => tag !== '__group_chat__').slice(0, 3).map((tag) => (
                    <span 
                      key={tag} 
                      className="px-2 py-0.5 text-xs rounded-full"
                      style={{ backgroundColor: `${PRIMARY_COLOR}15`, color: PRIMARY_COLOR }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              
              <ChevronRight className="w-4 h-4 flex-shrink-0 mt-1" style={{ color: 'var(--text-secondary)' }} />
            </div>
          </button>
        ))}
        
        {/* 创建群聊入口 */}
        <button
          onClick={() => navigate('/add/group')}
          className="w-full flex items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed transition-colors hover:opacity-80"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <Plus className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>创建新群聊</span>
        </button>
      </div>
    );
  };

  // 渲染好友Tab
  const renderFriendsTab = () => {
    const displayUsers = friendSearchQuery.trim() ? searchResults : recommendedUsers;
    const friendUserIds = new Set(friendsList.map(f => f.user_id || f.id));
    const displayUsersFiltered = displayUsers.filter((u: FriendProfile) => !friendUserIds.has(u.user_id || u.id));

    const renderUserCard = (user: FriendProfile) => {
      const userId = user.user_id || user.id;
      const isFollowing = followingIds.has(userId);
      const isPending = pendingRequests.has(userId);
      const isSending = sendingRequestId === userId;

      return (
        <div
          key={user.id}
          className="flex items-center gap-3 p-3 rounded-xl theme-transition"
          style={{ backgroundColor: 'var(--bg-secondary)' }}
        >
          <div 
            className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden"
            style={{ backgroundColor: `${PRIMARY_COLOR}20` }}
          >
            {user.avatar_url ? (
              <img 
                src={user.avatar_url} 
                alt={user.username}
                className="w-full h-full object-cover"
              />
            ) : (
              <Users className="w-6 h-6" style={{ color: PRIMARY_COLOR }} />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate" style={{ color: 'var(--text-color)' }}>
              {user.nickname || user.username || '未命名用户'}
            </p>
            <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
              ID: {userId.slice(0, 8)}...
            </p>
          </div>

          <div className="flex-shrink-0">
            {isFollowing ? (
              <button
                disabled
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{ backgroundColor: `${PRIMARY_COLOR}15`, color: PRIMARY_COLOR }}
              >
                <Check className="w-3 h-3" />
                已添加
              </button>
            ) : isPending || isSending ? (
              <button
                disabled
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{ backgroundColor: `var(--text-secondary)20`, color: 'var(--text-secondary)' }}
              >
                <Loader2 className="w-3 h-3 animate-spin" />
                待确认
              </button>
            ) : (
              <button
                onClick={() => handleAddFriend(user)}
                disabled={isSending}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-white"
                style={{ backgroundColor: PRIMARY_COLOR }}
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
      <div className="space-y-4">
        {/* 好友请求区域 */}
        {currentUserId && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Bell className="w-4 h-4" style={{ color: PRIMARY_COLOR }} />
              <span className="text-sm font-medium" style={{ color: PRIMARY_COLOR }}>
                好友请求 ({friendRequests.length})
              </span>
            </div>
            
            {isLoadingRequests ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin" style={{ color: PRIMARY_COLOR }} />
              </div>
            ) : friendRequests.length > 0 ? (
              <div className="space-y-2">
                {friendRequests.map((request) => (
                  <div
                    key={request.requestId}
                    className="p-3 rounded-xl"
                    style={{ backgroundColor: 'var(--bg-secondary)' }}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden"
                        style={{ backgroundColor: `${PRIMARY_COLOR}20` }}
                      >
                        {request.avatar_url ? (
                          <img 
                            src={request.avatar_url} 
                            alt={request.username}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Users className="w-5 h-5" style={{ color: PRIMARY_COLOR }} />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate" style={{ color: 'var(--text-color)' }}>
                          {request.nickname || request.username || '未命名用户'}
                        </p>
                        {request.message && (
                          <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                            {request.message}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => acceptFriendRequest(request.requestId!)}
                        disabled={processingRequestId === request.requestId}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-xs font-medium text-white"
                        style={{ backgroundColor: PRIMARY_COLOR }}
                      >
                        <Check className="w-3 h-3" />
                        {processingRequestId === request.requestId ? '处理中...' : '接受'}
                      </button>
                      <button
                        onClick={() => rejectFriendRequest(request.requestId!)}
                        disabled={processingRequestId === request.requestId}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-xs font-medium"
                        style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-secondary)' }}
                      >
                        <X className="w-3 h-3" />
                        拒绝
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-center py-2" style={{ color: 'var(--text-secondary)' }}>
                暂无好友请求
              </p>
            )}
          </div>
        )}

        {/* 我的好友列表 */}
        {currentUserId && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4" style={{ color: PRIMARY_COLOR }} />
              <span className="text-sm font-medium" style={{ color: PRIMARY_COLOR }}>
                我的好友 ({friendsList.length})
              </span>
            </div>

            {isLoadingFriends ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin" style={{ color: PRIMARY_COLOR }} />
              </div>
            ) : friendsList.length > 0 ? (
              <div className="space-y-2">
                {friendsList.map((friend) => (
                  <div
                    key={friend.id}
                    className="flex items-center gap-3 p-3 rounded-xl theme-transition cursor-pointer"
                    style={{ backgroundColor: 'var(--bg-secondary)' }}
                    onClick={() => navigate(`/chat/${friend.user_id || friend.id}`)}
                  >
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden"
                      style={{ backgroundColor: `${PRIMARY_COLOR}20` }}
                    >
                      {friend.avatar_url ? (
                        <img
                          src={friend.avatar_url}
                          alt={friend.username}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Users className="w-6 h-6" style={{ color: PRIMARY_COLOR }} />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate" style={{ color: 'var(--text-color)' }}>
                        {friend.nickname || friend.username || '未命名用户'}
                      </p>
                      <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                        ID: {(friend.user_id || friend.id).slice(0, 8)}
                      </p>
                    </div>

                    <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-secondary)' }} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-center py-2" style={{ color: 'var(--text-secondary)' }}>
                暂无好友，快去添加吧
              </p>
            )}
          </div>
        )}

        {/* 搜索框 */}
        <div className="flex items-center gap-2">
          <div 
            className="flex-1 flex items-center h-11 px-4 rounded-xl theme-transition" 
            style={{ backgroundColor: 'var(--bg-secondary)' }}
          >
            <Search className="w-4 h-4 mr-2 theme-transition" style={{ color: 'var(--text-secondary)' }} />
            <input
              type="text"
              value={friendSearchQuery}
              onChange={(e) => setFriendSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleFriendSearch()}
              placeholder="搜索昵称、ID..."
              className="flex-1 bg-transparent text-sm outline-none theme-transition"
              style={{ color: 'var(--text-color)' }}
            />
            {friendSearchQuery && (
              <button 
                onClick={() => setFriendSearchQuery('')}
                className="p-1"
              >
                <X className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
              </button>
            )}
          </div>
          <button
            onClick={handleFriendSearch}
            disabled={isSearching}
            className="px-5 h-11 rounded-xl text-sm font-medium text-white flex items-center"
            style={{ backgroundColor: PRIMARY_COLOR }}
          >
            {isSearching ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              '搜索'
            )}
          </button>
        </div>

        {/* 加载状态 */}
        {isSearching || isLoadingRecommended ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: PRIMARY_COLOR }} />
          </div>
        ) : displayUsersFiltered.length > 0 ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-4 h-4" style={{ color: PRIMARY_COLOR }} />
              <span className="text-sm font-medium theme-transition" style={{ color: PRIMARY_COLOR }}>
                {friendSearchQuery.trim() 
                  ? `搜索结果 (${displayUsersFiltered.length})`
                  : `推荐用户 (${displayUsersFiltered.length})`
                }
              </span>
            </div>
            {displayUsersFiltered.map(renderUserCard)}
            
            {friendSearchQuery.trim() && searchResults.length === 0 && (
              <div className="text-center py-8">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-30" style={{ color: 'var(--text-secondary)' }} />
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  未找到匹配的用户
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" style={{ color: 'var(--text-secondary)' }} />
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {friendSearchQuery.trim() 
                ? '未找到匹配的用户'
                : '暂无推荐用户'
              }
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className="min-h-screen pb-20 theme-transition"
      style={{ backgroundColor: 'var(--bg-color)' }}
    >
      <header
        className="sticky top-0 z-40 px-4 py-3 theme-transition"
        style={{ backgroundColor: 'var(--bg-color)' }}
      >
        <div
          className="flex items-center h-10 px-4 rounded-xl"
          style={{ backgroundColor: 'var(--bg-secondary)' }}
        >
          <Search className="w-4 h-4 mr-2" style={{ color: 'var(--icon-color)' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索消息..."
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: 'var(--text-color)' }}
          />
        </div>
      </header>

      {/* 顶部图标区域 */}
      <div className="px-4 py-4">
        <div className="grid grid-cols-4 gap-3">
          {messageCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategoryClick(cat.id)}
              className="flex flex-col items-center"
            >
              <div
                className="relative w-14 h-14 rounded-full flex items-center justify-center mb-2"
                style={{ backgroundColor: 'var(--bg-secondary)' }}
              >
                {cat.id === 'favorites' ? (
                  <Bookmark className="w-6 h-6" style={{ color: PRIMARY_COLOR }} />
                ) : (
                  <cat.icon className="w-6 h-6" style={{ color: PRIMARY_COLOR }} />
                )}
                {cat.count > 0 && (
                  <span
                    className="absolute -top-1 -right-1 w-5 h-5 text-white text-xs rounded-full flex items-center justify-center min-w-[20px]"
                    style={{ backgroundColor: PRIMARY_COLOR }}
                  >
                    {cat.count > 99 ? '99+' : cat.count}
                  </span>
                )}
              </div>
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {cat.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 标签栏 */}
      <div className="px-4 mb-4">
        <div
          className="flex items-center justify-center rounded-full p-1"
          style={{ backgroundColor: 'var(--bg-secondary)' }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex-1 py-2 text-xs font-medium rounded-full transition-colors"
              style={{
                backgroundColor: activeTab === tab.id ? PRIMARY_COLOR : 'transparent',
                color: activeTab === tab.id ? '#FFFFFF' : 'var(--text-secondary)',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab 内容 */}
      <div className="px-4">
        {activeTab === 'messages' ? renderMessagesTab() :
         activeTab === 'friends' ? renderFriendsTab() :
         activeTab === 'groups' ? renderGroupsTab() :
         activeTab === 'rooms' ? renderRoomsTab() : null}
      </div>

      {/* 收藏面板弹窗 */}
      {showFavoritesModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setShowFavoritesModal(false)}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div 
            className="relative w-full max-w-md max-h-[80vh] rounded-2xl overflow-hidden"
            style={{ backgroundColor: 'var(--bg-color)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3" style={{ backgroundColor: 'var(--bg-color)' }}>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-color)' }}>我的收藏</h2>
              <button
                onClick={() => setShowFavoritesModal(false)}
                className="p-2 rounded-full transition-colors hover:opacity-80"
                style={{ backgroundColor: 'var(--bg-secondary)' }}
              >
                <X className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
              </button>
            </div>
            <div className="overflow-y-auto max-h-[calc(80vh-60px)] p-4">
              {isLoadingFavorites ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin" style={{ color: PRIMARY_COLOR }} />
                </div>
              ) : favoriteRecords.length > 0 ? (
                <div className="space-y-3">
                  {favoriteRecords.map((record) => (
                    <div
                      key={record.id}
                      className="p-4 rounded-xl cursor-pointer transition-colors hover:opacity-80"
                      style={{ backgroundColor: 'var(--bg-secondary)' }}
                      onClick={() => {
                        if (record.note_id) {
                          navigate(`/note/${record.note_id}`);
                          setShowFavoritesModal(false);
                        }
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <Bookmark className="w-5 h-5 flex-shrink-0" style={{ color: PRIMARY_COLOR }} />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate" style={{ color: 'var(--text-color)' }}>
                            {record.note_title || '收藏的笔记'}
                          </p>
                          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                            {formatTime(record.created_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Bookmark className="w-12 h-12 mx-auto mb-3 opacity-30" style={{ color: 'var(--text-secondary)' }} />
                  <p style={{ color: 'var(--text-secondary)' }}>暂无收藏</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 打招呼弹窗 */}
      {greetingModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setGreetingModal(null)}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div 
            className="relative w-full max-w-md rounded-2xl overflow-hidden"
            style={{ backgroundColor: 'var(--bg-color)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3" style={{ backgroundColor: 'var(--bg-color)' }}>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-color)' }}>添加好友</h2>
              <button
                onClick={() => setGreetingModal(null)}
                className="p-2 rounded-full transition-colors hover:opacity-80"
                style={{ backgroundColor: 'var(--bg-secondary)' }}
              >
                <X className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
              </button>
            </div>
            <div className="p-4">
              <div className="flex items-center gap-3 mb-4 p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden"
                  style={{ backgroundColor: `${PRIMARY_COLOR}20` }}
                >
                  {greetingModal.targetUser.avatar_url ? (
                    <img 
                      src={greetingModal.targetUser.avatar_url} 
                      alt={greetingModal.targetUser.username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Users className="w-6 h-6" style={{ color: PRIMARY_COLOR }} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate" style={{ color: 'var(--text-color)' }}>
                    {greetingModal.targetUser.nickname || greetingModal.targetUser.username || '未命名用户'}
                  </p>
                  <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                    ID: {(greetingModal.targetUser.user_id || greetingModal.targetUser.id).slice(0, 8)}...
                  </p>
                </div>
              </div>
              
              <textarea
                value={greetingModal.message}
                onChange={(e) => setGreetingModal({ ...greetingModal, message: e.target.value })}
                placeholder="添加好友时发送的招呼语..."
                className="w-full h-24 p-3 rounded-xl resize-none text-sm outline-none"
                style={{ 
                  backgroundColor: 'var(--bg-secondary)', 
                  color: 'var(--text-color)',
                  border: 'none'
                }}
              />
              
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => setGreetingModal(null)}
                  className="flex-1 py-3 rounded-xl text-sm font-medium transition-colors"
                  style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
                >
                  取消
                </button>
                <button
                  onClick={sendFriendRequest}
                  disabled={sendingRequestId !== null}
                  className="flex-1 py-3 rounded-xl text-sm font-medium text-white transition-colors disabled:opacity-50"
                  style={{ backgroundColor: PRIMARY_COLOR }}
                >
                  {sendingRequestId !== null ? '发送中...' : '发送请求'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 创建房间弹窗 */}
      {showCreateRoom && (
        <div className="fixed inset-0 z-50">
          <CreateRoom onClose={() => setShowCreateRoom(false)} />
        </div>
      )}

      {/* 公告详情弹窗 */}
      {selectedAnnouncement && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedAnnouncement(null)}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div 
            className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5" style={{ color: PRIMARY_COLOR }} />
                <h3 className="font-bold text-gray-900">{t('messages.announcementDetail') || '公告详情'}</h3>
              </div>
              <button 
                onClick={() => setSelectedAnnouncement(null)}
                className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            {/* Content */}
            <div className="p-5">
              <div className="flex items-center gap-2 mb-3">
                {selectedAnnouncement.is_pinned && (
                  <span 
                    className="px-2 py-0.5 text-xs font-medium rounded-full"
                    style={{ backgroundColor: `${PRIMARY_COLOR}15`, color: PRIMARY_COLOR }}
                  >
                    {t('messages.pinned') || '置顶'}
                  </span>
                )}
              </div>
              
              <h4 className="text-lg font-bold text-gray-900 mb-3">
                {selectedAnnouncement.title}
              </h4>
              
              <div className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto">
                {selectedAnnouncement.content}
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-400">
                  {new Date(selectedAnnouncement.created_at).toLocaleDateString('zh-CN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
            
            {/* Footer */}
            <div className="px-5 pb-5">
              <button
                onClick={() => setSelectedAnnouncement(null)}
                className="w-full py-3 rounded-xl font-medium text-white"
                style={{ backgroundColor: PRIMARY_COLOR }}
              >
                {t('common.confirm') || '确定'}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}

export default Messages;
