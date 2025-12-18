import { createI18n } from 'vue-i18n';
import en from './locales/en.json';
import tr from './locales/tr.json';
import ja from './locales/ja.json';
import ar from './locales/ar.json';
import ur from './locales/ur.json';
import es from './locales/es.json';
import pt from './locales/pt.json';
import fr from './locales/fr.json';
import ru from './locales/ru.json';

const messages = {
  en,
  tr,
  ja,
  ar,
  ur,
  es,
  pt,
  fr,
  ru,
};

// 从 localStorage 读取保存的语言，默认英文
const savedLocale = localStorage.getItem('app-locale') || 'en';

export const i18n = createI18n({
  legacy: false,
  locale: savedLocale,
  fallbackLocale: 'en',
  messages,
});

export default i18n;

