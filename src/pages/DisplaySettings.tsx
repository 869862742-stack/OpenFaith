import React, { useState, useCallback, useEffect } from 'react';

import { ArrowLeft, Sun, Moon, Check, Type } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../supabase/client';
import { useThemeContext } from '../contexts/ThemeContext';

const PRIMARY_COLOR = '#2563EB';

const themes = [
  { id: 'default', name: '星空蓝', color: '#2563EB', nameKey: 'default' },
  { id: 'forest', name: '森林绿', color: '#22C55E', nameKey: 'forest' },
  { id: 'lavender', name: '薰衣草紫', color: '#8B5CF6', nameKey: 'lavender' },
  { id: 'rose', name: '玫瑰粉', color: '#EC4899', nameKey: 'rose' },
  { id: 'ocean', name: '深海青', color: '#14B8A6', nameKey: 'ocean' },
  { id: 'sunset', name: '日落橙', color: '#F97316', nameKey: 'sunset' },
  { id: 'berry', name: '浆果红', color: '#DC2626', nameKey: 'berry' },
  { id: 'mint', name: '薄荷绿', color: '#10B981', nameKey: 'mint' },
  { id: 'coral', name: '珊瑚粉', color: '#FB7185', nameKey: 'coral' },
  { id: 'indigo', name: '靛青蓝', color: '#6366F1', nameKey: 'indigo' },
  { id: 'amber', name: '琥珀金', color: '#F59E0B', nameKey: 'amber' },
  { id: 'faith', name: '信仰红', color: '#2563EB', nameKey: 'faith' },
];

const fontSizes = [
  { id: 'small', nameKey: 'small', desc: '12px / 14px' },
  { id: 'standard', nameKey: 'standard', desc: '14px / 16px' },
  { id: 'large', nameKey: 'large', desc: '16px / 18px' },
];

interface ProfileData {
  is_vip: boolean;
  theme_mode: 'light' | 'dark';
  theme_color: string;
  font_size: 'small' | 'standard' | 'large';
}

function DisplaySettings() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { themeMode, themeColor, fontSize, setThemeMode, setThemeColor, setFontSize } = useThemeContext();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          try {
            const { data } = await supabase
              .from('profiles')
              .select('is_vip, theme_mode, theme_color, font_size')
              .eq('id', session.user.id)
              .maybeSingle();
            if (data) {
              setProfile(data);
            }
          } catch (e) {
            console.error('Failed to fetch profile:', e);
          }
        }
      } catch (err) {
        console.error('[DisplaySettings] fetchProfile error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const isVip = profile?.is_vip || false;

  const updateProfile = async (updates: Partial<ProfileData>) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return { error: new Error('Not authenticated') };
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', session.user.id);
    return { error };
  };

  const handleThemeModeChange = useCallback(async (mode: 'light' | 'dark') => {
    setThemeMode(mode);  // 同步到 ThemeContext
    setIsSaving(true);
    await updateProfile({ theme_mode: mode });
    setIsSaving(false);
  }, [setThemeMode]);

  const handleThemeSelect = useCallback(async (themeId: string) => {
    if (!isVip) {
      alert(t('vip.themeColorRequired'));
      return;
    }
    setThemeColor(themeId);  // 同步到 ThemeContext
    setIsSaving(true);
    await updateProfile({ theme_color: themeId });
    setIsSaving(false);
  }, [setThemeColor, isVip, t]);

  const handleFontSizeChange = useCallback(async (size: 'small' | 'standard' | 'large') => {
    setFontSize(size);  // 同步到 ThemeContext
    setIsSaving(true);
    await updateProfile({ font_size: size });
    setIsSaving(false);
  }, [setFontSize]);

  const currentTheme = themes.find(t => t.id === themeColor);
  const selectedTheme = themeColor;

  const getPreviewTextSize = () => {
    switch (fontSize) {
      case 'small': return 'text-xs';
      case 'large': return 'text-base';
      default: return 'text-sm';
    }
  };

  const getPreviewTitleSize = () => {
    switch (fontSize) {
      case 'small': return 'text-sm';
      case 'large': return 'text-lg';
      default: return 'text-base';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-color)' }}>
        <div className="animate-spin w-8 h-8 border-2 border-current border-t-transparent rounded-full" style={{ color: PRIMARY_COLOR }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen theme-transition" style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-color)' }}>
      <header className="sticky top-0 z-40 px-4 py-3 border-b theme-transition" style={{ backgroundColor: 'var(--bg-color)', borderColor: 'var(--border-color)' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 theme-transition" style={{ color: 'var(--text-color)' }}>
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold theme-transition" style={{ color: 'var(--text-color)' }}>{t('settings.display')}</h1>
          {isSaving && <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{t('common.loading')}</span>}
        </div>
      </header>

      <div className="p-4">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold" style={{ color: 'var(--text-color)' }}>{t('display.themeMode')}</h2>
          </div>
          <div className="flex gap-3">
            <button onClick={() => handleThemeModeChange('light')} className="flex-1 h-20 rounded-xl border-2 flex flex-col items-center justify-center gap-1 theme-transition" style={{ borderColor: themeMode === 'light' ? PRIMARY_COLOR : 'var(--border-color)', backgroundColor: themeMode === 'light' ? `${PRIMARY_COLOR}15` : 'var(--card-bg)' }}>
              <Sun className="w-5 h-5" style={{ color: themeMode === 'light' ? PRIMARY_COLOR : 'var(--icon-color)' }} />
              <span className="text-xs font-medium" style={{ color: themeMode === 'light' ? PRIMARY_COLOR : 'var(--text-secondary)' }}>{t('display.lightMode')}</span>
            </button>
            <button onClick={() => handleThemeModeChange('dark')} className="flex-1 h-20 rounded-xl border-2 flex flex-col items-center justify-center gap-1 theme-transition" style={{ borderColor: themeMode === 'dark' ? PRIMARY_COLOR : 'var(--border-color)', backgroundColor: themeMode === 'dark' ? `${PRIMARY_COLOR}15` : 'var(--card-bg)' }}>
              <Moon className="w-5 h-5" style={{ color: themeMode === 'dark' ? PRIMARY_COLOR : 'var(--icon-color)' }} />
              <span className="text-xs font-medium" style={{ color: themeMode === 'dark' ? PRIMARY_COLOR : 'var(--text-secondary)' }}>{t('display.darkMode')}</span>
            </button>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold" style={{ color: 'var(--text-color)' }}>{t('display.themeColor')}</h2>
            {!isVip && <span className="text-xs" style={{ color: PRIMARY_COLOR }}>{t('vip.title')}</span>}
          </div>
          <div className="grid grid-cols-4 gap-3">
            {themes.map((theme) => (
              <button key={theme.id} onClick={() => handleThemeSelect(theme.id)} className="relative h-16 rounded-xl flex flex-col items-center justify-center gap-1 theme-transition" style={{ backgroundColor: `${theme.color}15`, border: selectedTheme === theme.id ? `2px solid ${theme.color}` : '2px solid transparent' }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: theme.color }}>
                  {selectedTheme === theme.id && <Check className="w-5 h-5 text-white" />}
                </div>
                <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{theme.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold" style={{ color: 'var(--text-color)' }}>{t('display.fontSize')}</h2>
          </div>
          <div className="rounded-xl p-4 theme-transition" style={{ backgroundColor: 'var(--bg-secondary)' }}>
            <div className="flex gap-2">
              {fontSizes.map((size) => (
                <button key={size.id} onClick={() => handleFontSizeChange(size.id as 'small' | 'standard' | 'large')} className="flex-1 py-3 px-2 rounded-xl border-2 theme-transition" style={{ borderColor: fontSize === size.id ? PRIMARY_COLOR : 'var(--border-color)', backgroundColor: fontSize === size.id ? `${PRIMARY_COLOR}15` : 'var(--card-bg)' }}>
                  <div className="text-center">
                    <span className="text-sm font-medium block mb-1" style={{ color: fontSize === size.id ? PRIMARY_COLOR : 'var(--text-color)' }}>{t(`display.${size.nameKey}`)}</span>
                    <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{size.desc}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-xl p-4 theme-transition" style={{ backgroundColor: 'var(--bg-secondary)' }}>
          <div className="flex items-center gap-2 mb-3">
            <Type className="w-4 h-4" style={{ color: PRIMARY_COLOR }} />
            <span className="text-sm font-medium" style={{ color: 'var(--text-color)' }}>{t('display.preview')}</span>
          </div>
          <div className="rounded-xl p-4 theme-transition" style={{ backgroundColor: 'var(--card-bg)', border: `1px solid var(--border-color)` }}>
            <h3 className={`font-bold mb-2 ${getPreviewTitleSize()}`} style={{ color: 'var(--text-color)' }}>{t('display.previewTitle')}</h3>
            <p className={`${getPreviewTextSize()} leading-relaxed`} style={{ color: 'var(--text-secondary)' }}>{t('display.previewText')}</p>
            <div className="flex gap-2 mt-3">
              <button className="px-3 py-1.5 rounded-full text-xs font-medium theme-transition" style={{ backgroundColor: PRIMARY_COLOR, color: '#FFFFFF' }}>{t('common.confirm')}</button>
              <button className="px-3 py-1.5 rounded-full text-xs font-medium theme-transition" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-color)', border: `1px solid var(--border-color)` }}>{t('common.cancel')}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DisplaySettings;
