import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home, Compass, Bell, User, Plus, Moon } from 'lucide-react';
import { useThemeContext } from '../contexts/ThemeContext';
import CreateRoom from '../pages/CreateRoom';

// 安全默认值
const DEFAULT_PRIMARY_COLOR = '#E11D48';

// Service Role Key
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkaHdtZWl0dGdkb3Nta3h0cGFrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODEzMjQ5MiwiZXhwIjoyMDkzNzA4NDkyfQ.bPatiu7NXaE2k48aTkjAGQsba6NzXlIdq2k_gGLYLBE';

interface NavItem {
  id: string;
  label: string;
  icon: typeof Home;
  path: string;
}

// 获取当前 hash 路由路径
function getHashPath(): string {
  const hash = window.location.hash;
  if (hash && hash.startsWith('#')) {
    return hash.substring(1) || '/';
  }
  return '/';
}

function BottomNav() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [showPublishMenu, setShowPublishMenu] = useState(false);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [unreadNoteCount, setUnreadNoteCount] = useState(0);

  // 获取笔记申请通知未读数
  const fetchUnreadNoteCount = async () => {
    try {
      const userInfo = localStorage.getItem('user_info');
      if (!userInfo) return;
      const parsed = JSON.parse(userInfo);
      const userId = parsed.user_id || parsed.id;
      if (!userId) return;

      const res = await fetch(
        `/sb-api/rest/v1/notifications?user_id=eq.${userId}&type=eq.note_request_approved&is_read=eq.false&select=id`,
        {
          headers: {
            'apikey': SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          }
        }
      );
      if (res.ok) {
        const data = await res.json();
        // 只取第一条用于判断是否有未读
        setUnreadNoteCount(Array.isArray(data) ? data.length : 0);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchUnreadNoteCount();
    // 每30秒刷新一次
    const interval = setInterval(fetchUnreadNoteCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // Tab 配置
  const navItems: NavItem[] = [
    { id: 'home', label: t('nav.home') || '首页', icon: Home, path: '/' },
    { id: 'learn', label: t('nav.learn') || '学习', icon: Compass, path: '/learn' },
    { id: 'publish', label: t('nav.publish') || '发布', icon: Plus, path: '/publish/note' },
    { id: 'messages', label: t('nav.messages') || '消息', icon: Bell, path: '/messages' },
    { id: 'profile', label: t('nav.profile') || '我的', icon: User, path: '/profile' },
  ];

  // 使用 hash 路径判断当前 Tab
  const currentPath = getHashPath();
  const activeTab = navItems.find(item => currentPath === item.path || currentPath.startsWith(item.path + '/'))?.id || 'home';

  const handleNavClick = (item: NavItem) => {
    if (item.id === 'publish') {
      setShowPublishMenu(true);
    } else {
      // 使用 hash 路由导航
      window.location.hash = item.path;
    }
  };

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 border-t z-50 bg-[var(--card-bg)] border-[var(--border-color)]">
        <div className="flex items-center justify-around px-2 pb-1.5 pt-0.5 max-w-md mx-auto">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            const isPublish = item.id === 'publish';

            if (isPublish) {
              return (
                <button key={item.id} onClick={() => handleNavClick(item)} className="relative -mt-2">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform" style={{ backgroundColor: DEFAULT_PRIMARY_COLOR }}>
                    <Plus className="w-5 h-5 text-white" />
                  </div>
                </button>
              );
            }

            return (
              <button key={item.id} onClick={() => handleNavClick(item)} className="flex flex-col items-center justify-center py-0.5 px-2 min-w-[50px] active:opacity-70 relative">
                <div className="relative">
                  <item.icon className={`w-5 h-5 ${isActive ? 'text-[var(--theme-primary)]' : 'text-[var(--text-secondary)]'}`} />
                  {item.id === 'messages' && unreadNoteCount > 0 && (
                    <span
                      className="absolute -top-1 -right-1 w-2 h-2 rounded-full"
                      style={{ backgroundColor: DEFAULT_PRIMARY_COLOR }}
                    />
                  )}
                </div>
                <span className={`text-[10px] mt-0.5 ${isActive ? 'text-[var(--theme-primary)]' : 'text-[var(--text-secondary)]'}`}>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {showPublishMenu && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end" onClick={() => setShowPublishMenu(false)}>
          <div className="w-full rounded-t-2xl p-6 bg-[var(--card-bg)]" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4 text-center text-[var(--text-color)]">{t('publish.title')}</h3>
            {/* 从上到下从左到右：笔记、房间、计划、草稿 */}
            <div className="grid grid-cols-2 gap-4">
              {/* 笔记（合并图文+视频） */}
              <button onClick={() => { window.location.hash = '/publish/note'; setShowPublishMenu(false); }} className="flex flex-col items-center p-4 rounded-xl bg-[var(--bg-secondary)]">
                <div className="w-12 h-12 rounded-full flex items-center justify-center mb-2" style={{ backgroundColor: 'var(--theme-primary)15' }}>
                  <svg className="w-6 h-6 text-[var(--theme-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <span className="text-sm text-[var(--text-color)]">笔记</span>
              </button>
              {/* 房间 */}
              <button onClick={() => { setShowPublishMenu(false); setShowCreateRoom(true); }} className="flex flex-col items-center p-4 rounded-xl bg-[var(--bg-secondary)]">
                <div className="w-12 h-12 rounded-full flex items-center justify-center mb-2" style={{ backgroundColor: 'var(--theme-primary)15' }}>
                  <Moon className="w-6 h-6" style={{ color: 'var(--theme-primary)' }} />
                </div>
                <span className="text-sm text-[var(--text-color)]">房间</span>
              </button>
              {/* 计划（学习计划改为计划） */}
              <button onClick={() => { window.location.hash = '/publish/plan'; setShowPublishMenu(false); }} className="flex flex-col items-center p-4 rounded-xl bg-[var(--bg-secondary)]">
                <div className="w-12 h-12 rounded-full flex items-center justify-center mb-2" style={{ backgroundColor: 'var(--theme-primary)15' }}>
                  <svg className="w-6 h-6 text-[var(--theme-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <span className="text-sm text-[var(--text-color)]">计划</span>
              </button>
              {/* 草稿（草稿箱改为草稿） */}
              <button onClick={() => { window.location.hash = '/drafts'; setShowPublishMenu(false); }} className="flex flex-col items-center p-4 rounded-xl bg-[var(--bg-secondary)]">
                <div className="w-12 h-12 rounded-full flex items-center justify-center mb-2" style={{ backgroundColor: 'var(--theme-primary)15' }}>
                  <svg className="w-6 h-6 text-[var(--theme-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <span className="text-sm text-[var(--text-color)]">草稿</span>
              </button>
            </div>
            <button onClick={() => setShowPublishMenu(false)} className="w-full mt-4 py-3 font-medium text-[var(--text-secondary)]">{t('common.cancel')}</button>
          </div>
        </div>
      )}

      {/* 创建房间弹窗 */}
      {showCreateRoom && <CreateRoom onClose={() => setShowCreateRoom(false)} />}
    </>
  );
}

export default BottomNav;
