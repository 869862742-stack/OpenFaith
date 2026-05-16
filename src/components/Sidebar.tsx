import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/auth';
import { supabase } from '../supabase/client';
import { UserPlus, Users, Clock, Download, FileText, ScanLine, Headphones, Crown, Shield, Settings, X, LogOut } from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // 检查当前用户是否是管理员（profiles.role = 'admin'）
    const checkAdmin = async () => {
      const authStore = useAuthStore.getState();
      const userId = authStore.userInfo?.id;
      if (!userId) {
        setIsAdmin(false);
        return;
      }
      try {
        const res = await fetch(`/sb-api/rest/v1/profiles?user_id=eq.${userId}&select=role`, {
          headers: {
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkaHdtZWl0dGdkb3Nta3h0cGFrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODEzMjQ5MiwiZXhwIjoyMDkzNzA4NDkyfQ.bPatiu7NXaE2k48aTkjAGQsba6NzXlIdq2k_gGLYLBE',
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkaHdtZWl0dGdkb3Nta3h0cGFrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODEzMjQ5MiwiZXhwIjoyMDkzNzA4NDkyfQ.bPatiu7NXaE2k48aTkjAGQsba6NzXlIdq2k_gGLYLBE',
          }
        });
        if (res.ok) {
          const data = await res.json();
          setIsAdmin(data?.[0]?.role === 'admin');
        } else {
          setIsAdmin(false);
        }
      } catch {
        setIsAdmin(false);
      }
    };
    checkAdmin();
  }, [isOpen]);

  // 管理后台菜单项仅在管理员角色时可见
  const menuItems = [
    { id: 'history', label: t('sidebar.history') || '浏览记录', icon: Clock, path: '/history' },
    { id: 'download', label: t('sidebar.download') || '我的下载', icon: Download, path: '/downloads' },
    { id: 'covenant', label: t('sidebar.covenant') || '信仰公约', icon: FileText, path: '/covenant' },
    { id: 'scan', label: t('sidebar.scan') || '扫一扫', icon: ScanLine, path: '/scan' },
    { id: 'support', label: t('sidebar.welcomeContact') || '欢迎联系', icon: Headphones, path: '/support' },
    { id: 'vip', label: t('sidebar.vip') || '订阅会员', icon: Crown, path: '/vip', highlight: true },
    ...(isAdmin ? [{ id: 'admin', label: t('sidebar.admin') || '管理后台', icon: Shield, path: '/admin' }] : []),
    { id: 'settings', label: t('sidebar.settings') || '设置', icon: Settings, path: '/settings' },
  ];

  const handleMenuClick = (item: typeof menuItems[0]) => {
    if (item.id === 'admin') {
      // 只有管理员角色才能进入管理后台
      if (!isAdmin) {
        alert('无权访问管理后台');
        return;
      }
      navigate('/admin');
      onClose();
      return;
    }

    if (item.external) {
      window.location.href = item.path;
    } else if (item.path) {
      navigate(item.path);
    }
    onClose();
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error('SignOut error:', e);
    }
    // 清理 localStorage 中的认证信息
    try {
      localStorage.removeItem('user_token');
      localStorage.removeItem('sb_auth');
      localStorage.removeItem('user_info');
      localStorage.removeItem('openfaith_admin_token');
      localStorage.removeItem('openfaith_admin_auth');
    } catch (e) {
      console.error('LocalStorage cleanup error:', e);
    }
    // 重置 auth store
    useAuthStore.getState().logout();
    navigate('/login');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 bg-black/30 z-50" />
      <div className="fixed left-0 top-0 bottom-0 w-72 z-50 shadow-lg overflow-y-auto bg-[var(--card-bg)] text-[var(--text-color)]">
        <div className="p-4 pb-24">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full border border-[var(--border-color)] text-[var(--text-secondary)]"
          >
            <X className="w-5 h-5" />
          </button>

          <nav className="space-y-1">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleMenuClick(item)}
                className="w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-colors active:scale-95 hover:bg-[var(--bg-secondary)]"
              >
                <item.icon className={`w-5 h-5 ${item.highlight ? 'text-[var(--theme-primary)]' : 'text-[var(--text-secondary)]'}`} />
                <span className={`font-medium ${item.highlight ? 'text-[var(--theme-primary)]' : 'text-[var(--text-color)]'}`}>
                  {item.label}
                </span>
              </button>
            ))}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-colors active:scale-95 hover:bg-[var(--bg-secondary)] text-[var(--theme-primary)]"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">{t('common.logout')}</span>
            </button>
          </nav>
        </div>
      </div>
    </>
  );
}

export default Sidebar;