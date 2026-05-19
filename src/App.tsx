import React, { useEffect, useState } from 'react';
import { useThemeContext } from './contexts/ThemeContext';
import ErrorBoundary from './components/ErrorBoundary';
import './styles/index.css';

// ============ 代码分割：核心页面（首屏必加载）===========
const SplashPage = React.lazy(() => import('./components/Splash'));

// ============ 代码分割：高频页面（用户经常访问）===========
const Learn = React.lazy(() => import('./pages/Learn'));
const Messages = React.lazy(() => import('./pages/Messages'));
const Profile = React.lazy(() => import('./pages/Profile'));

// ============ 代码分割：低频页面（偶尔访问）===========
const VIP = React.lazy(() => import('./pages/VIP'));
const Settings = React.lazy(() => import('./pages/Settings'));
const PublishNote = React.lazy(() => import('./pages/PublishNote'));
const PublishVideo = React.lazy(() => import('./pages/PublishVideo'));
const PublishPlan = React.lazy(() => import('./pages/PublishPlan'));
const Drafts = React.lazy(() => import('./pages/Drafts'));
const AddFriend = React.lazy(() => import('./pages/AddFriend'));
const AddGroup = React.lazy(() => import('./pages/AddGroup'));
const History = React.lazy(() => import('./pages/History'));
const Downloads = React.lazy(() => import('./pages/Downloads'));
const Covenant = React.lazy(() => import('./pages/Covenant'));
const Scan = React.lazy(() => import('./pages/Scan'));
const Support = React.lazy(() => import('./pages/Support'));
const AccountSecurity = React.lazy(() => import('./pages/AccountSecurity'));
const DisplaySettings = React.lazy(() => import('./pages/DisplaySettings'));
const NotificationSettings = React.lazy(() => import('./pages/NotificationSettings'));
const LanguageSettings = React.lazy(() => import('./pages/LanguageSettings'));
const ContentPreferences = React.lazy(() => import('./pages/ContentPreferences'));
const SwitchAccount = React.lazy(() => import('./pages/SwitchAccount'));

// ============ 代码分割：详情页（按需加载）===========
const ReligionDetail = React.lazy(() => import('./pages/ReligionDetail'));
const BookDetail = React.lazy(() => import('./pages/BookDetail'));

// ============ 代码分割：管理员页面（独立 chunk）===========
const AdminApp = React.lazy(() => import('./admin/App'));

// ============ 星空粒子背景（仅dark模式） ============
function StarField() {
  const [stars] = useState(() => 
    Array.from({ length: 40 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: Math.random() * 2 + 1,
      delay: Math.random() * 3,
      duration: 2 + Math.random() * 3,
    }))
  );

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      zIndex: 0,
      overflow: 'hidden',
    }}>
      {stars.map(star => (
        <div
          key={star.id}
          style={{
            position: 'absolute',
            width: star.size,
            height: star.size,
            backgroundColor: 'rgba(255, 255, 255, 0.6)',
            borderRadius: '50%',
            left: star.left + '%',
            top: star.top + '%',
            animation: `starTwinkle ${star.duration}s ease-in-out infinite`,
            animationDelay: star.delay + 's',
          }}
        />
      ))}
    </div>
  );
}

// ============ Loading 组件（与开机画面风格一致，蓝色背景无缝过渡）===========
function PageLoader() {
  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ background: 'radial-gradient(ellipse at center, #1a1a2e 0%, #0a0a15 100%)' }}>
      <div className="flex items-center gap-3">
        <span className="text-white text-3xl font-bold tracking-wide">Open Faith</span>
        <span className="text-white/50 text-3xl font-light">·</span>
        <span className="text-white text-3xl font-bold tracking-wide">Open World</span>
      </div>
    </div>
  );
}

// ============ 主应用组件 ============
function App() {
  const { themeMode } = useThemeContext();
  const isDark = themeMode === 'dark';

  return (
    <ErrorBoundary>
      {isDark && <StarField />}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <React.Suspense fallback={<PageLoader />}>
          {/* Splash 初始化组件 - 只在首次加载时运行 */}
          <SplashPage />
        </React.Suspense>
      </div>
    </ErrorBoundary>
  );
}

export default App;
