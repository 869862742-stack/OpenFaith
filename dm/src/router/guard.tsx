/**
 * 路由权限守卫
 * 
 * 逻辑：
 * 1. 从 useAuthStore 读取 token 和 isInitialized
 * 2. 直接同步读取 localStorage.getItem('user_token')
 * 3. isInitialized 为 false 时显示加载中
 * 4. 合并 token：storeToken || localStorage token
 * 5. 无 token 且非公开路径时重定向到 /login
 */
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';

// 公开路径列表
const PUBLIC_PATHS = [
  '/',
  '/login',
  '/register',
  '/loading',
  '/books',
  '/book',
  '/community',
  '/learn',
  '/messages',
  '/profile',
  '/settings',
  '/welcome',
  '/splash',
  // 新增公开路径
  '/mine',
  '/me',
  '/chat',
  '/vip',
  '/search',
  '/discover',
  '/notifications',
  '/help',
  '/about',
  '/feedback',
  '/bookshelf',
  '/library',
  // 静默房间
  '/room',
];

/**
 * 从 hash 路由中提取路径
 * 例如: #/profile -> /profile
 */
function getHashPath(): string {
  const hash = window.location.hash;
  if (hash && hash.startsWith('#')) {
    const path = hash.substring(1) || '/';
    // 处理 base path 前缀（如 /dm）
    const base = window.__POWERED_BY_QIANKUN__ ? '/dm' : '';
    return base ? path.replace(new RegExp(`^${base}`), '') || '/' : path;
  }
  return '/';
}

/**
 * 检查路径是否为公开路径
 */
function isPublicPath(path: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => path === p || path.startsWith(p + '/') || (p === '/' && path === '/')
  );
}

/**
 * 路由守卫组件
 */
export function RouterGuard({ children }: { children: React.ReactNode }) {
  // 直接从 store 读取
  const storeToken = useAuthStore((state) => state.token);
  const storeIsInitialized = useAuthStore((state) => state.isInitialized);

  // 同步读取 localStorage
  const localStorageToken = localStorage.getItem('user_token');

  // 获取当前 hash 路径
  const currentPath = getHashPath();

  // 调试日志
  console.log('[RouterGuard]', {
    currentPath,
    storeToken: !!storeToken,
    storeIsInitialized,
    localStorageToken: !!localStorageToken,
  });

  // 步骤1: 等待初始化
  if (!storeIsInitialized) {
    console.log('[RouterGuard] 等待初始化...');
    return <div style={{ color: '#E11D48' }}>加载中...</div>;
  }

  // 步骤2: 合并 token
  const tokenToCheck = storeToken || localStorageToken;

  // 步骤3: 检查公开路径
  const publicPath = isPublicPath(currentPath);

  // 步骤4: 判断是否放行
  if (!tokenToCheck && !publicPath) {
    console.log('[RouterGuard] 无 token 且非公开路径，重定向到 /login');
    return <Navigate to="/login" state={{ from: currentPath }} replace />;
  }

  // 放行
  console.log('[RouterGuard] 放行');
  return <>{children}</>;
}
