import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en';
import fr from './locales/fr';
import rw from './locales/rw';
import publicCopy from './locales/publicCopy';
import { deepMerge } from './utils/deepMerge';

const mergeLocale = (base: object, override: object) =>
  deepMerge(
    base as Record<string, unknown>,
    override as Record<string, unknown>,
  );

const savedLanguage = localStorage.getItem('language') || 'en';
const validLanguages = ['en', 'fr', 'rw'];
const initialLanguage = validLanguages.includes(savedLanguage) ? savedLanguage : 'en';

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: mergeLocale(en, publicCopy.en) },
    fr: { translation: mergeLocale(fr, publicCopy.fr) },
    rw: { translation: mergeLocale(rw, publicCopy.rw) },
  },
  lng: initialLanguage,
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

document.documentElement.lang = initialLanguage;

export default i18n;
