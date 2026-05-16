import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import zhCN from './locales/zh-CN.json';
import enUS from './locales/en-US.json';
import frFR from './locales/fr-FR.json';
import esES from './locales/es-ES.json';
import ruRU from './locales/ru-RU.json';
import arEG from './locales/ar-EG.json';

const resources = {
  'zh-CN': { translation: zhCN },
  'en-US': { translation: enUS },
  'fr-FR': { translation: frFR },
  'es-ES': { translation: esES },
  'ru-RU': { translation: ruRU },
  'ar-EG': { translation: arEG },
};

// 获取保存的语言设置，默认为中文
const savedLang = (() => {
  try {
    return localStorage.getItem('openfaith-language') || 'zh-CN';
  } catch {
    return 'zh-CN';
  }
})();

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: savedLang,
    fallbackLng: 'zh-CN',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

export const changeLanguage = (lang: string) => {
  try {
    localStorage.setItem('openfaith-language', lang);
  } catch {
    // localStorage 可能不可用
  }
  i18n.changeLanguage(lang);
};

export const getCurrentLanguage = () => i18n.language;

export default i18n;
