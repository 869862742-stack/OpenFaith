import React, { useCallback } from 'react';
import ErrorBoundary from '../components/ErrorBoundary';
import { ArrowLeft, User, Monitor, Bell, Globe, FileText, Users, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useThemeContext } from '../contexts/ThemeContext';
import { useAuthStore } from '../stores/auth';
import { supabase } from '../supabase/client';

function SettingsContent() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { primaryColor } = useThemeContext();

  // 夜间模式颜色
  const bgColor = 'var(--bg-color)';
  const cardBg = 'var(--card-bg)';
  const textColor = 'var(--text-color)';
  const textSecondary = 'var(--text-secondary)';
  const borderColor = 'var(--border-color)';
  const iconColor = 'var(--icon-color)';

  const settingsItems = [
    { id: 'account', label: t('settings.accountSecurity'), icon: User },
    { id: 'display', label: t('settings.display'), icon: Monitor },
    { id: 'notification', label: t('settings.notifications'), icon: Bell },
    { id: 'language', label: t('settings.language'), icon: Globe },
    { id: 'content', label: t('settings.content'), icon: FileText },
  ];

  const handleLogout = useCallback(() => {
    if (!window.confirm('确定要退出登录吗？')) return;
    const performLogout = async () => {
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
      window.location.hash = '#/login';
      window.location.reload();
    };
    performLogout();
  }, [navigate]);

  const handleItemClick = useCallback((id: string) => {
    navigate(`/${id}`);
  }, [navigate]);

  return (
    <div className="min-h-screen theme-transition" style={{ backgroundColor: bgColor }}>
      <header 
        className="sticky top-0 z-40 px-4 py-3 border-b theme-transition" 
        style={{ backgroundColor: bgColor, borderColor }}
      >
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2" style={{ color: textColor }}>
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold" style={{ color: textColor }}>{t('settings.title')}</h1>
        </div>
      </header>

      <div className="p-4">
        <div className="space-y-1">
          {settingsItems.map((item) => (
            <button 
              key={item.id} 
              onClick={() => handleItemClick(item.id)} 
              className="w-full flex items-center gap-4 px-4 py-4 rounded-xl theme-transition" 
              style={{ backgroundColor: cardBg }}
            >
              <item.icon className="w-5 h-5" style={{ color: iconColor }} />
              <span className="flex-1 text-left text-sm" style={{ color: textColor }}>{item.label}</span>
            </button>
          ))}
        </div>

        <div className="mt-6 pt-6 border-t space-y-1" style={{ borderColor }}>
          <button 
            onClick={() => navigate('/settings/switch-account')} 
            className="w-full flex items-center gap-4 px-4 py-4 rounded-xl theme-transition" 
            style={{ backgroundColor: cardBg }}
          >
            <Users className="w-5 h-5" style={{ color: iconColor }} />
            <span className="flex-1 text-left text-sm" style={{ color: textColor }}>{t('settings.switchAccount')}</span>
          </button>

          <button 
            onClick={handleLogout} 
            className="w-full flex items-center gap-4 px-4 py-4 rounded-xl theme-transition" 
            style={{ backgroundColor: cardBg }}
          >
            <LogOut className="w-5 h-5" style={{ color: primaryColor }} />
            <span className="flex-1 text-left text-sm font-medium" style={{ color: primaryColor }}>{t('common.logout')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function Settings() {
  return (
    <ErrorBoundary>
      <SettingsContent />
    </ErrorBoundary>
  );
}

export default Settings;
