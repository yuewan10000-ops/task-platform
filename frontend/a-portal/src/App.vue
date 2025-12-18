<template>
  <div class="app-shell" :class="{ 'with-bottom-nav': showBottomNav }">
    <main class="main">
      <RouterView />
    </main>
    <BottomNav v-if="showBottomNav" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import BottomNav from './components/BottomNav.vue';

const route = useRoute();

// 在登录和注册页面不显示底部导航
const showBottomNav = computed(() => {
  return (
    route.path !== '/login'
    && route.path !== '/register'
    && route.path !== '/lang'
    && route.path !== '/chat-service'
  );
});
</script>

<style scoped>
.app-shell {
  min-height: 100vh;
  background: #f5f7fb;
  padding-bottom: 0;
}
.app-shell.with-bottom-nav {
  padding-bottom: 60px; /* 为底部导航留出空间 */
}
.main {
  width: 100%;
  min-height: 100vh;
  margin: 0;
  padding: 0;
}
</style>
