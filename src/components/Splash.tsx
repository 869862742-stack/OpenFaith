// Build: 20260508-v2

import React, { useEffect, useRef, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';
import { useTranslation } from 'react-i18next';
import ErrorBoundary from './ErrorBoundary';

// 安全默认值
const DEFAULT_PRIMARY_COLOR = '#E11D48';

// Splash 完成标记的 localStorage key
const SPLASH_DONE_KEY = 'openfaith_splash_done';
const LAST_LOGIN_KEY = 'openfaith_last_login';

// 密码保护
const ACCESS_KEY = 'of_access';
const ACCESS_PASSWORD = 'openfaith2026';

// 每日登录经验值奖励
const DAILY_LOGIN_EXP = 5;
const DAILY_LOGIN_HOT = 5;
const VIP_MULTIPLIER = 2;
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkaHdtZWl0dGdkb3Nta3h0cGFrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODEzMjQ5MiwiZXhwIjoyMDkzNzA4NDkyfQ.bPatiu7NXaE2k48aTkjAGQsba6NzXlIdq2k_gGLYLBE';

// 等级阈值配置（严格按规则文件）
const LEVEL_THRESHOLDS = [0, 1000, 5000, 25000, 125000, 250000, 500000, 1000000, 2000000, 5000000];

// 计算等级
function calculateLevel(exp: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (exp >= LEVEL_THRESHOLDS[i]) {
      return i + 1;
    }
  }
  return 1;
}

// 每日登录经验值处理（整合每日/每月奖励）
async function handleDailyLoginExp(userId: string): Promise<number> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const lastLogin = localStorage.getItem(LAST_LOGIN_KEY);
    const isFirstOfMonth = new Date().getDate() === 1;

    // 如果今天已登录且不是每月1日（需补发月度奖励），则跳过
    if (lastLogin === today && !isFirstOfMonth) {
      console.log('[DailyLogin] 今日已领取经验值');
      return 0;
    }

    // 获取当前 profile 数据（用 user_id 查询）
    const response = await fetch(
      `/sb-api/rest/v1/profiles?user_id=eq.${userId}&select=experience,level,is_vip,hot_points,exposure_cards,sticky_cards`,
      {
        headers: {
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        }
      }
    );

    if (response.ok) {
      const data = await response.json();
      if (data && data.length > 0) {
        const profile = data[0];
        const multiplier = profile.is_vip ? VIP_MULTIPLIER : 1;
        let expGained = 0;
        let hotGained = 0;
        let exposureAdd = 0;
        let stickyAdd = 0;

        // === 每日登录奖励 ===
        if (lastLogin !== today) {
          expGained += Math.ceil(DAILY_LOGIN_EXP * multiplier);
          hotGained += profile.is_vip ? DAILY_LOGIN_HOT * 2 : DAILY_LOGIN_HOT;
        }

        // === 每月1日额外奖励 ===
        if (isFirstOfMonth) {
          // VIP 每月赠送曝光卡+置顶卡
          if (profile.is_vip) {
            exposureAdd += 1;
            stickyAdd += 1;
          }
          // 等级权益每月热点（取最高等级对应值，不叠加）
          const level = profile.level || 1;
          if (level >= 9) hotGained += 300;
          else if (level >= 7) hotGained += 200;
          else if (level >= 5) hotGained += 100;
        }

        // 计算新值
        const newExp = (profile.experience || 0) + expGained;
        const newLevel = calculateLevel(newExp);
        const newHotPoints = (profile.hot_points || 0) + hotGained;
        const newExposureCards = (profile.exposure_cards || 0) + exposureAdd;
        const newStickyCards = (profile.sticky_cards || 0) + stickyAdd;

        // 更新 profile
        const updateData: Record<string, number> = {};
        if (expGained > 0) {
          updateData.experience = newExp;
          updateData.level = newLevel;
        }
        if (hotGained > 0) updateData.hot_points = newHotPoints;
        if (exposureAdd > 0) updateData.exposure_cards = newExposureCards;
        if (stickyAdd > 0) updateData.sticky_cards = newStickyCards;

        if (Object.keys(updateData).length > 0) {
          await fetch(
            `/sb-api/rest/v1/profiles?user_id=eq.${userId}`,
            {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                'apikey': SERVICE_ROLE_KEY,
                'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
              },
              body: JSON.stringify(updateData),
            }
          );
        }

        // 记录今日已登录
        localStorage.setItem(LAST_LOGIN_KEY, today);
        console.log(`[DailyLogin] +${expGained}exp +${hotGained}hot +${exposureAdd}exposure +${stickyAdd}sticky (VIP:${profile.is_vip} Lv:${profile.level})`);
        return expGained;
      }
    }
  } catch (err) {
    console.error('[DailyLogin] error:', err);
  }
  return 0;
}

// ============ 页面组件（懒加载）===========
const Welcome = React.lazy(() => import('../pages/Welcome'));
const Login = React.lazy(() => import('../pages/Login'));
const Register = React.lazy(() => import('../pages/Register'));
const Home = React.lazy(() => import('../pages/Home'));
const Learn = React.lazy(() => import('../pages/Learn'));
const Profile = React.lazy(() => import('../pages/Profile'));
const Messages = React.lazy(() => import('../pages/Messages'));
const Settings = React.lazy(() => import('../pages/Settings'));
const PublishNote = React.lazy(() => import('../pages/PublishNote'));
const PublishVideo = React.lazy(() => import('../pages/PublishVideo'));
const PublishPlan = React.lazy(() => import('../pages/PublishPlan'));
const Drafts = React.lazy(() => import('../pages/Drafts'));
const History = React.lazy(() => import('../pages/History'));
const Downloads = React.lazy(() => import('../pages/Downloads'));
const Covenant = React.lazy(() => import('../pages/Covenant'));
const Scan = React.lazy(() => import('../pages/Scan'));
const Support = React.lazy(() => import('../pages/Support'));
const AccountSecurity = React.lazy(() => import('../pages/AccountSecurity'));
const DisplaySettings = React.lazy(() => import('../pages/DisplaySettings'));
const NotificationSettings = React.lazy(() => import('../pages/NotificationSettings'));
const LanguageSettings = React.lazy(() => import('../pages/LanguageSettings'));
const ContentPreferences = React.lazy(() => import('../pages/ContentPreferences'));
const SwitchAccount = React.lazy(() => import('../pages/SwitchAccount'));
const AddFriend = React.lazy(() => import('../pages/AddFriend'));
const AddGroup = React.lazy(() => import('../pages/AddGroup'));
const GroupChatDetail = React.lazy(() => import('../pages/GroupChatDetail'));
const PrivateChat = React.lazy(() => import('../pages/PrivateChat'));
const ReligionDetail = React.lazy(() => import('../pages/ReligionDetail'));
const BookDetail = React.lazy(() => import('../pages/BookDetail'));
const UserProfile = React.lazy(() => import('../pages/UserProfile'));
const VIP = React.lazy(() => import('../pages/VIP'));
const AdminApp = React.lazy(() => import('../admin/App'));
const SilentRoom = React.lazy(() => import('../pages/SilentRoom'));
const Gongjing = React.lazy(() => import('../pages/Gongjing'));

// 页面加载器
function PageLoader() {
  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ backgroundColor: '#E11D48' }}>
      <div className="flex items-center gap-3">
        <span className="text-white text-3xl font-bold tracking-wide">Open Faith</span>
        <span className="text-white/50 text-3xl font-light">·</span>
        <span className="text-white text-3xl font-bold tracking-wide">Open World</span>
      </div>
    </div>
  );
}

/**
 * Splash 启动页 - 确保只在首次加载时执行初始化
 * 完成后渲染完整应用
 */
export default function SplashPage() {
  const { t } = useTranslation();
  const [isReady, setIsReady] = useState(false);
  const [accessGranted, setAccessGranted] = useState(() => localStorage.getItem(ACCESS_KEY) === '1');
  const [accessInput, setAccessInput] = useState('');
  const [accessError, setAccessError] = useState(false);
  const hasInitialized = useRef(false);

  // ========== 在线时长经验定时器 ==========
  useEffect(() => {
    const userInfo = localStorage.getItem('user_info');
    if (!userInfo) return;
    let parsedUser: any;
    try { parsedUser = JSON.parse(userInfo); } catch { return; }
    const userId = parsedUser?.id;
    if (!userId) return;

    const ONLINE_EXP_PER_30MIN = 2;
    const MAX_ONLINE_EXP_PER_DAY = 20;

    const interval = setInterval(async () => {
      const today = new Date().toISOString().split('T')[0];
      const onlineKey = `online_exp_${today}`;
      const onlineData = JSON.parse(localStorage.getItem(onlineKey) || '{"minutes":0,"exp":0}');
      onlineData.minutes += 30;

      if (onlineData.minutes % 30 === 0 && onlineData.exp < MAX_ONLINE_EXP_PER_DAY) {
        try {
          const res = await fetch(
            `/sb-api/rest/v1/profiles?user_id=eq.${userId}&select=experience,level,is_vip`,
            { headers: { 'apikey': SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SERVICE_ROLE_KEY}` } }
          );
          if (res.ok) {
            const profiles = await res.json();
            if (profiles && profiles.length > 0) {
              const profile = profiles[0];
              const multiplier = profile.is_vip ? VIP_MULTIPLIER : 1;
              const maxTotal = MAX_ONLINE_EXP_PER_DAY * multiplier;
              const expToAdd = Math.min(ONLINE_EXP_PER_30MIN * multiplier, maxTotal - onlineData.exp);

              if (expToAdd > 0) {
                const newExp = (profile.experience || 0) + expToAdd;
                const newLevel = calculateLevel(newExp);
                await fetch(`/sb-api/rest/v1/profiles?user_id=eq.${userId}`, {
                  method: 'PATCH',
                  headers: {
                    'Content-Type': 'application/json',
                    'apikey': SERVICE_ROLE_KEY,
                    'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
                  },
                  body: JSON.stringify({ experience: newExp, level: newLevel }),
                });
                onlineData.exp += expToAdd;
                console.log(`[OnlineExp] +${expToAdd}exp (在线30min, VIP:${profile.is_vip})`);
              }
            }
          }
        } catch (e) {
          console.error('[OnlineExp] 更新失败:', e);
        }
      }
      localStorage.setItem(onlineKey, JSON.stringify(onlineData));
    }, 30 * 60 * 1000); // 每30分钟

    return () => clearInterval(interval);
  }, [isReady]);
  // ==========================================

  // ========== 调试：监听 hash 变化 ==========
  useEffect(() => {
    console.log('[Splash] Current hash:', window.location.hash);
    const handler = () => {
      console.log('[Splash] Hash changed to:', window.location.hash);
    };
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);
  // ==========================================

  useEffect(() => {
    // 确保只执行一次
    if (hasInitialized.current) {
      return;
    }
    hasInitialized.current = true;

    const initializeApp = async () => {
      console.log('[Splash] 开始初始化...');

      try {
        const auth = useAuthStore.getState();

        // 1. 从 localStorage 恢复 token（同步）
        const savedToken = localStorage.getItem('user_token');
        const savedUser = localStorage.getItem('user_info');

        console.log('[Splash] localStorage token:', savedToken ? '存在' : '不存在');

        if (savedToken) {
          auth.setToken(savedToken);
          if (savedUser) {
            try {
              const parsedUser = JSON.parse(savedUser);
              auth.setUser(parsedUser);
              // 添加每日登录经验值
              if (parsedUser?.id) {
                const expGained = await handleDailyLoginExp(parsedUser.id);
                if (expGained > 0) {
                  console.log(`[Splash] 每日登录奖励: +${expGained} 经验值`);
                }
              }
            } catch {
              // 忽略 JSON 解析错误
            }
          }
        }

        // 2. 尝试获取 Supabase session（异步）
        // 加 try-catch 确保 import 失败不会卡住
        try {
          const { supabase } = await import('../supabase/client');
          const { data: { session } } = await supabase.auth.getSession();

          if (session) {
            // 检查用户是否被封号
            const userId = session.user?.id;
            if (userId) {
              try {
                const profileRes = await fetch(`/sb-api/rest/v1/profiles?user_id=eq.${userId}&select=is_banned,is_muted`, {
                  headers: { 'apikey': SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SERVICE_ROLE_KEY}` }
                });
                if (profileRes.ok) {
                  const profileData = await profileRes.json();
                  if (profileData?.[0]?.is_banned) {
                    console.log('[Splash] 用户已被封号，强制登出');
                    await supabase.auth.signOut();
                    localStorage.removeItem('user_token');
                    localStorage.removeItem('user_info');
                    auth.setToken(null);
                    auth.setUser(null);
                    window.location.hash = '#/login';
                    return;
                  }
                  // 禁言提示
                  if (profileData?.[0]?.is_muted) {
                    localStorage.setItem('of_muted_notice', '1');
                  } else {
                    localStorage.removeItem('of_muted_notice');
                  }
                }
              } catch (e) {
                console.warn('[Splash] 封号检查失败，继续初始化:', e);
              }
            }

            console.log('[Splash] Supabase session 存在，更新 store');
            auth.setToken(session.access_token);
            auth.setUser(session.user);
            localStorage.setItem('user_token', session.access_token);
            localStorage.setItem('user_info', JSON.stringify(session.user));
            
            // 添加每日登录经验值
            if (session.user?.id) {
              const expGained = await handleDailyLoginExp(session.user.id);
              if (expGained > 0) {
                console.log(`[Splash] 每日登录奖励: +${expGained} 经验值`);
              }
            }
          } else {
            console.log('[Splash] Supabase session 不存在');
          }
        } catch (supabaseError) {
          console.log('[Splash] Supabase 获取 session 失败（已跳过）:', supabaseError);
        }

        // 3. 预加载违规词列表（后台静默执行，不阻塞初始化）
        try {
          const { loadBannedWordsFromDatabase } = await import('../utils/badWordFilter');
          const SUPABASE_URL = 'https://rdhwmeittgdosmkxtpak.supabase.co';
          loadBannedWordsFromDatabase(SUPABASE_URL).catch(() => {});
          console.log('[Splash] 违规词列表预加载已启动');
        } catch (e) {
          console.warn('[Splash] 违规词预加载失败（已跳过）:', e);
        }

        console.log('[Splash] 初始化完成');

      } catch (error) {
        console.error('[Splash] 初始化失败（已捕获）:', error);
      } finally {
        // 标记初始化完成
        try {
          const auth = useAuthStore.getState();
          auth.setInitialized(true);
        } catch (e) {
          console.error('[Splash] setInitialized 失败:', e);
        }
        // 无论成功失败，都显示应用
        setIsReady(true);
      }
    };

    // 启动初始化
    const timer = setTimeout(initializeApp, 300);

    // 5秒超时兜底：即使初始化出错，5秒后也会显示应用
    const fallbackTimer = setTimeout(() => {
      console.log('[Splash] 5秒超时兜底，显示应用');
      setIsReady(true);
    }, 5000);

    return () => {
      clearTimeout(timer);
      clearTimeout(fallbackTimer);
    };
  }, []);

  // 显示启动画面
  if (!isReady) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center" style={{ backgroundColor: DEFAULT_PRIMARY_COLOR }}>
        {/* 入场动画文字 */}
        <div className="flex items-center justify-center gap-3">
          <span
            className="text-white text-3xl font-bold tracking-wide"
            style={{ animation: 'fadeInUp 0.6s ease-out 0.2s both' }}
          >Open Faith</span>
          <span
            className="text-white/50 text-3xl font-light"
            style={{ animation: 'fadeInUp 0.4s ease-out 0.5s both' }}
          >·</span>
          <span
            className="text-white text-3xl font-bold tracking-wide"
            style={{ animation: 'fadeInUp 0.6s ease-out 0.6s both' }}
          >Open World</span>
        </div>
      </div>
    );
  }

  // 密码保护门：未上线前屏蔽公众访问
  if (isReady && !accessGranted) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#1a1a2e]">
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center mb-8 shadow-xl"
          style={{ backgroundColor: DEFAULT_PRIMARY_COLOR }}
        >
          <span className="text-white text-3xl font-bold">OF</span>
        </div>
        <h1 className="text-white text-2xl font-bold mb-2">OpenFaith</h1>
        <p className="text-gray-400 text-sm mb-8">请输入访问密码</p>
        <div className="w-72 flex flex-col gap-3">
          <input
            type="password"
            value={accessInput}
            onChange={(e) => { setAccessInput(e.target.value); setAccessError(false); }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (accessInput === ACCESS_PASSWORD) {
                  localStorage.setItem(ACCESS_KEY, '1');
                  setAccessGranted(true);
                } else {
                  setAccessError(true);
                }
              }
            }}
            placeholder="访问密码"
            className="w-full h-11 px-4 rounded-xl bg-white/10 text-white text-sm border border-white/20 focus:border-[#E11D48] focus:outline-none placeholder-gray-500"
          />
          <button
            onClick={() => {
              if (accessInput === ACCESS_PASSWORD) {
                localStorage.setItem(ACCESS_KEY, '1');
                setAccessGranted(true);
              } else {
                setAccessError(true);
              }
            }}
            className="w-full h-11 bg-[#E11D48] text-white font-medium rounded-xl hover:bg-[#c41a3f] transition-colors"
          >
            进入
          </button>
          {accessError && <p className="text-red-400 text-xs text-center">密码错误</p>}
        </div>
        <p className="absolute bottom-10 text-gray-600 text-xs">内测中 · 敬请期待</p>
      </div>
    );
  }

  // Splash 完成，渲染完整应用
  return (
    <ErrorBoundary>
      <React.Suspense fallback={<PageLoader />}>
        <Routes>
          {/* 首页 */}
          <Route path="/" element={<Home />} />

          {/* 欢迎和认证 */}
          <Route path="/welcome" element={<Welcome />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* 主要功能页面 */}
          <Route path="/learn" element={<Learn />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/messages" element={<Messages />} />

          {/* 发布页面 */}
          <Route path="/publish/note" element={<PublishNote />} />
          <Route path="/publish/video" element={<PublishVideo />} />
          <Route path="/publish/plan" element={<PublishPlan />} />

          {/* 其他页面 */}
          <Route path="/vip" element={<VIP />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/drafts" element={<Drafts />} />
          <Route path="/history" element={<History />} />
          <Route path="/downloads" element={<Downloads />} />
          <Route path="/covenant" element={<Covenant />} />
          <Route path="/scan" element={<Scan />} />
          <Route path="/support" element={<Support />} />

          {/* 账户与设置 */}
          <Route path="/account" element={<AccountSecurity />} />
          <Route path="/display" element={<DisplaySettings />} />
          <Route path="/notification" element={<NotificationSettings />} />
          <Route path="/language" element={<LanguageSettings />} />
          <Route path="/content" element={<ContentPreferences />} />
          <Route path="/switch" element={<SwitchAccount />} />

          {/* 社交功能 */}
          <Route path="/add/friend" element={<AddFriend />} />
          <Route path="/add/group" element={<AddGroup />} />
          <Route path="/friends/add" element={<AddFriend />} />
          <Route path="/groups/add" element={<AddGroup />} />
          <Route path="/group-chat/:id" element={<GroupChatDetail />} />
          <Route path="/chat/:userId" element={<PrivateChat />} />

          {/* 账户与设置别名 */}
          <Route path="/account-security" element={<AccountSecurity />} />
          <Route path="/display-settings" element={<DisplaySettings />} />
          <Route path="/notification-settings" element={<NotificationSettings />} />
          <Route path="/language-settings" element={<LanguageSettings />} />
          <Route path="/content-preferences" element={<ContentPreferences />} />
          <Route path="/switch-account" element={<SwitchAccount />} />

          {/* 详情页（公开） */}
          <Route path="/religion/:id" element={<ReligionDetail />} />
          <Route path="/book/:id" element={<BookDetail />} />
          <Route path="/user/:id" element={<UserProfile />} />
          <Route path="/profile/:userId" element={<UserProfile />} />

          {/* 静默陪伴房间 */}
          <Route path="/room/:roomId" element={<SilentRoom />} />

          {/* 共境(静默同行)入口 */}
          <Route path="/gongjing" element={<Gongjing />} />

          {/* 管理员入口 */}
          <Route path="/admin/*" element={<AdminApp />} />

          {/* 404 处理 */}
          <Route path="*" element={<div style={{padding:'40px',textAlign:'center'}}><h2>{t('errors.notFound')}</h2><p>路径: {window.location.hash}</p><button onClick={()=>window.location.hash='/'} style={{marginTop:'20px',padding:'10px 20px',background:'#E11D48',color:'white',border:'none',borderRadius:'5px',cursor:'pointer'}}>{t('common.backHome')}</button></div>} />
        </Routes>
      </React.Suspense>
    </ErrorBoundary>
  );
}
