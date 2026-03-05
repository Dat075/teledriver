import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
const resources = {
  en: { translation: { welcome: 'Welcome', upload: 'Upload' /* ... */ } },
  vi: { translation: { welcome: 'Chào mừng', upload: 'Tải lên' /* ... */ } },
  // Thêm 60+ ngôn ngữ khác nếu cần (sử dụng JSON files).
};
i18n.use(initReactI18next).use(LanguageDetector).init({
  resources,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});
export default i18n;