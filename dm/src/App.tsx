import React from 'react';
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

// ============ Loading 组件（与开机画面风格一致，红色背景无缝过渡）===========
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

// ============ 主应用组件 ============
function App() {
  return (
    <ErrorBoundary>
      <React.Suspense fallback={<PageLoader />}>
        {/* Splash 初始化组件 - 只在首次加载时运行 */}
        <SplashPage />
      </React.Suspense>
    </ErrorBoundary>
  );
}

export default App;
