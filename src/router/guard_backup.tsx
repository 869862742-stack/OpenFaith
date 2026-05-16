/**
 * 路由权限守卫
 */
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';

const PUBLIC_PATHS = ['/', '/login', '/register', '/books', '/book', '/community', '/profile', '/learn', '/messages', '/settings'];

export function RouterGuard({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const token = useAuthStore((state) => state.token);
  const isInitialized = useAuthStore((state) => state.isInitialized);

  if (!isInitialized) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '18px'
      }}>
        加载中...
      </div>
    );
  }

  const isPublic = PUBLIC_PATHS.some(p => location.pathname.startsWith(p));
  const savedToken = localStorage.getItem('user_token');

  if (!token && !savedToken && !isPublic) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
}
