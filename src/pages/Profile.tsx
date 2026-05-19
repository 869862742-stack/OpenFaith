import React, { useState, useEffect, useRef, useCallback, memo } from 'react';

import { Menu, Share2, QrCode, X, ChevronDown, ChevronUp, Users, Zap, Flame, Camera, Edit3, Crown, User, MessageCircle, Link, Shield, Star, Unlock, Lock, Eye, Download, ArrowUp, Gift, Palette, Check, UserMinus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Sidebar from '../components/Sidebar';
import BottomNav from '../components/BottomNav';
import PostDetailModal from '../components/PostDetailModal';
import { api } from '../utils/api';
import { useAuthStore } from '../stores/auth';
import { supabase } from '../supabase/client';
import { cachedFetch } from '../utils/apiCache';
import { filterOutGroupChats } from '../utils/postUtils';
import { getTagNames } from '../services/tagService';

const PRIMARY_COLOR = '#2563EB';

// ========== 通用函数：数量格式化（抖音风格） ==========
function formatCount(num: number): string {
  if (num < 10000) return String(num);
  const wan = num / 10000;
  if (wan < 10) {
    // 1W, 1.1W, 1.2W ... 9.9W
    return wan % 1 === 0 ? `${wan}W` : `${wan.toFixed(1)}W`;
  }
  // 10W, 11W ... 直接取整
  return `${Math.floor(wan)}W`;
}

// 使用 Supabase SDK 更新 profile
const updateProfileAPI = async (userId: string, data: Record<string, any>) => {
  console.log('[DEBUG] updateProfileAPI called:', { userId, dataLength: JSON.stringify(data).length });
  const { data: result, error } = await supabase
    .from('profiles')
    .update(data)
    .eq('user_id', userId)
    .select();
  
  if (error) {
    throw error;
  }
  return result;
};

const levelNames: { [key: number]: string } = {
  1: '探索者', 2: '追寻者', 3: '思辨者', 4: '笃行者', 5: '融通者',
  6: '守望者', 7: '觉悟者', 8: '至诚者', 9: '明达者', 10: '光明者',
};

// 等级阈值配置（严格按规则文件）
const LEVEL_THRESHOLDS = [0, 1000, 5000, 25000, 125000, 250000, 500000, 1000000, 2000000, 5000000];

// 等级权益配置（严格按规则文件）
const levelBenefits: { [key: number]: {
  groups: number;
  exposure_hours?: number;
  monthly_hot?: number;
  features: string[];
  badge?: string;
}} = {
  1: { groups: 0, features: ['基础功能'] },
  2: { groups: 1, features: ['可创建1个群聊'] },
  3: { groups: 1, exposure_hours: 2, features: ['曝光2小时（任选1篇）'] },
  4: { groups: 2, features: ['可创建2个群聊'] },
  5: { groups: 2, monthly_hot: 100, features: ['每月1日获得100热点'] },
  6: { groups: 3, features: ['编辑资料无限制'] },
  7: { groups: 3, monthly_hot: 200, features: ['每月1日获得200热点'] },
  8: { groups: 4, exposure_hours: 24, features: ['曝光24小时（任选1篇）'] },
  9: { groups: 5, monthly_hot: 300, features: ['每月1日获得300热点'] },
  10: { groups: 999, features: ['全部功能不受限制', '永久会员权益'], badge: '👑' },
};

// Fallback 身份标签
const FALLBACK_FAITH_TAGS = [
  '基督教', '伊斯兰教', '犹太教', '佛教', '印度教', '道教', '锡克教',
  '巴哈伊教', '摩门教', '耶和华见证人', '琐罗亚斯德教', '诺斯替',
  '卡巴拉', '神道教', '耆那教', '德鲁兹教', '约鲁巴教', '伏都教',
  '雅兹迪', '曼达安', '玛雅/阿兹特克', '毛利宗教', '天理教', '天道教',
  '高台教', '宗教研究者', '经文爱好者', '寻求者'
];

const mockNotes: any[] = [];
const mockPlans: any[] = [];
const mockCollections: any[] = [];

interface NoteData {
  id: string;
  title: string;
  content: string;
  cover_image?: string;
  images?: string[];
  tags?: string[];
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  created_at: string;
}

interface ProfileData {
  id: string;
  username: string;
  bio: string | null;
  faith_tag: string;
  avatar_url: string | null;
  background_url: string | null;
  level: number;
  experience: number;
  hot_points: number;
  heat_count: number;
  is_vip: boolean;
  is_animated_avatar: boolean;
  followers_count: number;
  following_count: number;
  tag_last_modified_at: string | null;
}

function Profile() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('notes');
  const [showShareModal, setShowShareModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const [user, setUser] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [userNotes, setUserNotes] = useState<NoteData[]>([]);
  const [favoritePosts, setFavoritePosts] = useState<any[]>([]);
  const [selectedPostIndex, setSelectedPostIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const [editUsername, setEditUsername] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editFaithTag, setEditFaithTag] = useState('');
  const [faithTags, setFaithTags] = useState<string[]>(FALLBACK_FAITH_TAGS);
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [showLevelBenefits, setShowLevelBenefits] = useState(false);
  const [groupsCreated, setGroupsCreated] = useState(0);

  // 隐私设置状态
  const [editAllowStrangerVisit, setEditAllowStrangerVisit] = useState(true);
  const [editAllowFriendVisit, setEditAllowFriendVisit] = useState(true);

  // 粉丝/关注列表相关状态
  const [followersList, setFollowersList] = useState<any[]>([]);
  const [followingList, setFollowingList] = useState<any[]>([]);
  const [loadingFollowers, setLoadingFollowers] = useState(false);
  const [loadingFollowing, setLoadingFollowing] = useState(false);

  // 获取粉丝列表（关注我的人）
  const fetchFollowers = useCallback(async (targetUserId: string) => {
    setLoadingFollowers(true);
    try {
      const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkaHdtZWl0dGdkb3Nta3h0cGFrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODEzMjQ5MiwiZXhwIjoyMDkzNzA4NDkyfQ.bPatiu7NXaE2k48aTkjAGQsba6NzXlIdq2k_gGLYLBE';
      const headers = { 'apikey': SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SERVICE_ROLE_KEY}` };

      // 查询 follows 表：获取关注此用户的所有 follower_id
      const followsRes = await cachedFetch(
        `/sb-api/rest/v1/follows?following_id=eq.${targetUserId}&select=follower_id,created_at&order=created_at.desc`,
        { headers }
      );

      if (!Array.isArray(followsRes) || followsRes.length === 0) {
        setFollowersList([]);
        return;
      }

      // 获取这些用户的信息
      const followerIds = followsRes.map((f: any) => f.follower_id);
      const profilesRes = await cachedFetch(
        `/sb-api/rest/v1/profiles?user_id=in.(${followerIds.join(',')})&select=user_id,username,nickname,avatar_url,faith_tag`,
        { headers }
      );

      if (!Array.isArray(profilesRes)) {
        setFollowersList([]);
        return;
      }

      // 合并数据
      const profilesMap: Record<string, any> = {};
      profilesRes.forEach((p: any) => { profilesMap[p.user_id] = p; });

      const mergedList = followsRes.map((f: any) => {
        const profile = profilesMap[f.follower_id] || {};
        return {
          user_id: f.follower_id,
          username: profile.username || profile.nickname || '用户',
          nickname: profile.nickname || profile.username || '用户',
          avatar_url: profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${f.follower_id}`,
          faith_tag: profile.faith_tag || '',
          followed_at: f.created_at,
        };
      });

      setFollowersList(mergedList);
    } catch (e) {
      console.error('[Profile] fetchFollowers error:', e);
      setFollowersList([]);
    } finally {
      setLoadingFollowers(false);
    }
  }, []);

  // 获取关注列表（我关注的人）
  const fetchFollowing = useCallback(async (targetUserId: string) => {
    setLoadingFollowing(true);
    try {
      const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkaHdtZWl0dGdkb3Nta3h0cGFrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODEzMjQ5MiwiZXhwIjoyMDkzNzA4NDkyfQ.bPatiu7NXaE2k48aTkjAGQsba6NzXlIdq2k_gGLYLBE';
      const headers = { 'apikey': SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SERVICE_ROLE_KEY}` };

      // 查询 follows 表：获取此用户关注的所有 following_id
      const followsRes = await cachedFetch(
        `/sb-api/rest/v1/follows?follower_id=eq.${targetUserId}&select=following_id,created_at&order=created_at.desc`,
        { headers }
      );

      if (!Array.isArray(followsRes) || followsRes.length === 0) {
        setFollowingList([]);
        return;
      }

      // 获取这些用户的信息
      const followingIds = followsRes.map((f: any) => f.following_id);
      const profilesRes = await cachedFetch(
        `/sb-api/rest/v1/profiles?user_id=in.(${followingIds.join(',')})&select=user_id,username,nickname,avatar_url,faith_tag`,
        { headers }
      );

      if (!Array.isArray(profilesRes)) {
        setFollowingList([]);
        return;
      }

      // 合并数据
      const profilesMap: Record<string, any> = {};
      profilesRes.forEach((p: any) => { profilesMap[p.user_id] = p; });

      const mergedList = followsRes.map((f: any) => {
        const profile = profilesMap[f.following_id] || {};
        return {
          user_id: f.following_id,
          username: profile.username || profile.nickname || '用户',
          nickname: profile.nickname || profile.username || '用户',
          avatar_url: profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${f.following_id}`,
          faith_tag: profile.faith_tag || '',
          followed_at: f.created_at,
        };
      });

      setFollowingList(mergedList);
    } catch (e) {
      console.error('[Profile] fetchFollowing error:', e);
      setFollowingList([]);
    } finally {
      setLoadingFollowing(false);
    }
  }, []);

  // 取消关注
  const handleUnfollow = useCallback(async (targetUserId: string) => {
    try {
      const currentUserId = user?.id;
      if (!currentUserId) return;

      const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkaHdtZWl0dGdkb3Nta3h0cGFrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODEzMjQ5MiwiZXhwIjoyMDkzNzA4NDkyfQ.bPatiu7NXaE2k48aTkjAGQsba6NzXlIdq2k_gGLYLBE';
      
      // 删除关注关系
      const res = await fetch(
        `/sb-api/rest/v1/follows?follower_id=eq.${currentUserId}&following_id=eq.${targetUserId}`,
        {
          method: 'DELETE',
          headers: {
            'apikey': SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          }
        }
      );

      if (res.ok) {
        // 从列表中移除
        setFollowingList(prev => prev.filter(item => item.user_id !== targetUserId));
        // 更新当前用户的关注数
        setProfile(prev => prev ? { ...prev, following_count: (prev.following_count || 1) - 1 } : prev);
        // 更新对方的粉丝数
        await fetch(`/sb-api/rest/v1/profiles/user_id=eq.${targetUserId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({ followers_count: supabase.rpc('decrement', { x: 1, row_id: targetUserId }) })
        }).catch(() => {});
      }
    } catch (e) {
      console.error('[Profile] handleUnfollow error:', e);
    }
  }, [user?.id]);

  // 打开粉丝列表弹窗时获取数据
  useEffect(() => {
    if (showFollowers && user?.id) {
      fetchFollowers(user.id);
    }
  }, [showFollowers, user?.id, fetchFollowers]);

  // 打开关注列表弹窗时获取数据
  useEffect(() => {
    if (showFollowing && user?.id) {
      fetchFollowing(user.id);
    }
  }, [showFollowing, user?.id, fetchFollowing]);

  // 加载身份标签
  useEffect(() => {
    const loadTags = async () => {
      try {
        const tags = await getTagNames('identity');
        if (tags && tags.length > 0) {
          setFaithTags(tags);
        }
      } catch (error) {
        console.error('Failed to load identity tags:', error);
      }
    };
    loadTags();
  }, []);

  // 页面获得焦点时刷新 profile（确保经验值等数据最新）
  useEffect(() => {
    const handleFocus = () => {
      if (user?.id) {
        console.log('[Profile] 页面获得焦点，刷新用户资料');
        refreshProfile();
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [user?.id, refreshProfile]);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);

  // 获取用户的笔记 - 使用 fetch 直连加速（带缓存）
  const fetchUserNotes = useCallback(async (userId: string) => {
    try {
      const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkaHdtZWl0dGdkb3Nta3h0cGFrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODEzMjQ5MiwiZXhwIjoyMDkzNzA4NDkyfQ.bPatiu7NXaE2k48aTkjAGQsba6NzXlIdq2k_gGLYLBE';
      const headers = { 'apikey': SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SERVICE_ROLE_KEY}` };

      const data = await cachedFetch(
        `/sb-api/rest/v1/posts?user_id=eq.${userId}&select=id,title,content,cover_image,images,tags,status,created_at,likes_count,heat_count,comments_count,views_count,shares_count,favorites_count&order=created_at.desc&limit=50`,
        { headers }
      );

      if (Array.isArray(data) && data.length > 0) {
        // 前端过滤：排除群聊记录
        const filteredData = filterOutGroupChats(data);
        setUserNotes(filteredData.map((n: any) => ({
          ...n,
          status: n.status === 'published' ? 'approved' : n.status,
          cover_image: n.cover_image || '',
        })));
      } else {
        setUserNotes([]);
      }
    } catch (e) {
      console.error('Failed to fetch notes:', e);
      setUserNotes([]);
    }
  }, []);

  // 获取收藏的笔记（从 Supabase favorites 表查询）
  const fetchFavoritePosts = useCallback(async () => {
    try {
      const auth = useAuthStore.getState();
      const userId = auth.userInfo?.id;
      if (!userId) {
        setFavoritePosts([]);
        return;
      }

      const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkaHdtZWl0dGdkb3Nta3h0cGFrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODEzMjQ5MiwiZXhwIjoyMDkzNzA4NDkyfQ.bPatiu7NXaE2k48aTkjAGQsba6NzXlIdq2k_gGLYLBE';
      const headers = { 'apikey': SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SERVICE_ROLE_KEY}` };

      // 1. 查询 favorites 表获取 post_id 列表
      const favRes = await cachedFetch(
        `/sb-api/rest/v1/favorites?user_id=eq.${userId}&select=post_id,created_at&order=created_at.desc`,
        { headers }
      );
      if (!Array.isArray(favRes) || favRes.length === 0) {
        setFavoritePosts([]);
        // 同时清空 localStorage
        localStorage.setItem('of_favorites', JSON.stringify([]));
        return;
      }
      const postIds = favRes.map((f: any) => f.post_id);

      // 同时更新 localStorage 保持同步
      localStorage.setItem('of_favorites', JSON.stringify(postIds));

      // 2. 查询 posts 表获取笔记详情
      const data = await cachedFetch(
        `/sb-api/rest/v1/posts?id=in.(${postIds.join(',')})&select=id,title,content,cover_image,images,tags,user_id,likes_count,heat_count,comments_count,created_at&status=eq.published`,
        { headers }
      );

      if (Array.isArray(data) && data.length > 0) {
        // 还要获取作者信息
        const userIds = [...new Set(data.map((p: any) => p.user_id).filter(Boolean))];
        const profilesMap: Record<string, any> = {};
        if (userIds.length > 0) {
          const profilesData = await cachedFetch(
            `/sb-api/rest/v1/profiles?user_id=in.(${userIds.join(',')})&select=user_id,nickname,username,avatar_url,faith_tag`,
            { headers }
          );
          if (Array.isArray(profilesData)) {
            profilesData.forEach((p: any) => { profilesMap[p.user_id] = p; });
          }
        }
        setFavoritePosts(data.map((p: any) => {
          const authorProfile = profilesMap[p.user_id] || {};
          return {
            id: p.id,
            title: p.title,
            content: p.content || '',
            coverImage: p.cover_image || '',
            images: p.images || [],
            tags: p.tags || [],
            user_id: p.user_id || '',
            likes_count: p.likes_count || 0,
            heat_count: p.heat_count || 0,
            comments_count: p.comments_count || 0,
            created_at: p.created_at,
            author: {
              id: authorProfile.user_id || p.user_id,
              username: authorProfile.username || authorProfile.nickname || '用户',
              nickname: authorProfile.nickname || authorProfile.username || '用户',
              avatar: authorProfile.avatar_url || '',
              avatar_url: authorProfile.avatar_url || '',
              faith_tag: authorProfile.faith_tag || '寻求者',
              faithTag: authorProfile.faith_tag || '寻求者',
            },
          };
        }));
      } else {
        setFavoritePosts([]);
      }
    } catch (e) {
      console.error('Failed to fetch favorites:', e);
      setFavoritePosts([]);
    }
  }, []);

  useEffect(() => {
    const fetchUserAndProfile = async () => {
      try {
        // 使用 auth store 获取用户信息，避免直接调用 supabase.auth.getSession()
        const authStore = useAuthStore.getState();
        const userId = authStore.userInfo?.id;
        const token = authStore.currentToken();
        
        if (!userId || !token) {
          console.log('[Profile] No user info from auth store, trying session...');
          // 1. 尝试从 Supabase session 获取
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
              const sessionUser = session.user;
              setUser(sessionUser as any);
              setIsAuthenticated(true);
              // 获取 profile
              const { data: profileData } = await supabase
                .from('profiles')
                .select('*')
                .eq('user_id', sessionUser.id)
                .maybeSingle();
              if (profileData) {
                setProfile(profileData);
                setEditUsername(profileData.nickname || profileData.username || '');
                setEditBio(profileData.bio || '');
                setEditFaithTag(profileData.faith_tag || '寻求者');
              } else {
                // Profile 不存在，自动创建（兼容老用户）
                console.log('[Profile] Profile not found, auto-creating...');
                const username = sessionUser.user_metadata?.username || 
                                 sessionUser.email?.split('@')[0] || 
                                 '用户' + sessionUser.id.slice(0, 8);
                const nickname = sessionUser.user_metadata?.nickname || '';
                const faithTag = sessionUser.user_metadata?.faith_tag || '寻求者';
                const { data: newProfile, error: createError } = await supabase
                  .from('profiles')
                  .insert({
                    user_id: sessionUser.id,
                    email: sessionUser.email,
                    username: username,
                    nickname: nickname,
                    faith_tag: faithTag,
                    hot_points: 5,
                    avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${sessionUser.id}`,
                    background_url: '',
                    bio: '',
                    level: 1,
                    experience: 0,
                    is_vip: false,
                    is_animated_avatar: false,
                    followers_count: 0,
                    following_count: 0,
                    likes_count: 0
                  })
                  .select()
                  .single();
                if (createError) {
                  console.error('[Profile] Auto-create profile failed:', createError);
                } else if (newProfile) {
                  console.log('[Profile] Profile auto-created successfully');
                  setProfile(newProfile);
                  setEditUsername(newProfile.nickname || newProfile.username || '');
                  setEditBio(newProfile.bio || '');
                  setEditFaithTag(newProfile.faith_tag || '寻求者');
                }
              }
              // 获取笔记
              fetchUserNotes(sessionUser.id);
              fetchFavoritePosts();
              setLoading(false);
              return;
            }
          } catch (sessionErr) {
            console.error('[Profile] Session fetch error:', sessionErr);
          }
          
          // 2. 尝试从 localStorage 读取 user_info
          const savedUserInfo = localStorage.getItem('user_info');
          if (savedUserInfo) {
            try {
              const parsed = JSON.parse(savedUserInfo);
              const localUser = {
                id: parsed.id || 'local_user',
                email: parsed.email || '',
                user_metadata: parsed
              };
              setUser(localUser as any);
              setIsAuthenticated(false);
              setLoading(false);
              return;
            } catch (e) {
              console.error('[Profile] Parse user_info error:', e);
            }
          }
          
          // 3. 都没有则跳转到登录页（Profile 页面需要登录才能访问）
          console.log('[Profile] No user found, redirecting to login');
          window.location.hash = '/login';
          setLoading(false);
          return;
        }
        
        // 构建用户对象
        const mockUser = {
          id: userId,
          email: authStore.userInfo?.email || '',
          user_metadata: authStore.userInfo
        };
        setUser(mockUser as any);
        
        // 使用 Supabase SDK 获取 profile（自动处理 token 刷新）
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();
          
          if (error) {
            console.error('[Profile] Fetch profile error:', error);
            throw error;
          }
          
          console.log('[Profile] Profile data:', data);
          if (data) {
            setProfile(data);
            console.log('[Profile] setProfile called with:', data);
            setEditUsername(data.nickname || data.username || '');
            setEditBio(data.bio || '');
            setEditFaithTag(data.faith_tag || '寻求者');
            setEditAllowStrangerVisit(data.allow_stranger_visit !== false);
            setEditAllowFriendVisit(data.allow_friend_visit !== false);
            setProfileError(null); // 清除错误
            console.log('[Profile] Profile loaded successfully');
          } else {
            // Profile 不存在，自动创建
            console.warn('[Profile] Profile not found for userId:', userId);
            const username = authStore.userInfo?.username || 
                             authStore.userInfo?.name || 
                             authStore.userInfo?.email?.split('@')[0] || 
                             '用户' + userId.slice(0, 8);
            const nickname = authStore.userInfo?.nickname || '';
            const faithTag = authStore.userInfo?.faith_tag || '寻求者';
            
            const { data: newProfile, error: createError } = await supabase
              .from('profiles')
              .insert({
                user_id: userId,
                email: authStore.userInfo?.email || '',
                username: username,
                nickname: nickname,
                faith_tag: faithTag,
                hot_points: 5,
                avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`,
                background_url: '',
                bio: '',
                level: 1,
                experience: 0,
                is_vip: false,
                is_animated_avatar: false,
                followers_count: 0,
                following_count: 0,
                likes_count: 0
              })
              .select()
              .single();
            
            if (createError) {
              console.error('[Profile] Auto-create profile failed:', createError);
              setProfileError('用户资料不存在，请重新登录或联系客服');
              alert('用户资料不存在，请重新登录');
            } else if (newProfile) {
              console.log('[Profile] Profile auto-created successfully');
              setProfile(newProfile);
              setEditUsername(newProfile.nickname || newProfile.username || '');
              setEditBio(newProfile.bio || '');
              setEditFaithTag(newProfile.faith_tag || '寻求者');
            }
          }
        } catch (e: any) {
          console.error('[Profile] Failed to fetch profile:', e);
          setProfileError('获取用户资料失败: ' + (e.message || '未知错误'));
          alert('获取用户资料失败，请稍后重试');
        }
        
        // 获取用户的笔记
        fetchUserNotes(userId);
        // 获取收藏的笔记
        fetchFavoritePosts();
      } catch (err) {
        console.error('[Profile] fetchUserAndProfile error:', err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    fetchUserAndProfile();
  }, [fetchUserNotes, fetchFavoritePosts]);

  // 使用 useCallback 包裹，避免重复创建导致子组件重渲染
  const updateProfile = useCallback(async (updates: Partial<ProfileData>) => {
    console.log('[Profile] updateProfile called:', { 
      userId: user?.id, 
      updates: Object.keys(updates),
      updateKeys: JSON.stringify(updates).substring(0, 100)
    });
    
    // 调试：打印当前 session 和 token
    console.log('[Profile] updateProfile - debugging token...');
    try {
      // 检查 localStorage 中的所有 token 相关 keys
      const localStorageKeys = Object.keys(localStorage);
      const tokenKeys = localStorageKeys.filter(k => k.includes('token') || k.includes('auth') || k.includes('user'));
      console.log('[Profile] updateProfile - localStorage token keys:', tokenKeys);
      
      const localToken = localStorage.getItem('user_token');
      const adminToken = localStorage.getItem('openfaith_admin_token');
      const sbAuth = localStorage.getItem('sb_auth');
      console.log('[Profile] updateProfile - token status:', {
        user_token: localToken ? `found (length=${localToken.length})` : 'null',
        openfaith_admin_token: adminToken ? `found (length=${adminToken.length})` : 'null',
        sb_auth: sbAuth ? `found (length=${sbAuth.length})` : 'null'
      });
      
      // 检查 Supabase session
      const { data: { session } } = await supabase.auth.getSession();
      console.log('[Profile] updateProfile - Supabase session:', {
        hasSession: !!session,
        hasToken: !!session?.access_token,
        tokenLength: session?.access_token?.length || 0,
        userId: session?.user?.id
      });
    } catch (e) {
      console.warn('[Profile] updateProfile - token debug error:', e);
    }
    
    if (!user) {
      console.log('[Profile] updateProfile: 用户未登录');
      return { error: new Error('Not authenticated') };
    }
    try {
      console.log('[Profile] updateProfile: 开始调用 API...', { userId: user.id });
      console.log('[Profile] updateProfile: API endpoint:', `profiles?user_id=eq.${user.id}`);
      console.log('[Profile] updateProfile: request data:', JSON.stringify(updates).substring(0, 200));
      
      const result = await updateProfileAPI(user.id, updates);
      console.log('[Profile] updateProfile: API 返回结果:', result);
      
      // 检查结果是否表示 "Profile not found"
      if (result && result.length === 0) {
        console.warn('[Profile] updateProfile: API returned empty array - Profile may not exist');
        return { error: new Error('用户资料不存在，请重新登录'), notFound: true };
      }
      
      return { error: null };
    } catch (e: any) {
      console.error('[Profile] updateProfile error:', e);
      
      // 特殊处理 "Profile not found" 错误
      const errorMessage = e.message || '';
      if (
        errorMessage.toLowerCase().includes('not found') ||
        errorMessage.includes('404') ||
        errorMessage.includes('Profile') && errorMessage.includes('not')
      ) {
        console.error('[Profile] updateProfile: Profile not found - user may need to re-login');
        return { error: new Error('用户资料不存在，请重新登录'), notFound: true };
      }
      
      return { error: new Error(e.message) };
    }
  }, [user?.id]);

  const refreshProfile = useCallback(async () => {
    if (!user) {
      console.log('[Profile] refreshProfile: 用户未登录，跳过');
      return;
    }
    try {
      console.log('[Profile] refreshProfile: 获取用户资料, userId:', user.id);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      console.log('[Profile] refreshProfile: SDK 返回数据:', { hasData: !!data, error: error?.message });
      if (data) {
        setProfile(data);
        console.log('[Profile] refreshProfile: 已更新 profile state');
      } else {
        console.log('[Profile] refreshProfile: 未找到用户资料');
      }
    } catch (e) {
      console.error('[Profile] refreshProfile error:', e);
    }
  }, [user?.id]);

  const canEditFaithTag = useCallback(() => {
    if (!profile?.tag_last_modified_at) return true;
    const lastModified = new Date(profile.tag_last_modified_at);
    const now = new Date();
    const diffDays = (now.getTime() - lastModified.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays >= 30;
  }, [profile?.tag_last_modified_at]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-color)' }}>
        <div className="animate-spin w-8 h-8 border-2 border-current border-t-transparent rounded-full" style={{ color: PRIMARY_COLOR }} />
      </div>
    );
  }

  // 未登录时显示游客状态（不拦截页面显示）
  const effectiveUser = user || { id: 'guest', email: '', user_metadata: {} };

  const displayName = profile?.nickname || profile?.username || t('profile.notSet');
  const displayTag = profile?.role === 'admin' || profile?.role === 'super_admin' 
    ? t('profile.admin') 
    : (profile?.faith_tag || '');
  const displayBio = profile?.bio || t('profile.defaultBio');
  const avatarUrl = profile?.avatar || profile?.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default';
  const bgUrl = profile?.background || profile?.background_url || '';
  const userId = user?.id || profile?.id || '00000001';
  // 显示短ID：优先用 username（8位显示ID），否则取 UUID 前8位
  const displayId = profile?.username || userId.slice(0, 8);
  const level = profile?.level || 1;
  const experience = profile?.experience || 0;
  // 计算到下一级需要的经验
  const currentLevelThreshold = LEVEL_THRESHOLDS[level - 1] || 0;
  const nextLevelThreshold = LEVEL_THRESHOLDS[level] || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  const expForCurrentLevel = experience - currentLevelThreshold;
  const expNeededForNextLevel = nextLevelThreshold - currentLevelThreshold;
  const expProgress = expNeededForNextLevel > 0 ? Math.min((expForCurrentLevel / expNeededForNextLevel) * 100, 100) : 100;
  const hotPoints = profile?.hot_points || 0;
  
  // ========== 热值计算公式 ==========
  // 热值 = Σ(每篇笔记的 (浏览数×0.5) + (加热数×5) + (评论数×2) + (分享数×3) + (收藏数×2))
  const calculateNoteHotValue = (note: any): number => {
    const views = note.views_count || 0;
    const heat = note.heat_count || 0;
    const comments = note.comments_count || 0;
    const shares = note.shares_count || 0;
    const favorites = note.favorites_count || 0;
    return (views * 0.5) + (heat * 5) + (comments * 2) + (shares * 3) + (favorites * 2);
  };
  
  const heatCount = userNotes.reduce((sum: number, n: any) => sum + calculateNoteHotValue(n), 0);
  const isVip = profile?.is_vip || false;
  const isAnimatedAvatar = profile?.is_animated_avatar || false;

  const handleShare = async (type: string) => {
    if (type === 'copy') {
      // 复制用户主页链接
      navigator.clipboard.writeText(`${window.location.origin}/user/${userId}`);
      alert(t('share.linkCopied'));
    } else if (type === 'friend' || type === 'group' || type === 'wechat') {
      // 这些是实际分享，需要生成分享链接
      try {
        const shareUrl = `${window.location.origin}/share/${userId}`;
        if (navigator.share) {
          // 尝试使用原生分享 API
          await navigator.share({
            title: profile?.nickname || 'OpenFaith',
            text: profile?.bio || '来 OpenFaith 看看我的主页吧！',
            url: shareUrl
          });
        } else {
          // 降级到复制链接
          navigator.clipboard.writeText(shareUrl);
          alert(t('share.linkCopied'));
        }
      } catch (e) {
        // 用户取消分享时静默处理
        if ((e as Error).name !== 'AbortError') {
          navigator.clipboard.writeText(`${window.location.origin}/user/${userId}`);
          alert(t('share.linkCopied'));
        }
      }
    }
    setShowShareModal(false);
  };

  // 压缩并返回 base64 图片（纯 base64 方案，无 Storage 服务）
  // 如果 base64 超过 maxSizeKB，则继续降低质量直到满足要求
  const compressToBase64 = (
    file: File, 
    bucket: 'avatars' | 'backgrounds'
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // 根据类型设置最大尺寸
          const maxSize = bucket === 'avatars' ? 200 : 600;
          // base64 最大限制：头像 80KB，背景 150KB
          const maxBase64Size = bucket === 'avatars' ? 80 * 1024 : 150 * 1024;
          
          let { width, height } = img;
          
          // 缩放图片尺寸
          if (width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          }
          if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
          
          // 逐步降低质量直到满足大小限制
          const compressWithQuality = (quality: number): string => {
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              reject(new Error('Failed to get canvas context'));
              return '';
            }
            ctx.drawImage(img, 0, 0, width, height);
            const base64 = canvas.toDataURL('image/jpeg', quality);
            
            // 如果还是太大且质量还可以降低，继续压缩
            if (base64.length > maxBase64Size && quality > 0.3) {
              return compressWithQuality(quality - 0.1);
            }
            
            return base64;
          };
          
          // 从 0.85 开始压缩
          const result = compressWithQuality(0.85);
          if (result) {
            resolve(result);
          }
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  // 获取 base64 字符串（纯 base64 方案）
  const getBase64Image = async (
    file: File, 
    bucket: 'avatars' | 'backgrounds'
  ): Promise<string | null> => {
    try {
      return await compressToBase64(file, bucket);
    } catch (err) {
      console.error('[Image] Compress error:', err);
      return null;
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!user) {
      alert(t('common.pleaseLogin'));
      return;
    }

    // 验证图片
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      alert('仅支持 JPG、PNG、GIF、WebP 格式');
      return;
    }

    if (isAnimatedAvatar && file.type !== 'image/gif') {
      alert(t('profile.animatedAvatar'));
      return;
    }

    // 限制文件大小（最大 5MB）
    if (file.size > 5 * 1024 * 1024) {
      alert('图片大小不能超过 5MB');
      return;
    }

    console.log('[Avatar] 开始上传:', { fileName: file.name, fileSize: file.size, fileType: file.type });

    try {
      // 压缩图片
      const base64Url = await getBase64Image(file, 'avatars');
      if (!base64Url) {
        alert('图片处理失败，请重试');
        return;
      }
      console.log('[Avatar] Base64 图片生成成功, length:', base64Url.length);

      // 直接使用 Supabase SDK 保存（自动处理 token 刷新）
      console.log('[Avatar] 使用 Supabase SDK 保存到数据库...');
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: base64Url })
        .eq('user_id', user.id);
      
      if (error) {
        console.error('[Avatar] updateProfile 失败:', error);
        alert('更换头像失败: ' + error.message);
      } else {
        console.log('[Avatar] updateProfile 成功，刷新页面...');
        await refreshProfile();
        alert(t('profile.changeAvatar'));
      }

      // 尝试上传到 Storage（可选，失败不影响主流程）
      try {
        const response = await fetch(base64Url);
        const blob = await response.blob();
        const fileName = `avatar_${user.id}_${Date.now()}.jpg`;
        
        console.log('[Avatar] 尝试上传到 Storage:', fileName);
        const { error: uploadError, data: uploadData } = await supabase.storage
          .from('avatars')
          .upload(fileName, blob, { upsert: true });

        if (uploadError) {
          console.warn('[Avatar] Storage 上传失败（不影响）:', uploadError.message);
        } else {
          console.log('[Avatar] Storage 上传成功:', uploadData);
          const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(fileName);
          console.log('[Avatar] Storage 公开URL:', publicUrl);
          
          // 如果 Storage 成功，用 Storage URL 更新
          await supabase
            .from('profiles')
            .update({ avatar_url: publicUrl })
            .eq('user_id', user.id);
          await refreshProfile();
        }
      } catch (storageError) {
        console.warn('[Avatar] Storage 操作异常（不影响）:', storageError);
      }
      
    } catch (err: any) {
      console.error('[Avatar] 上传错误:', err);
      alert('更换头像失败: ' + (err.message || '未知错误'));
    }
    
    // 清空 input
    if (avatarInputRef.current) {
      avatarInputRef.current.value = '';
    }
  };

  const handleBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!user) {
      alert(t('common.pleaseLogin'));
      return;
    }

    // 验证图片
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      alert('仅支持 JPG、PNG、GIF、WebP 格式');
      return;
    }

    // 限制文件大小（最大 10MB）
    if (file.size > 10 * 1024 * 1024) {
      alert('图片大小不能超过 10MB');
      return;
    }

    console.log('[Background] 开始上传:', { fileName: file.name, fileSize: file.size, fileType: file.type });

    try {
      // 压缩图片
      const base64Url = await getBase64Image(file, 'backgrounds');
      if (!base64Url) {
        alert('图片处理失败，请重试');
        return;
      }
      console.log('[Background] Base64 图片生成成功, length:', base64Url.length);

      // 直接使用 Supabase SDK 保存（自动处理 token 刷新）
      console.log('[Background] 使用 Supabase SDK 保存到数据库...');
      const { error: bgError } = await supabase
        .from('profiles')
        .update({ background_url: base64Url })
        .eq('user_id', user.id);
      
      if (bgError) {
        console.error('[Background] updateProfile 失败:', bgError);
        alert('更换背景失败: ' + bgError.message);
      } else {
        console.log('[Background] updateProfile 成功，刷新页面...');
        await refreshProfile();
        alert(t('profile.changeBg'));
      }

      // 尝试上传到 Storage（可选，失败不影响主流程）
      try {
        const response = await fetch(base64Url);
        const blob = await response.blob();
        const fileName = `bg_${user.id}_${Date.now()}.jpg`;
        
        console.log('[Background] 尝试上传到 Storage:', fileName);
        const { error: uploadError, data: uploadData } = await supabase.storage
          .from('backgrounds')
          .upload(fileName, blob, { upsert: true });

        if (uploadError) {
          console.warn('[Background] Storage 上传失败（不影响）:', uploadError.message);
        } else {
          console.log('[Background] Storage 上传成功:', uploadData);
          const { data: { publicUrl } } = supabase.storage
            .from('backgrounds')
            .getPublicUrl(fileName);
          console.log('[Background] Storage 公开URL:', publicUrl);
          
          // 如果 Storage 成功，用 Storage URL 更新
          await supabase
            .from('profiles')
            .update({ background_url: publicUrl })
            .eq('user_id', user.id);
          await refreshProfile();
        }
      } catch (storageError) {
        console.warn('[Background] Storage 操作异常（不影响）:', storageError);
      }
      
    } catch (err: any) {
      console.error('[Background] 上传错误:', err);
      alert('更换背景失败: ' + (err.message || '未知错误'));
    }
    
    // 清空 input
    if (bgInputRef.current) {
      bgInputRef.current.value = '';
    }
  };

  const handleSaveProfile = async () => {
    if (!editUsername) {
      alert(t('profile.nicknameRequired') || '昵称不能为空');
      return;
    }

    const canEdit = canEditFaithTag();
    if (editFaithTag !== profile?.faith_tag && !canEdit) {
      alert(t('profile.tagModifyLimit'));
      return;
    }

    setIsSaving(true);
    console.log('[Profile] handleSaveProfile 开始保存:', { nickname: editUsername, bio: editBio, faithTag: editFaithTag });
    const updates: any = { 
      nickname: editUsername, 
      bio: editBio,
      allow_stranger_visit: editAllowStrangerVisit,
      allow_friend_visit: editAllowFriendVisit,
    };
    if (editFaithTag !== profile?.faith_tag) {
      updates.faith_tag = editFaithTag;
      updates.tag_last_modified_at = new Date().toISOString();
    }
    console.log('[Profile] 准备更新字段:', Object.keys(updates));

    // 使用 Supabase SDK（自动处理 token 刷新）
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('user_id', user?.id);
    console.log('[Profile] updateProfile 结果:', error);
    setIsSaving(false);

    if (error) {
      alert(t('common.save') + ' ' + t('errors.failed') + ': ' + error.message);
    } else {
      console.log('[Profile] 保存成功，刷新数据...');
      await refreshProfile();
      setShowEditModal(false);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'notes':
        return (
          <div className="grid grid-cols-2 gap-3 p-4">
            {userNotes.map((note) => (
              <div
                key={note.id}
                className="relative aspect-[3/4] rounded-xl overflow-hidden cursor-pointer"
                onClick={() => setSelectedPostIndex(userNotes.indexOf(note))}
                style={{ backgroundColor: 'var(--bg-secondary)' }}
              >
                <img 
                  src={note.cover_image || 'https://picsum.photos/300/400'} 
                  alt="" 
                  className="w-full h-full object-cover" 
                />
                {/* 审核状态标签 */}
                {note.status === 'pending' && (
                  <div className="absolute top-2 left-2 px-2 py-1 bg-yellow-500/90 text-white text-xs rounded-full flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {t('notes.pending') || '审核中'}
                  </div>
                )}
                {note.status === 'rejected' && (
                  <div className="absolute top-2 left-2 px-2 py-1 bg-red-500/90 text-white text-xs rounded-full flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    {t('notes.rejected') || '未通过'}
                    {note.rejection_reason && <span className="text-[10px]">: {note.rejection_reason}</span>}
                  </div>
                )}
                {note.status === 'approved' && (
                  <div className="absolute top-2 left-2 px-2 py-1 bg-green-500/90 text-white text-xs rounded-full flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {t('notes.published') || '已发布'}
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
                  <p className="text-white text-xs truncate">{note.title}</p>
                </div>
              </div>
            ))}
            {userNotes.length === 0 && (
              <div className="col-span-2 text-center py-12">
                <p style={{ color: 'var(--text-secondary)' }}>{t('common.empty')}</p>
              </div>
            )}
          </div>
        );
      case 'plans':
        return (
          <div className="p-4 space-y-3">
            {mockPlans.map((plan) => (
              <div
                key={plan.id}
                className="rounded-xl p-4 border theme-transition"
                style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}
              >
                <h3 className="font-medium mb-2" style={{ color: 'var(--text-color)' }}>{plan.title}</h3>
                <div className="flex items-center gap-2">
                  <div
                    className="flex-1 h-2 rounded-full overflow-hidden"
                    style={{ backgroundColor: 'var(--bg-secondary)' }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${(plan.progress / plan.total) * 100}%`, backgroundColor: PRIMARY_COLOR }}
                    />
                  </div>
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{plan.progress}/{plan.total}{t('learn.day') || '天'}</span>
                </div>
              </div>
            ))}
            {mockPlans.length === 0 && (
              <div className="text-center py-12">
                <p style={{ color: 'var(--text-secondary)' }}>{t('common.empty')}</p>
              </div>
            )}
          </div>
        );
      case 'collections':
        return (
          <div className="grid grid-cols-2 gap-3 p-4">
            {favoritePosts.map((post) => (
              <div
                key={post.id}
                className="relative aspect-[3/4] rounded-xl overflow-hidden cursor-pointer"
                onClick={() => setSelectedPostIndex(favoritePosts.indexOf(post))}
                style={{ backgroundColor: 'var(--bg-secondary)' }}
              >
                <img src={post.cover_image || 'https://picsum.photos/300/400'} alt="" className="w-full h-full object-cover" />
                <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
                  <p className="text-white text-xs truncate">{post.title}</p>
                </div>
              </div>
            ))}
            {favoritePosts.length === 0 && (
              <div className="col-span-2 text-center py-12">
                <p style={{ color: 'var(--text-secondary)' }}>暂无珍藏</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>浏览笔记时点击⭐即可收藏</p>
              </div>
            )}
          </div>
        );
      default: return null;
    }
  };

  return (
    <div
      className="min-h-screen pb-20 theme-transition"
      style={{ backgroundColor: 'var(--bg-color)' }}
    >
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div
        className="relative h-48 cursor-pointer overflow-hidden"
        style={{ backgroundColor: 'var(--bg-secondary)' }}
        onClick={() => bgInputRef.current?.click()}
      >
        {bgUrl && <img src={bgUrl} alt="" className="w-full h-full object-cover" />}
        <button
          onClick={(e) => { e.stopPropagation(); setSidebarOpen(true); }}
          className="absolute top-4 left-4 w-10 h-10 rounded-full flex items-center justify-center shadow-md"
          style={{ backgroundColor: 'rgba(255,255,255,0.8)' }}
        >
          <Menu className="w-5 h-5" style={{ color: 'var(--text-color)' }} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); setShowShareModal(true); }}
          className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center shadow-md"
          style={{ backgroundColor: 'rgba(255,255,255,0.8)' }}
        >
          <Share2 className="w-5 h-5" style={{ color: 'var(--text-color)' }} />
        </button>
        <input ref={bgInputRef} type="file" accept="image/*" className="hidden" onChange={handleBgUpload} />
      </div>

      <div className="relative -mt-12 mx-auto" style={{ width: '96px' }}>
        <div
          className={`w-24 h-24 rounded-full border-4 shadow-lg overflow-hidden cursor-pointer relative mx-auto ${isVip && isAnimatedAvatar ? 'ring-2 ring-offset-2' : ''}`}
          style={{
            borderColor: 'var(--card-bg)',
            backgroundColor: 'var(--bg-secondary)',
          }}
          onClick={() => avatarInputRef.current?.click()}
        >
          <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
          <div
            className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
            style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}
          >
            <Camera className="w-6 h-6 text-white" />
          </div>
          {isVip && (
            <div
              className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center shadow-md"
              style={{ backgroundColor: PRIMARY_COLOR }}
            >
              <Crown className="w-3.5 h-3.5 text-white" />
            </div>
          )}
        </div>
        <input ref={avatarInputRef} type="file" accept={isAnimatedAvatar ? "image/gif" : "image/*"} className="hidden" onChange={handleAvatarUpload} />
      </div>

      <div className="px-4 pt-4 text-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          <h1 className="text-xl font-bold" style={{ color: PRIMARY_COLOR }}>{displayName}</h1>
          {displayTag && (
            <span
              className="px-2 py-0.5 text-xs rounded-full flex items-center gap-1"
              style={{
                backgroundColor: `${PRIMARY_COLOR}15`,
                color: PRIMARY_COLOR,
              }}
            >
              {profile?.is_vip && (
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M5 16L3 5L8.5 10L12 4L15.5 10L21 5L19 16H5M19 19C19 19.6 18.6 20 18 20H6C5.4 20 5 19.6 5 19V18H19V19Z"/>
                </svg>
              )}
              {displayTag}
            </span>
          )}
        </div>

        <div className="flex items-center justify-center gap-2 mb-4">
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>ID: {displayId}</span>
          <button
            onClick={() => setShowQRModal(true)}
            className="p-1 rounded"
            style={{ backgroundColor: 'var(--bg-secondary)' }}
          >
            <QrCode className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
          </button>
          <button
            onClick={() => setShowEditModal(true)}
            className="w-7 h-7 rounded-full border flex items-center justify-center"
            style={{ borderColor: PRIMARY_COLOR, color: PRIMARY_COLOR }}
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center justify-center gap-6 md:gap-8 mb-4">
          <button onClick={() => setShowFollowers(true)} className="flex flex-col items-center">
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" style={{ color: PRIMARY_COLOR }} />
              <span className="font-bold" style={{ color: 'var(--text-color)' }}>{formatCount(profile?.followers_count || 0)}</span>
            </div>
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{t('profile.followers')}</span>
          </button>
          <button onClick={() => setShowFollowing(true)} className="flex flex-col items-center">
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" style={{ color: PRIMARY_COLOR }} />
              <span className="font-bold" style={{ color: 'var(--text-color)' }}>{formatCount(profile?.following_count || 0)}</span>
            </div>
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{t('profile.following')}</span>
          </button>
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1">
              <Flame className="w-4 h-4" style={{ color: PRIMARY_COLOR }} />
              <span className="font-bold" style={{ color: 'var(--text-color)' }}>{formatCount(heatCount)}</span>
            </div>
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{t('profile.heat')}</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1">
              <Zap className="w-4 h-4" style={{ color: PRIMARY_COLOR }} />
              <span className="font-bold" style={{ color: 'var(--text-color)' }}>{formatCount(hotPoints)}</span>
            </div>
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{t('profile.hotPoints')}</span>
          </div>
        </div>

        {/* 等级展示与权益面板 */}
        <div className="flex items-center justify-center gap-2 mb-2">
          <span
            className="px-3 py-1 text-sm font-medium rounded-full cursor-pointer flex items-center gap-1"
            style={{ backgroundColor: `${PRIMARY_COLOR}15`, color: PRIMARY_COLOR }}
            onClick={() => setShowLevelBenefits(!showLevelBenefits)}
          >
            LV.{level} {levelNames[level]}
            {showLevelBenefits ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </span>
          <div
            className="w-24 h-2 rounded-full overflow-hidden relative"
            style={{ backgroundColor: 'var(--bg-secondary)' }}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${expProgress}%`, backgroundColor: PRIMARY_COLOR }}
            />
          </div>
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{Math.round(expProgress)}%</span>
        </div>

        {/* 等级权益面板 */}
        {showLevelBenefits && (
          <div
            className="rounded-xl p-4 mb-4 animate-in slide-in-from-top-2"
            style={{ backgroundColor: 'var(--bg-secondary)' }}
          >
            {/* 当前等级权益 */}
            <div className="mb-3">
              <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                当前等级特权
              </p>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <Users className="w-4 h-4" style={{ color: PRIMARY_COLOR }} />
                  <span className="text-sm" style={{ color: 'var(--text-color)' }}>
                    {levelBenefits[level]?.groups === 999 ? '∞' : levelBenefits[level]?.groups || 0} 个群聊
                  </span>
                </div>
                {levelBenefits[level]?.monthly_hot && (
                  <div className="flex items-center gap-1.5">
                    <Zap className="w-4 h-4" style={{ color: PRIMARY_COLOR }} />
                    <span className="text-sm" style={{ color: 'var(--text-color)' }}>
                      每月+{levelBenefits[level]?.monthly_hot}热点
                    </span>
                  </div>
                )}
                {levelBenefits[level]?.exposure_hours && (
                  <div className="flex items-center gap-1.5">
                    <Eye className="w-4 h-4" style={{ color: PRIMARY_COLOR }} />
                    <span className="text-sm" style={{ color: 'var(--text-color)' }}>
                      曝光{levelBenefits[level]?.exposure_hours}小时
                    </span>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {levelBenefits[level]?.features.map((feature, idx) => (
                  <span key={idx} className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: `${PRIMARY_COLOR}15`, color: PRIMARY_COLOR }}>
                    {feature}
                  </span>
                ))}
              </div>
            </div>

            {/* 下一等级预告 */}
            {level < 10 && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-3">
                <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  升到 LV.{level + 1} {levelNames[level + 1]} 解锁
                </p>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <Unlock className="w-4 h-4 text-green-500" />
                    <span className="text-sm" style={{ color: 'var(--text-color)' }}>
                      {levelBenefits[level + 1]?.groups === 999 ? '∞' : levelBenefits[level + 1]?.groups || 0} 个群聊
                    </span>
                  </div>
                  {levelBenefits[level + 1]?.monthly_hot && (
                    <div className="flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-green-500" />
                      <span className="text-sm" style={{ color: 'var(--text-color)' }}>
                        每月+{levelBenefits[level + 1]?.monthly_hot}热点
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {levelBenefits[level + 1]?.features
                    .filter(f => !levelBenefits[level]?.features.includes(f))
                    .map((feature, idx) => (
                      <span key={idx} className="text-xs px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                        + {feature}
                      </span>
                    ))}
                </div>
                {/* 升级进度 */}
                <div className="mt-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span style={{ color: 'var(--text-secondary)' }}>还需 {nextLevelThreshold - experience} 经验升级</span>
                    <span style={{ color: 'var(--text-secondary)' }}>{experience} / {nextLevelThreshold}</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full" style={{ backgroundColor: 'var(--bg-color)' }}>
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-green-400 to-green-600"
                      style={{ width: `${expProgress}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* VIP 专属特权 */}
            {isVip && (
              <div className="border-t border-yellow-200 dark:border-yellow-800 pt-3 mt-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <Crown className="w-4 h-4 text-yellow-500" />
                  <p className="text-xs font-medium" style={{ color: '#B8860B' }}>VIP 专属特权</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-color)' }}>
                    <Zap className="w-3 h-3 text-yellow-500" />
                    <span>经验 ×2</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-color)' }}>
                    <Star className="w-3 h-3 text-yellow-500" />
                    <span>动态头像</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-color)' }}>
                    <Palette className="w-3 h-3 text-yellow-500" />
                    <span>自定义主题</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-color)' }}>
                    <Download className="w-3 h-3 text-yellow-500" />
                    <span>离线下载</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-color)' }}>
                    <Eye className="w-3 h-3 text-yellow-500" />
                    <span>曝光特权</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-color)' }}>
                    <ArrowUp className="w-3 h-3 text-yellow-500" />
                    <span>置顶卡</span>
                  </div>
                </div>
              </div>
            )}

            {/* 升级提示 */}
            {!isVip && level < 10 && (
              <button
                onClick={() => navigate('/vip')}
                className="w-full mt-3 py-2 rounded-lg text-sm font-medium text-white"
                style={{ background: `linear-gradient(135deg, ${PRIMARY_COLOR}, #ff4d6d)` }}
              >
                <Gift className="w-4 h-4 inline mr-1" />
                开通 VIP 加速升级
              </button>
            )}
          </div>
        )}

        <div
          className="rounded-xl p-4 mb-4"
          style={{ backgroundColor: 'var(--bg-secondary)' }}
        >
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{displayBio}</p>
        </div>

        <div className="flex items-center justify-center gap-2 mb-4">
          {[
            { id: 'notes', label: t('profile.notes') },
            { id: 'plans', label: t('profile.plans') },
            { id: 'collections', label: t('profile.collections') },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
              style={{
                backgroundColor: activeTab === tab.id ? PRIMARY_COLOR : 'var(--bg-secondary)',
                color: activeTab === tab.id ? '#FFFFFF' : 'var(--text-secondary)',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {renderContent()}
      <BottomNav />

      {/* 笔记/珍藏详情弹窗 */}
      {selectedPostIndex !== null && (
        <PostDetailModal
          posts={activeTab === 'collections'
            ? favoritePosts
            : userNotes.map((note) => ({
                id: note.id,
                title: note.title,
                content: note.content || '',
                coverImage: note.cover_image || '',
                images: note.images || [],
                tags: note.tags || [],
                user_id: user?.id || '',
                likes_count: (note as any).likes_count || 0,
                comments_count: (note as any).comments_count || 0,
                heat_count: (note as any).heat_count || 0,
                created_at: note.created_at,
                author: {
                  id: user?.id,
                  username: profile?.nickname || profile?.username || '用户',
                  nickname: profile?.nickname || profile?.username || '用户',
                  avatar: profile?.avatar_url || '',
                  avatar_url: profile?.avatar_url || '',
                  faith_tag: profile?.faith_tag || '寻求者',
                  faithTag: profile?.faith_tag || '寻求者',
                },
              }))
          }
          initialIndex={selectedPostIndex}
          onClose={() => setSelectedPostIndex(null)}
        />
      )}

      {showShareModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-end justify-center z-50"
          onClick={() => setShowShareModal(false)}
        >
          <div
            className="w-full rounded-t-2xl p-6 theme-transition"
            style={{ backgroundColor: 'var(--bg-color)' }}
            onClick={(e) => e.stopPropagation()}
          >
              <h3 className="text-lg font-bold text-center mb-4" style={{ color: 'var(--text-color)' }}>{t('share.title')}</h3>
              <div className="grid grid-cols-4 gap-4 mb-6">
                {[
                  { id: 'friend', label: t('share.friend'), Icon: User },
                  { id: 'group', label: t('share.group'), Icon: Users },
                  { id: 'wechat', label: t('share.wechat'), Icon: MessageCircle },
                  { id: 'copy', label: t('share.copyLink'), Icon: Link },
                ].map(({ id, label, Icon }) => (
                  <button key={id} onClick={() => handleShare(id)} className="flex flex-col items-center gap-2">
                    <div
                      className="w-14 h-14 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: `${PRIMARY_COLOR}15` }}
                    >
                      <Icon className="w-7 h-7" style={{ color: PRIMARY_COLOR }} />
                    </div>
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{label}</span>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowShareModal(false)}
                className="w-full py-3 font-medium"
                style={{ color: 'var(--text-secondary)' }}
              >
                {t('common.cancel')}
              </button>
          </div>
        </div>
      )}

      {showQRModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setShowQRModal(false)}
        >
          <div
            className="rounded-2xl p-6 w-full max-w-xs theme-transition"
            style={{ backgroundColor: 'var(--card-bg)' }}
            onClick={(e) => e.stopPropagation()}
          >
              <div className="text-center mb-4">
                <h3 className="font-bold" style={{ color: 'var(--text-color)' }}>{t('profile.myQRCode')}</h3>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{t('profile.scanToAdd')}</p>
              </div>
              <div
                className="w-48 h-48 mx-auto rounded-xl flex items-center justify-center mb-4"
                style={{ backgroundColor: 'var(--bg-secondary)' }}
              >
                <div className="text-center">
                  <QrCode className="w-24 h-24 mx-auto" style={{ color: 'var(--text-color)' }} />
                  <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>QR Code</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => alert(t('profile.saveImage'))}
                  className="flex-1 py-2 rounded-xl text-sm font-medium"
                  style={{ backgroundColor: PRIMARY_COLOR, color: '#FFFFFF' }}
                >
                  {t('profile.saveImage')}
                </button>
                <button
                  onClick={() => setShowQRModal(false)}
                  className="flex-1 py-2 rounded-xl text-sm"
                  style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-color)' }}
                >
                  {t('common.close')}
                </button>
              </div>
          </div>
        </div>
      )}

      {showFollowers && (
        <div
          className="fixed inset-0 bg-black/50 flex items-end justify-center z-50"
          onClick={() => setShowFollowers(false)}
        >
          <div
            className="w-full rounded-t-2xl p-4 h-[70vh] theme-transition flex flex-col"
            style={{ backgroundColor: 'var(--bg-color)' }}
            onClick={(e) => e.stopPropagation()}
          >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold" style={{ color: 'var(--text-color)' }}>
                  {t('profile.followersList')} ({formatCount(followersList.length)})
                </h3>
                <button onClick={() => setShowFollowers(false)}><X className="w-5 h-5" style={{ color: 'var(--icon-color)' }} /></button>
              </div>
              {loadingFollowers ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="animate-spin w-8 h-8 border-2 border-current border-t-transparent rounded-full" style={{ color: PRIMARY_COLOR }} />
                </div>
              ) : followersList.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-center" style={{ color: 'var(--text-secondary)' }}>
                    {t('profile.noFollowers')}
                  </p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto space-y-3">
                  {followersList.map((follower) => (
                    <div
                      key={follower.user_id}
                      className="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:opacity-80 transition-opacity"
                      style={{ backgroundColor: 'var(--bg-secondary)' }}
                      onClick={() => {
                        setShowFollowers(false);
                        window.location.hash = `/user/${follower.user_id}`;
                      }}
                    >
                      <img
                        src={follower.avatar_url}
                        alt=""
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate" style={{ color: 'var(--text-color)' }}>
                          {follower.nickname}
                        </p>
                        {follower.faith_tag && (
                          <p className="text-xs truncate" style={{ color: PRIMARY_COLOR }}>
                            {follower.faith_tag}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
          </div>
        </div>
      )}

      {showFollowing && (
        <div
          className="fixed inset-0 bg-black/50 flex items-end justify-center z-50"
          onClick={() => setShowFollowing(false)}
        >
          <div
            className="w-full rounded-t-2xl p-4 h-[70vh] theme-transition flex flex-col"
            style={{ backgroundColor: 'var(--bg-color)' }}
            onClick={(e) => e.stopPropagation()}
          >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold" style={{ color: 'var(--text-color)' }}>
                  {t('profile.followingList')} ({formatCount(followingList.length)})
                </h3>
                <button onClick={() => setShowFollowing(false)}><X className="w-5 h-5" style={{ color: 'var(--icon-color)' }} /></button>
              </div>
              {loadingFollowing ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="animate-spin w-8 h-8 border-2 border-current border-t-transparent rounded-full" style={{ color: PRIMARY_COLOR }} />
                </div>
              ) : followingList.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-center" style={{ color: 'var(--text-secondary)' }}>
                    {t('profile.noFollowing')}
                  </p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto space-y-3">
                  {followingList.map((following) => (
                    <div
                      key={following.user_id}
                      className="flex items-center gap-3 p-3 rounded-xl"
                      style={{ backgroundColor: 'var(--bg-secondary)' }}
                    >
                      <img
                        src={following.avatar_url}
                        alt=""
                        className="w-12 h-12 rounded-full object-cover cursor-pointer"
                        onClick={() => {
                          setShowFollowing(false);
                          window.location.hash = `/user/${following.user_id}`;
                        }}
                      />
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => {
                        setShowFollowing(false);
                        window.location.hash = `/user/${following.user_id}`;
                      }}>
                        <p className="font-medium truncate" style={{ color: 'var(--text-color)' }}>
                          {following.nickname}
                        </p>
                        {following.faith_tag && (
                          <p className="text-xs truncate" style={{ color: PRIMARY_COLOR }}>
                            {following.faith_tag}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUnfollow(following.user_id);
                        }}
                        className="px-3 py-1.5 rounded-full text-xs flex items-center gap-1 border"
                        style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
                      >
                        <UserMinus className="w-3 h-3" />
                        取消关注
                      </button>
                    </div>
                  ))}
                </div>
              )}
          </div>
        </div>
      )}

      {showEditModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setShowEditModal(false)}
        >
          <div
            className="rounded-2xl p-6 w-full max-w-sm max-h-[80vh] overflow-y-auto theme-transition"
            style={{ backgroundColor: 'var(--card-bg)' }}
            onClick={(e) => e.stopPropagation()}
          >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold" style={{ color: 'var(--text-color)' }}>{t('profile.editProfile')}</h2>
                <button onClick={() => setShowEditModal(false)}><X className="w-5 h-5" style={{ color: 'var(--icon-color)' }} /></button>
              </div>

              <div className="space-y-5">
                <div className="text-center">
                  <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
                    {t('profile.changeAvatar')}
                    {isVip && isAnimatedAvatar && <span className="text-xs ml-1" style={{ color: PRIMARY_COLOR }}>({t('profile.animatedAvatar')})</span>}
                  </p>
                  <div className="relative w-20 h-20 mx-auto">
                    <img src={avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                    <button
                      onClick={() => avatarInputRef.current?.click()}
                      className="absolute bottom-0 right-0 w-6 h-6 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: PRIMARY_COLOR }}
                    >
                      <Camera className="w-3 h-3 text-white" />
                    </button>
                  </div>
                  {isVip && (
                    <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>{t('vip.animatedAvatar')}</p>
                  )}
                </div>

                <div>
                  <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>{t('profile.changeBg')}</p>
                  <div
                    className="h-24 rounded-xl flex items-center justify-center cursor-pointer overflow-hidden"
                    style={{ backgroundColor: 'var(--bg-secondary)' }}
                    onClick={() => bgInputRef.current?.click()}
                  >
                    {bgUrl ? (
                      <img src={bgUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Camera className="w-8 h-8" style={{ color: 'var(--icon-color)' }} />
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm mb-2" style={{ color: 'var(--text-color)' }}>{t('profile.nickname')}</label>
                  <input
                    type="text"
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl border text-sm focus:outline-none theme-transition"
                    style={{
                      backgroundColor: 'var(--bg-color)',
                      borderColor: 'var(--border-color)',
                      color: 'var(--text-color)',
                    }}
                  />
                </div>

                <div>
                  <label className="block text-sm mb-2" style={{ color: 'var(--text-color)' }}>{t('profile.bio')}</label>
                  <textarea
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    rows={3}
                    maxLength={100}
                    className="w-full px-4 py-3 rounded-xl border text-sm focus:outline-none resize-none theme-transition"
                    style={{
                      backgroundColor: 'var(--bg-color)',
                      borderColor: 'var(--border-color)',
                      color: 'var(--text-color)',
                    }}
                  />
                  <p className="text-xs text-right mt-1" style={{ color: 'var(--text-secondary)' }}>{editBio.length}/100</p>
                </div>

                <div>
                  <label className="block text-sm mb-2" style={{ color: 'var(--text-color)' }}>
                    {t('profile.faithTag')}
                    {profile && !canEditFaithTag() && editFaithTag === profile.faith_tag && (
                      <span className="text-xs ml-2" style={{ color: 'var(--text-secondary)' }}>({t('profile.tagModifyLimit')})</span>
                    )}
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        if (canEditFaithTag() || editFaithTag !== profile?.faith_tag) {
                          setShowTagDropdown(!showTagDropdown);
                        }
                      }}
                      disabled={!canEditFaithTag() && editFaithTag === profile?.faith_tag}
                      className="w-full h-12 px-4 rounded-xl border text-sm focus:outline-none flex items-center justify-between disabled:opacity-50 theme-transition"
                      style={{
                        backgroundColor: 'var(--bg-color)',
                        borderColor: 'var(--border-color)',
                        color: 'var(--text-color)',
                      }}
                    >
                      <span>{editFaithTag}</span>
                      <ChevronDown className="w-4 h-4" style={{ color: 'var(--icon-color)' }} />
                    </button>

                    {showTagDropdown && (
                      <div
                        className="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto border rounded-xl shadow-lg z-50 theme-transition"
                        style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}
                      >
                        {faithTags.map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => { setEditFaithTag(tag); setShowTagDropdown(false); }}
                            className="w-full px-4 py-2 text-left text-sm hover:opacity-80"
                            style={{ color: 'var(--text-color)' }}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* 隐私设置 */}
                <div className="pt-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
                  <p className="text-sm font-medium mb-3" style={{ color: 'var(--text-color)' }}>隐私设置</p>
                  
                  {/* 允许陌生人访问 */}
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm" style={{ color: 'var(--text-color)' }}>允许陌生人访问主页</p>
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>关闭后，只有好友才能访问</p>
                    </div>
                    <button
                      onClick={() => setEditAllowStrangerVisit(!editAllowStrangerVisit)}
                      className="relative w-12 h-6 rounded-full transition-colors"
                      style={{ backgroundColor: editAllowStrangerVisit ? PRIMARY_COLOR : 'var(--bg-secondary)' }}
                    >
                      <span
                        className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
                        style={{
                          left: editAllowStrangerVisit ? '26px' : '2px',
                          transition: 'left 0.2s ease'
                        }}
                      />
                    </button>
                  </div>

                  {/* 允许好友访问 */}
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm" style={{ color: 'var(--text-color)' }}>允许好友访问主页</p>
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>双向关注即为好友</p>
                    </div>
                    <button
                      onClick={() => setEditAllowFriendVisit(!editAllowFriendVisit)}
                      className="relative w-12 h-6 rounded-full transition-colors"
                      style={{ backgroundColor: editAllowFriendVisit ? PRIMARY_COLOR : 'var(--bg-secondary)' }}
                    >
                      <span
                        className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
                        style={{
                          left: editAllowFriendVisit ? '26px' : '2px',
                          transition: 'left 0.2s ease'
                        }}
                      />
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  className="w-full h-12 rounded-xl font-medium transition-colors disabled:opacity-50"
                  style={{ backgroundColor: PRIMARY_COLOR, color: '#FFFFFF' }}
                >
                  {isSaving ? t('profile.saving') : t('profile.saveChanges')}
                </button>
              </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Profile;
