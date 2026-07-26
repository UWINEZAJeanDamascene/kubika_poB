import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en';
import fr from './locales/fr';
import rw from './locales/rw';

const savedLanguage = localStorage.getItem('language') || 'en';
const validLanguages = ['en', 'fr', 'rw'];
const initialLanguage = validLanguages.includes(savedLanguage) ? savedLanguage : 'en';

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    fr: { translation: fr },
    rw: { translation: rw },
  },
  lng: initialLanguage,
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

document.documentElement.lang = initialLanguage;

export default i18n;
