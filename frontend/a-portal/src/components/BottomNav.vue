<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();

const navItems = [
  {
    name: 'home',
    label: 'Home',
    path: '/home',
    icon: 'home',
  },
  {
    name: 'order',
    label: 'Order',
    path: '/order',
    icon: 'list',
  },
  {
    name: 'pre-order',
    label: 'Pre-Order',
    path: '/pre-order',
    icon: 'timer',
  },
  {
    name: 'service',
    label: 'Service',
    path: '/service',
    icon: 'chat',
  },
  {
    name: 'mine',
    label: 'Mine',
    path: '/mine',
    icon: 'user',
  },
];

const isActive = (path: string) => {
  return route.path === path || route.path.startsWith(path);
};

const navigate = (path: string) => {
  router.push(path);
};
</script>

<template>
  <nav class="bottom-nav">
    <div
      v-for="item in navItems"
      :key="item.name"
      class="nav-item"
      :class="{ active: isActive(item.path) }"
      @click="navigate(item.path)"
    >
      <div class="nav-icon">
        <!-- Home Icon -->
        <svg v-if="item.icon === 'home'" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
        <!-- Order/List Icon -->
        <svg v-else-if="item.icon === 'list'" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="8" y1="6" x2="21" y2="6"></line>
          <line x1="8" y1="12" x2="21" y2="12"></line>
          <line x1="8" y1="18" x2="21" y2="18"></line>
          <line x1="3" y1="6" x2="3.01" y2="6"></line>
          <line x1="3" y1="12" x2="3.01" y2="12"></line>
          <line x1="3" y1="18" x2="3.01" y2="18"></line>
        </svg>
        <!-- Timer/Pre-Order Icon -->
        <svg v-else-if="item.icon === 'timer'" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
        <!-- Chat/Service Icon -->
        <svg v-else-if="item.icon === 'chat'" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          <line x1="9" y1="10" x2="15" y2="10"></line>
          <line x1="9" y1="14" x2="13" y2="14"></line>
        </svg>
        <!-- User/Mine Icon -->
        <svg v-else-if="item.icon === 'user'" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
      </div>
      <span class="nav-label">{{ item.label }}</span>
    </div>
  </nav>
</template>

<style scoped>
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-around;
  align-items: center;
  background: #1a1a1a;
  padding: 8px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  z-index: 1000;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.3);
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 4px 12px;
  cursor: pointer;
  transition: all 0.2s;
  flex: 1;
  color: #9ca3af;
}

.nav-item.active {
  color: #ef4444;
}

.nav-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  transition: all 0.2s;
}

.nav-icon svg {
  width: 100%;
  height: 100%;
  stroke: currentColor;
}

.nav-label {
  font-size: 12px;
  font-weight: 500;
  transition: color 0.2s;
}

.nav-item:active {
  transform: scale(0.95);
}
</style>

