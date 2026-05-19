import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '../supabase/client';

interface ThemeContextType {
  themeMode: 'light' | 'dark';
  themeColor: string;
  fontSize: 'small' | 'standard' | 'large';
  setThemeMode: (mode: 'light' | 'dark') => void;
  setThemeColor: (color: string) => void;
  setFontSize: (size: 'small' | 'standard' | 'large') => void;
  primaryColor: string;
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_COLORS: { [key: string]: string } = {
  default: '#2563EB',
  forest: '#22C55E',
  lavender: '#8B5CF6',
  rose: '#EC4899',
  ocean: '#14B8A6',
  sunset: '#F97316',
  berry: '#DC2626',
  mint: '#10B981',
  coral: '#FB7185',
  indigo: '#6366F1',
  amber: '#F59E0B',
  faith: '#2563EB',
};

const STORAGE_KEY = 'openfaith-display-settings';
const THEME_VERSION_KEY = 'openfaith-theme-version';
const CURRENT_THEME_VERSION = 2; // v2: 星空深色默认

interface StoredSettings {
  themeMode: 'light' | 'dark';
  themeColor: string;
  fontSize: 'small' | 'standard' | 'large';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeMode, setThemeModeState] = useState<'light' | 'dark'>('dark');
  const [themeColor, setThemeColorState] = useState<string>('default');
  const [fontSize, setFontSizeState] = useState<'small' | 'standard' | 'large'>('standard');
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // 应用主题到 DOM
  const applyTheme = useCallback((mode: 'light' | 'dark', color: string, size: 'small' | 'standard' | 'large') => {
    try {
      document.documentElement.setAttribute('data-theme', mode);
      document.documentElement.style.setProperty('--theme-primary', THEME_COLORS[color] || THEME_COLORS.default);
      document.documentElement.setAttribute('data-font-size', size);
    } catch (e) {
      console.error('Failed to apply theme:', e);
    }
  }, []);

  // 从数据库加载用户主题设置
  const loadThemeFromDatabase = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data } = await supabase
          .from('profiles')
          .select('theme_mode, theme_color, font_size')
          .eq('id', session.user.id)
          .maybeSingle();
        
        if (data) {
          // v2版本：始终强制dark模式（星空深色主题为默认）
          // 不管数据库存了什么，v2版本默认dark
          const mode = 'dark';
          const color = data.theme_color || 'default';
          const size = data.font_size || 'standard';
          
          // 标记当前主题版本
          localStorage.setItem(THEME_VERSION_KEY, String(CURRENT_THEME_VERSION));
          
          setThemeModeState(mode);
          setThemeColorState(color);
          setFontSizeState(size);
          
          // 应用到 DOM
          applyTheme(mode, color, size);
          
          // 保存到 localStorage
          const settings: StoredSettings = { themeMode: mode, themeColor: color, fontSize: size };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
          
          // 如果数据库存的不是dark，同步更新
          if (data.theme_mode !== 'dark') {
            supabase
              .from('profiles')
              .update({ theme_mode: 'dark' })
              .eq('id', session.user.id)
              .then(() => console.log('[Theme] Updated theme_mode to dark in database'));
          }
          
          setIsInitialized(true);
          return;
        }
      }
    } catch (e) {
      console.error('Failed to load theme from database:', e);
    }
    setIsInitialized(true);
  }, [applyTheme]);

  // 初始化加载 - 默认dark模式，避免白色闪烁
  useEffect(() => {
    // 先强制应用dark模式（HTML已经设了data-theme="dark"）
    // v2版本：始终强制dark
    
    // v2版本：始终强制dark模式（星空深色主题为默认）
    // 不再从localStorage读取themeMode，v2默认就是dark
    const stored = localStorage.getItem(STORAGE_KEY);
    
    if (stored) {
      try {
        const settings: StoredSettings = JSON.parse(stored);
        // v2只读取颜色和字号，不读themeMode
        if (settings.themeColor) setThemeColorState(settings.themeColor);
        if (settings.fontSize) setFontSizeState(settings.fontSize);
        applyTheme('dark', settings.themeColor || 'default', settings.fontSize || 'standard');
      } catch {
        applyTheme('dark', 'default', 'standard');
      }
    } else {
      applyTheme('dark', 'default', 'standard');
    }
    
    setThemeModeState('dark');
    localStorage.setItem(THEME_VERSION_KEY, String(CURRENT_THEME_VERSION));
    
    // 从数据库加载（会覆盖 localStorage）
    const timer = setTimeout(() => {
      loadThemeFromDatabase().finally(() => {
        setIsLoading(false);
      });
    }, 100);
    
    return () => clearTimeout(timer);
  }, []); // 空依赖数组，只在首次渲染时执行

  // 监听状态变化并同步到 DOM 和 LocalStorage
  useEffect(() => {
    if (!isInitialized) return;

    applyTheme(themeMode, themeColor, fontSize);

    const settings: StoredSettings = { themeMode, themeColor, fontSize };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [themeMode, themeColor, fontSize, isInitialized, applyTheme]);

  const setThemeMode = useCallback(async (mode: 'light' | 'dark') => {
    setThemeModeState(mode);
    
    // 保存到数据库
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await supabase
          .from('profiles')
          .update({ theme_mode: mode })
          .eq('id', session.user.id);
      }
    } catch (e) {
      console.error('Failed to save theme mode:', e);
    }
  }, []);

  const setThemeColor = useCallback(async (color: string) => {
    setThemeColorState(color);
    
    // 保存到数据库
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await supabase
          .from('profiles')
          .update({ theme_color: color })
          .eq('id', session.user.id);
      }
    } catch (e) {
      console.error('Failed to save theme color:', e);
    }
  }, []);

  const setFontSize = useCallback(async (size: 'small' | 'standard' | 'large') => {
    setFontSizeState(size);
    
    // 保存到数据库
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await supabase
          .from('profiles')
          .update({ font_size: size })
          .eq('id', session.user.id);
      }
    } catch (e) {
      console.error('Failed to save font size:', e);
    }
  }, []);

  const primaryColor = THEME_COLORS[themeColor] || THEME_COLORS.default;

  return (
    <ThemeContext.Provider
      value={{
        themeMode,
        themeColor,
        fontSize,
        setThemeMode,
        setThemeColor,
        setFontSize,
        primaryColor,
        isLoading,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useThemeContext must be used within a ThemeProvider');
  }
  return context;
}

export { THEME_COLORS };
