/**
 * 统一 Auth Store (Zustand)
 * 管理前台和后台的登录状态
 */

import { create } from 'zustand';
import { supabase } from '../supabase/client';

// Token 存储 key
const TOKEN_KEYS = {
  USER: 'user_token',
  ADMIN: 'openfaith_admin_token',
  AUTH: 'sb_auth',
  ADMIN_AUTH: 'openfaith_admin_auth',
} as const;

// 类型定义
interface UserInfo {
  id: string;
  email: string;
  [key: string]: any;
}

interface AuthState {
  // State
  token: string | null;
  userInfo: UserInfo | null;
  isAdmin: boolean;
  isAuthenticated: boolean;  // 新增：标记是否已认证登录
  isInitialized: boolean;  // 标记是否已初始化

  // Getters
  isLoggedIn: () => boolean;
  currentToken: () => string | null;

  // Actions
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: (redirectToLogin?: boolean) => void;
  adminLogin: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  adminLogout: (redirectToLogin?: boolean) => void;
  setAdminMode: (adminMode: boolean) => void;
  checkAuth: () => Promise<void>;  // 改为 async
  handleUnauthorized: () => void;
  setInitialized: (value: boolean) => void;  // 新增：设置初始化状态
  setToken: (token: string | null) => void;  // 新增：设置 token
  setUser: (user: UserInfo | null) => void;  // 新增：设置用户信息
}

// 安全获取 localStorage
function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    console.error(`[AuthStore] Failed to get ${key}:`, e);
    return null;
  }
}

// 生成8位字母+数字混合的随机显示ID
function generateDisplayId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 8; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

function safeSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.error(`[AuthStore] Failed to set ${key}:`, e);
  }
}

function safeRemoveItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.error(`[AuthStore] Failed to remove ${key}:`, e);
  }
}

// 初始化：从 localStorage 快速读取 token（同步）
function getInitialToken(): { token: string | null; userInfo: UserInfo | null } {
  // 快速检查 localStorage，不抛错
  try {
    const userToken = localStorage.getItem(TOKEN_KEYS.USER);
    if (userToken) {
      const userAuth = localStorage.getItem(TOKEN_KEYS.AUTH);
      if (userAuth) {
        try {
          const parsed = JSON.parse(userAuth);
          return { token: userToken, userInfo: parsed.user || null };
        } catch (e) {
          return { token: userToken, userInfo: null };
        }
      }
      return { token: userToken, userInfo: null };
    }
  } catch (e) {
    console.error('[AuthStore] Failed to read initial token:', e);
  }
  return { token: null, userInfo: null };
}

// 监听器引用（全局）
let authStateChangeUnsubscribe: (() => void) | null = null;

export const useAuthStore = create<AuthState>((set, get) => ({
  // ============ State ============
  // 初始值从 localStorage 快速读取，避免页面刷新闪烁
  ...getInitialToken(),
  isAdmin: false,
  isAuthenticated: false,  // 新增：初始为未认证
  isInitialized: false,

  // ============ Getters ============
  isLoggedIn: () => {
    const state = get();
    // 新增：优先检查 isAuthenticated 字段
    if (state.isAuthenticated) return true;
    // 优先使用 state.token，如果为 null 则检查 localStorage
    if (state.token) return true;

    if (state.isAdmin) {
      return !!safeGetItem(TOKEN_KEYS.ADMIN);
    }
    return !!safeGetItem(TOKEN_KEYS.USER);
  },

  currentToken: () => {
    const state = get();
    // 优先使用 state.token，如果为 null 则检查 localStorage
    if (state.token) return state.token;
    return safeGetItem(state.isAdmin ? TOKEN_KEYS.ADMIN : TOKEN_KEYS.USER);
  },

  // ============ Actions ============

  /**
   * 设置初始化状态
   */
  setInitialized: (value: boolean) => {
    set({ isInitialized: value });
  },

  setToken: (token: string | null) => {
    if (token) {
      safeSetItem(TOKEN_KEYS.USER, token);
    }
    set({ token });
  },

  setUser: (user: UserInfo | null) => {
    if (user) {
      safeSetItem(TOKEN_KEYS.AUTH, JSON.stringify({ user }));
    }
    set({ userInfo: user });
  },

  /**
   * 初始化检查登录状态
   * 尝试从 Supabase session 或 localStorage 恢复登录状态
   */
  checkAuth: async () => {
    try {
      // 从 Supabase session 获取
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        safeSetItem(TOKEN_KEYS.USER, session.access_token);
        safeSetItem(TOKEN_KEYS.AUTH, JSON.stringify({
          user: session.user,
          session: session
        }));
        set({ token: session.access_token, userInfo: session.user, isInitialized: true });
        return;
      }

      // fallback 到 localStorage
      const state = get();
      if (state.isAdmin) {
        const adminToken = safeGetItem(TOKEN_KEYS.ADMIN);
        if (adminToken) {
          const adminAuth = safeGetItem(TOKEN_KEYS.ADMIN_AUTH);
          if (adminAuth) {
            const parsed = JSON.parse(adminAuth);
            set({ token: adminToken, userInfo: parsed.user || null, isInitialized: true });
          } else {
            set({ token: adminToken, userInfo: null, isInitialized: true });
          }
        } else {
          set({ isInitialized: true });
        }
      } else {
        const userToken = safeGetItem(TOKEN_KEYS.USER);
        if (userToken) {
          const userAuth = safeGetItem(TOKEN_KEYS.AUTH);
          if (userAuth) {
            const parsed = JSON.parse(userAuth);
            set({ token: userToken, userInfo: parsed.user || null, isInitialized: true });
          } else {
            set({ token: userToken, userInfo: null, isInitialized: true });
          }
        } else {
          set({ isInitialized: true });
        }
      }
    } catch (e) {
      console.error('[AuthStore] checkAuth error:', e);
      set({ isInitialized: true });
    }
  },

  /**
   * 前台用户登录
   */
  login: async (email: string, password: string) => {
    try {
      // 使用真实 Supabase 认证
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.session && data.user) {
        // 0. 检查用户是否被封号
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_banned, is_muted')
          .eq('user_id', data.user.id)
          .maybeSingle();

        if (profile?.is_banned) {
          await supabase.auth.signOut();
          return { success: false, error: '该账号已被封禁，请联系管理员' };
        }

        // 1. 保存到 localStorage（同步操作）- 必须使用精确的 key
        localStorage.setItem('user_token', data.session.access_token);
        localStorage.setItem('user_info', JSON.stringify({
          id: data.user.id,
          email: data.user.email
        }));

        // 2. 同时保存到 TokenKeys 定义的 key（向后兼容）
        safeSetItem(TOKEN_KEYS.USER, data.session.access_token);
        safeSetItem('user_id', data.user.id);
        safeSetItem(TOKEN_KEYS.AUTH, JSON.stringify({
          user: data.user,
          session: data.session
        }));

        // 3. 检查 profile 是否存在，不存在则自动创建
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', data.user.id)
          .maybeSingle();

        if (!existingProfile) {
          // 问题一：优先使用 user_metadata.username，fallback 到随机生成8位ID
          const username = data.user.user_metadata?.username || generateDisplayId();
          const nickname = data.user.user_metadata?.nickname || '';
          const faithTag = data.user.user_metadata?.faith_tag || '寻求者';

          await supabase.from('profiles').insert({
            user_id: data.user.id,
            username: username,
            nickname: nickname,
            faith_tag: faithTag,
            // 问题三：新用户注册赠送5热点
            hot_points: 5
          });
        }

        // 4. 更新 Zustand store - 使用用户要求的精确格式
        set({
          token: data.session.access_token,
          userInfo: {
            id: data.session.user.id,
            email: data.session.user.email || '',
            name: data.session.user.user_metadata?.name || '',
            avatar: data.session.user.user_metadata?.avatar_url || '',
            ...data.session.user
          },
          isAuthenticated: true,
          isInitialized: true
        });

        console.log('[AuthStore] login success, token and user_info saved to localStorage');
        return { success: true };
      }

      return { success: false, error: '登录失败' };
    } catch (e: any) {
      return { success: false, error: e.message || '网络错误' };
    }
  },

  /**
   * 前台退出登录
   */
  logout: async (redirectToLogin = true) => {
    await supabase.auth.signOut();
    safeRemoveItem(TOKEN_KEYS.USER);
    safeRemoveItem(TOKEN_KEYS.AUTH);
    set({ token: null, userInfo: null, isAuthenticated: false });
    if (redirectToLogin) {
      window.location.hash = '/login';
    }
  },

  /**
   * 后台管理员登录
   */
  adminLogin: async (username: string, password: string) => {
    try {
      // 尝试使用 Supabase Auth（管理员也可以用 email 登录）
      const { data, error } = await supabase.auth.signInWithPassword({
        email: username.includes('@') ? username : `${username}@admin.openfaith.app`,
        password
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.session && data.user) {
        safeSetItem(TOKEN_KEYS.ADMIN, data.session.access_token);
        safeSetItem(TOKEN_KEYS.ADMIN_AUTH, JSON.stringify({
          user: data.user,
          session: data.session
        }));
        set({
          token: data.session.access_token,
          userInfo: data.user,
          isAuthenticated: true
        });
        return { success: true };
      }

      return { success: false, error: '登录失败' };
    } catch (e: any) {
      return { success: false, error: e.message || '网络错误' };
    }
  },

  /**
   * 后台退出登录
   */
  adminLogout: (redirectToLogin = true) => {
    supabase.auth.signOut().catch(() => {});
    safeRemoveItem(TOKEN_KEYS.ADMIN);
    safeRemoveItem(TOKEN_KEYS.ADMIN_AUTH);
    set({ token: null, userInfo: null, isAuthenticated: false });
    if (redirectToLogin) {
      window.location.hash = '/admin/login';
    }
  },

  /**
   * 切换前后台模式
   */
  setAdminMode: (adminMode: boolean) => {
    set({ isAdmin: adminMode });
    get().checkAuth();
  },

  /**
   * 401 处理
   */
  handleUnauthorized: () => {
    const state = get();
    if (state.isAdmin) {
      get().adminLogout();
    } else {
      get().logout();
    }
  },
}));

// ============ 初始化监听器 ============
function initAuthListener() {
  // 避免重复监听
  if (authStateChangeUnsubscribe) {
    return;
  }

  // 立即尝试恢复 session
  const store = useAuthStore.getState();
  store.checkAuth();

  // 监听 Supabase 认证状态变化
  authStateChangeUnsubscribe = supabase.auth.onAuthStateChange((event, session) => {
    console.log('[AuthStore] onAuthStateChange:', event, 'hasSession:', !!session);

    if (event === 'INITIAL_SESSION') {
      // INITIAL_SESSION 防抖：如果 store 已经初始化完成，则忽略
      const currentState = useAuthStore.getState();
      if (currentState.isInitialized && currentState.token) {
        console.log('[AuthStore] INITIAL_SESSION 已初始化，忽略此次事件');
        return;
      }
      
      // INITIAL_SESSION 事件
      if (session) {
        // 有 session：更新 token 和 userInfo 并写入 localStorage
        console.log('[AuthStore] INITIAL_SESSION 有 session，更新 token');
        localStorage.setItem('user_token', session.access_token);
        localStorage.setItem('user_info', JSON.stringify({
          id: session.user.id,
          email: session.user.email
        }));
        safeSetItem(TOKEN_KEYS.USER, session.access_token);
        safeSetItem(TOKEN_KEYS.AUTH, JSON.stringify({
          user: session.user,
          session: session
        }));
        useAuthStore.setState({
          token: session.access_token,
          userInfo: session.user,
          isAuthenticated: true,
          isInitialized: true
        });
      } else {
        // 没有 session：检查 store 是否已有 token，保持现有状态
        const currentToken = useAuthStore.getState().token;
        if (currentToken) {
          // store 已有 token，保持现有状态不变
          console.log('[AuthStore] INITIAL_SESSION 无session但store已有token，保持状态');
          useAuthStore.setState({ isInitialized: true });
        } else {
          // store 没有 token：检查 localStorage 是否有 token
          const savedToken = localStorage.getItem('user_token');
          if (savedToken) {
            console.log('[AuthStore] INITIAL_SESSION 无session但有localStorage token，恢复:', savedToken.substring(0,20));
            const savedUser = localStorage.getItem('user_info');
            let userInfo = null;
            if (savedUser) {
              try { userInfo = JSON.parse(savedUser); } catch(e) {}
            }
            useAuthStore.setState({ token: savedToken, userInfo: userInfo, isInitialized: true });
          } else {
            console.log('[AuthStore] INITIAL_SESSION 无session也无localStorage token');
            useAuthStore.setState({ isInitialized: true });
          }
        }
      }
    } else if (event === 'SIGNED_IN') {
      // SIGNED_IN 事件
      if (session) {
        console.log('[AuthStore] SIGNED_IN 有 session，更新 token');
        localStorage.setItem('user_token', session.access_token);
        localStorage.setItem('user_info', JSON.stringify({
          id: session.user.id,
          email: session.user.email
        }));
        safeSetItem(TOKEN_KEYS.USER, session.access_token);
        safeSetItem(TOKEN_KEYS.AUTH, JSON.stringify({
          user: session.user,
          session: session
        }));
        useAuthStore.setState({
          token: session.access_token,
          userInfo: session.user,
          isAuthenticated: true,
          isInitialized: true
        });
      }
    } else if (event === 'SIGNED_OUT') {
      // SIGNED_OUT 事件：清空 token 和 userInfo 并移除 localStorage
      console.log('[AuthStore] SIGNED_OUT，清除 token');
      localStorage.removeItem('user_token');
      localStorage.removeItem('user_info');
      safeRemoveItem(TOKEN_KEYS.USER);
      safeRemoveItem(TOKEN_KEYS.AUTH);
      useAuthStore.setState({
        token: null,
        userInfo: null,
        isAuthenticated: false,
        isInitialized: true
      });
    }
  }).data.subscription;
}

// 立即初始化（不延迟）
if (typeof window !== 'undefined') {
  initAuthListener();
}

export type AuthStore = AuthState;
