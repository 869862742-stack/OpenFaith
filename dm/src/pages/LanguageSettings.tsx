import React, { useState, useEffect, useCallback } from 'react';

import { ArrowLeft, Check, Globe, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { changeLanguage, getCurrentLanguage } from '../i18n';

const PRIMARY_COLOR = '#E11D48';

const languages = [
  { id: 'zh-CN', name: '简体中文', nativeName: '简体中文', flag: '🇨🇳' },
  { id: 'en-US', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { id: 'fr-FR', name: 'Français', nativeName: 'Français', flag: '🇫🇷' },
  { id: 'es-ES', name: 'Español', nativeName: 'Español', flag: '🇪🇸' },
  { id: 'ru-RU', name: 'Русский', nativeName: 'Русский', flag: '🇷🇺' },
  { id: 'ar-EG', name: 'العربية', nativeName: 'العربية', flag: '🇸🇦' },
];

function LanguageSettings() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [selectedLang, setSelectedLang] = useState(getCurrentLanguage());
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    setSelectedLang(getCurrentLanguage());
  }, [i18n.language]);

  const handleSelect = useCallback(async (langId: string) => {
    if (langId === selectedLang) return;

    setIsLoading(true);

    try {
      await changeLanguage(langId);
      setSelectedLang(langId);
      setShowSuccess(true);

      setTimeout(() => {
        setShowSuccess(false);
      }, 2000);
    } catch (error) {
      console.error('Language change failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedLang]);

  const currentLang = languages.find(l => l.id === selectedLang);

  return (
    <div className="min-h-screen theme-transition" style={{ backgroundColor: 'var(--bg-color)' }}>
      <header className="sticky top-0 z-40 px-4 py-3 border-b theme-transition" style={{ backgroundColor: 'var(--bg-color)', borderColor: 'var(--border-color)' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2" style={{ color: 'var(--text-color)' }}>
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold" style={{ color: 'var(--text-color)' }}>{t('language.title')}</h1>
        </div>
      </header>

      <div className="p-4">
        <div className="rounded-xl p-4 mb-4" style={{ backgroundColor: `${PRIMARY_COLOR}15` }}>
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4" style={{ color: PRIMARY_COLOR }} />
            <span className="text-sm" style={{ color: PRIMARY_COLOR }}>{t('language.current')}: {currentLang?.nativeName}</span>
          </div>
        </div>

        <div className="space-y-2">
          {languages.map((lang, index) => (
            <button key={lang.id} onClick={() => handleSelect(lang.id)} disabled={isLoading} className="w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all" style={{ borderColor: selectedLang === lang.id ? PRIMARY_COLOR : 'transparent', backgroundColor: selectedLang === lang.id ? `${PRIMARY_COLOR}15` : 'var(--card-bg)', opacity: isLoading ? 0.5 : 1 }}>
              <div className="flex items-center gap-3">
                <span className="text-xl">{lang.flag}</span>
                <div className="text-left">
                  <span className="text-sm font-medium" style={{ color: selectedLang === lang.id ? PRIMARY_COLOR : 'var(--text-color)' }}>{lang.nativeName}</span>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{lang.name}</p>
                </div>
              </div>
              {selectedLang === lang.id && <Check className="w-5 h-5" style={{ color: PRIMARY_COLOR }} />}
            </button>
          ))}
        </div>

        <div className="mt-6 p-4 rounded-xl" style={{ backgroundColor: 'var(--bg-secondary)' }}>
          <p className="text-xs text-center" style={{ color: 'var(--text-secondary)' }}>{t('language.updateImmediately')}</p>
        </div>
      </div>

      {isLoading && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
          <div className="rounded-2xl p-6 flex flex-col items-center gap-3 theme-transition" style={{ backgroundColor: 'var(--bg-color)' }}>
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: PRIMARY_COLOR }} />
            <span className="text-sm" style={{ color: 'var(--text-color)' }}>{t('language.switching')}</span>
          </div>
        </div>
      )}

      {showSuccess && (
        <div className="fixed bottom-20 left-4 right-4 z-50">
          <div className="px-4 py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg" style={{ backgroundColor: PRIMARY_COLOR, color: '#FFFFFF' }}>
            <Check className="w-5 h-5" />
            <span className="text-sm font-medium">{t('language.switchSuccess')}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default LanguageSettings;
