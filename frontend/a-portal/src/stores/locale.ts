import { defineStore } from 'pinia';
import { i18n } from '../i18n';

export const useLocaleStore = defineStore('locale', {
  state: () => ({
    locale: localStorage.getItem('app-locale') || 'en',
  }),
  actions: {
    setLocale(locale: string) {
      this.locale = locale;
      (i18n.global.locale as any).value = locale;
      localStorage.setItem('app-locale', locale);
    },
  },
});

