<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useLocaleStore } from '../stores/locale';

const router = useRouter();
const { t, locale } = useI18n();
const localeStore = useLocaleStore();

const languageCodes = ['en', 'tr', 'ja', 'ar', 'ur', 'es', 'pt', 'fr', 'ru'];

const languages = computed(() => [
  { code: 'en', name: t('lang.english') },
  { code: 'tr', name: t('lang.turkish') },
  { code: 'ja', name: t('lang.japanese') },
  { code: 'ar', name: t('lang.arabic') },
  { code: 'ur', name: t('lang.pakistan') },
  { code: 'es', name: t('lang.spanish') },
  { code: 'pt', name: t('lang.portuguese') },
  { code: 'fr', name: t('lang.french') },
  { code: 'ru', name: t('lang.russian') },
]);

const selectLanguage = (langCode: string) => {
  localeStore.setLocale(langCode);
  locale.value = langCode;
  // 实时更新后返回上一页
  router.back();
};
</script>

<template>
  <div class="page">
    <header class="bar">
      <RouterLink class="back" to="/login">←</RouterLink>
      <h1>{{ t('lang.setting') }}</h1>
    </header>
    <section class="list">
      <div
        v-for="lang in languages"
        :key="lang.code"
        class="item"
        :class="{ active: locale === lang.code }"
        @click="selectLanguage(lang.code)"
      >
        {{ lang.name }}
      </div>
    </section>
  </div>
</template>

<style scoped>
.page {
  min-height: 100vh;
  background: #0d0f14;
  color: #f7f8fb;
}
.bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 16px 12px;
}
.bar h1 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
}
.back {
  color: #f7f8fb;
  font-size: 20px;
  text-decoration: none;
  line-height: 1;
}
.list {
  padding: 0 12px 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.item {
  background: #f5f6fa;
  color: #1b1d22;
  border-radius: 10px;
  padding: 12px 14px;
  font-size: 15px;
  font-weight: 600;
  border: 1px solid #e4e6ed;
  cursor: pointer;
  transition: background-color 0.2s, border-color 0.2s;
}
.item:hover {
  background: #e8eaf0;
  border-color: #ff3b69;
}
.item.active {
  background: linear-gradient(90deg, #ff3b69, #ff2f55);
  color: #fff;
  border-color: #ff3b69;
}
@media (min-width: 720px) {
  .list {
    width: min(720px, 92vw);
    margin: 0 auto;
  }
  .bar {
    width: min(720px, 92vw);
    margin: 0 auto;
  }
}
</style>

