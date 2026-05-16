import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabase/client';
import { useAuthStore } from '../stores/auth';
import type { User, Session } from '@supabase/supabase-js';

interface Profile {
  id: string;
  email: string;
  username: string;
  avatar_url: string;
  faith_tag: string;
  bio: string;
  followers_count: number;
  following_count: number;
  likes_count: number;
  level: number;
  experience: number;
  is_vip: boolean;
  is_admin: boolean;
  tag_last_modified_at: string;
  created_at: string;
  vip_exp_multiplier: number;
  groups_created: number;
  downloads_count: number;
  exposure_cards: number;
  sticky_cards: number;
  theme_color: string;
  theme_mode: string;
  is_animated_avatar: boolean;
  hot_points: number;
  heat_count: number;
  last_online_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  signUp: (email: string, password: string, username: string, faithTag: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (code: string, newPassword: string) => Promise<{ error: Error | null }>;
  updateProfile: (data: Partial<Profile>) => Promise<{ error: Error | null }>;
  canEditFaithTag: () => boolean;
  refreshProfile: () => Promise<void>;
  addExperience: (amount: number) => Promise<void>;
  addHotPoints: (amount: number) => Promise<void>;
  canCreateGroup: () => boolean;
  getMaxDownloads: () => number;
  useExposureCard: () => Promise<boolean>;
  useStickyCard: () => Promise<boolean>;
  purchaseVIP: () => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const authStore = useAuthStore();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // 使用 ref 存储最新的 session，避免闭包陷阱和竞态条件
  const sessionRef = useRef<Session | null>(null);
  const mountedRef = useRef(true);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);

  // Anon Key for heartbeat
  const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkaHdtZWl0dGdkb3Nta3h0cGFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxMzI0OTIsImV4cCI6MjA5MzcwODQ5Mn0.ID9gk1K754zT_Pbc2wO7tGvm7EGEzlHdpBxu8aD3Dlc';

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (mountedRef.current) {
        if (data && !error) {
          setProfile(data as Profile);
        } else {
          setProfile(null);
        }
      }
    } catch (err) {
      console.error('Fetch profile error:', err);
      if (mountedRef.current) setProfile(null);
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, []);

  // 心跳函数：更新 last_online_at
  const sendHeartbeat = useCallback(async () => {
    if (!user?.id) return;
    try {
      await fetch(`/sb-api/rest/v1/profiles?user_id=eq.${user.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': ANON_KEY,
        },
        body: JSON.stringify({ last_online_at: new Date().toISOString() }),
      });
    } catch (err) {
      console.error('Heartbeat error:', err);
    }
  }, [user]);

  // 启动心跳（每2分钟）
  const startHeartbeat = useCallback(() => {
    // 先发送一次心跳
    sendHeartbeat();
    // 然后每2分钟发送一次
    heartbeatRef.current = setInterval(() => {
      sendHeartbeat();
    }, 2 * 60 * 1000);
  }, [sendHeartbeat]);

  // 停止心跳
  const stopHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
    // 页面关闭前发送最后一次心跳
    sendHeartbeat();
  }, [sendHeartbeat]);

  // 页面卸载时发送心跳
  useEffect(() => {
    const handleBeforeUnload = () => {
      sendHeartbeat();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [sendHeartbeat]);

  useEffect(() => {
    mountedRef.current = true;

    // 设置超时，防止 supabase 请求卡住
    const timeoutId = setTimeout(() => {
      if (mountedRef.current && isLoading) {
        console.warn('Auth session check timeout, setting isLoading to false');
        setIsLoading(false);
        setSession(null);
        setUser(null);
      }
    }, 5000);

    // 检查 mock API 的登录状态
    const checkMockAuth = () => {
      const token = localStorage.getItem('user_token');
      const auth = localStorage.getItem('sb_auth');
      
      if (token) {
        const mockSession: Session = {
          access_token: token,
          refresh_token: '',
          expires_in: 3600,
          expires_at: Date.now() + 3600 * 1000,
          token_type: 'Bearer',
        } as Session;
        
        setSession(mockSession);
        sessionRef.current = mockSession;
        
        if (auth) {
          try {
            const parsed = JSON.parse(auth);
            setUser(parsed.user || null);
            if (parsed.user?.id) {
              fetchProfile(parsed.user.id);
            }
          } catch (e) {
            setUser(null);
            setIsLoading(false);
          }
        } else {
          setIsLoading(false);
        }
      } else {
        setSession(null);
        setUser(null);
        setIsLoading(false);
      }
      
      if (mountedRef.current) {
        clearTimeout(timeoutId);
      }
    };
    
    checkMockAuth();

    return () => {
      mountedRef.current = false;
      clearTimeout(timeoutId);
    };
  }, [fetchProfile]);

  // 管理心跳的生命周期
  useEffect(() => {
    if (user) {
      startHeartbeat();
    }
    return () => {
      if (user) {
        stopHeartbeat();
      }
    };
  }, [user, startHeartbeat, stopHeartbeat]);

  const signUp = async (email: string, password: string, username: string, faithTag: string) => {
    try {
      const response = await fetch('/sb-api/auth/v1/signup', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkaHdtZWl0dGdkb3Nta3h0cGFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxMzI0OTIsImV4cCI6MjA5MzcwODQ5Mn0.ID9gk1K754zT_Pbc2wO7tGvm7EGEzlHdpBxu8aD3Dlc'
          },
        body: JSON.stringify({ email, password, nickname: username, faithTag }),
      });
      const data = await response.json();
      
      if (response.ok) {
        // 注册后自动登录
        await authStore.login(email, password);
        return { error: null };
      } else {
        return { error: new Error(data.message || '注册失败') };
      }
    } catch (e) {
      return { error: e as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const result = await authStore.login(email, password);
      
      if (result.success) {
        const token = localStorage.getItem('user_token');
        const mockSession: Session = {
          access_token: token || '',
          refresh_token: '',
          expires_in: 3600,
          expires_at: Date.now() + 3600 * 1000,
          token_type: 'Bearer',
        } as Session;
        
        setSession(mockSession);
        sessionRef.current = mockSession;
        
        if (token) {
          try {
            const { data } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', token.split('-')[0])
              .maybeSingle();
            if (data) {
              setUser({ id: data.id, email: data.email } as User);
              setProfile(data as Profile);
            }
          } catch (e) {
            // ignore
          }
        }
        return { error: null };
      } else {
        return { error: new Error(result.error || '登录失败') };
      }
    } catch (e) {
      return { error: e as Error };
    }
  };

  const signOut = async () => {
    // 停止心跳
    stopHeartbeat();
    // 发送最后一次心跳（标记离线）
    sendHeartbeat();
    authStore.logout(false);
    setUser(null);
    setSession(null);
    setProfile(null);
    window.location.href = '/login';
  };

  const resetPassword = async (email: string) => {
    try {
      const response = await fetch('/sb-api/auth/v1/reset-password', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkaHdtZWl0dGdkb3Nta3h0cGFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxMzI0OTIsImV4cCI6MjA5MzcwODQ5Mn0.ID9gk1K754zT_Pbc2wO7tGvm7EGEzlHdpBxu8aD3Dlc'
          },
        body: JSON.stringify({ email }),
      });
      
      if (response.ok) {
        return { error: null };
      } else {
        const data = await response.json();
        return { error: new Error(data.message || '重置密码失败') };
      }
    } catch (e) {
      return { error: e as Error };
    }
  };

  const updatePassword = async (code: string, newPassword: string) => {
    try {
      const response = await fetch('/sb-api/auth/v1/update-password', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkaHdtZWl0dGdkb3Nta3h0cGFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxMzI0OTIsImV4cCI6MjA5MzcwODQ5Mn0.ID9gk1K754zT_Pbc2wO7tGvm7EGEzlHdpBxu8aD3Dlc'
          },
        body: JSON.stringify({ code, newPassword }),
      });
      
      if (response.ok) {
        return { error: null };
      } else {
        const data = await response.json();
        return { error: new Error(data.message || '更新密码失败') };
      }
    } catch (e) {
      return { error: e as Error };
    }
  };

  const updateProfile = async (data: Partial<Profile>) => {
    if (!user?.id) return { error: new Error('未登录') };
    
    try {
      const response = await fetch(`/sb-api/rest/v1/profiles?user_id=eq.${user.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
          'Authorization': `Bearer ${session?.access_token}`,
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkaHdtZWl0dGdkb3Nta3h0cGFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxMzI0OTIsImV4cCI6MjA5MzcwODQ5Mn0.ID9gk1K754zT_Pbc2wO7tGvm7EGEzlHdpBxu8aD3Dlc',
        },
        body: JSON.stringify(data),
      });
      
      if (response.ok) {
        const [updated] = await response.json();
        setProfile(prev => prev ? { ...prev, ...updated } : updated as Profile);
        return { error: null };
      } else {
        const data = await response.json();
        return { error: new Error(data.message || '更新资料失败') };
      }
    } catch (e) {
      return { error: e as Error };
    }
  };

  const canEditFaithTag = () => {
    if (!profile) return false;
    // 如果没有设置过 faith_tag，或者距离上次修改超过30天，可以修改
    if (!profile.faith_tag) return true;
    if (profile.tag_last_modified_at) {
      const daysSinceModification = (Date.now() - new Date(profile.tag_last_modified_at).getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceModification >= 30;
    }
    return true;
  };

  const refreshProfile = async () => {
    if (user?.id) {
      await fetchProfile(user.id);
    }
  };

  // 等级阈值配置（严格按规则文件）
  const LEVEL_THRESHOLDS = [0, 1000, 5000, 25000, 125000, 250000, 500000, 1000000, 2000000, 5000000];

  // 计算等级
  const calculateLevel = (exp: number): number => {
    for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
      if (exp >= LEVEL_THRESHOLDS[i]) {
        return i + 1;
      }
    }
    return 1;
  };

  const addExperience = async (amount: number) => {
    if (!profile) return;
    const multiplier = profile.is_vip ? 2 : 1;
    const newExp = (profile.experience || 0) + Math.ceil(amount * multiplier);
    const newLevel = calculateLevel(newExp);
    await updateProfile({ experience: newExp, level: newLevel });
  };

  const addHotPoints = async (amount: number) => {
    if (!profile) return;
    const newPoints = (profile.hot_points || 0) + amount;
    await updateProfile({ hot_points: newPoints });
  };

  const canCreateGroup = () => {
    if (!profile) return false;
    const maxGroups = profile.level + 1;
    return (profile.groups_created || 0) < maxGroups;
  };

  const getMaxDownloads = () => {
    if (!profile) return 0;
    if (profile.is_vip) return 999;
    return 10;
  };

  const useExposureCard = async () => {
    if (!profile || profile.exposure_cards <= 0) return false;
    await updateProfile({ exposure_cards: profile.exposure_cards - 1 });
    return true;
  };

  const useStickyCard = async () => {
    if (!profile || profile.sticky_cards <= 0) return false;
    await updateProfile({ sticky_cards: profile.sticky_cards - 1 });
    return true;
  };

  const purchaseVIP = async () => {
    // VIP 购买功能暂时使用模拟实现
    await updateProfile({ is_vip: true });
    return { error: null };
  };

  const value: AuthContextType = {
    user,
    session,
    profile,
    isLoading,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile,
    canEditFaithTag,
    refreshProfile,
    addExperience,
    addHotPoints,
    canCreateGroup,
    getMaxDownloads,
    useExposureCard,
    useStickyCard,
    purchaseVIP,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
