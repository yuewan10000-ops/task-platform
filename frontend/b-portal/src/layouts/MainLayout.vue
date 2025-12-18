<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { RouterView } from 'vue-router';
import { getPendingCount } from '../api/recharges';
import { getSupportUnreadCount } from '../api/support';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const sidebarCollapsed = ref(false);
const expandedMenus = ref<number[]>([0, 1]); // 默认展开"会员管理"和"数据管理"菜单
const currentTime = ref('');
const pendingCount = ref(0);
const supportUnreadCount = ref(0);
const showUserMenu = ref(false);
let refreshInterval: number | null = null;
let supportRefreshInterval: number | null = null;

const updateTime = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  currentTime.value = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

const toggleMenu = (index: number) => {
  if (expandedMenus.value.includes(index)) {
    expandedMenus.value = expandedMenus.value.filter((i) => i !== index);
  } else {
    expandedMenus.value.push(index);
  }
};

setInterval(updateTime, 1000);
updateTime();

const fetchPendingCount = async () => {
  try {
    const result = await getPendingCount();
    pendingCount.value = result.count || 0;
  } catch (err) {
    console.error('Failed to fetch pending count:', err);
  }
};

const handleRechargeStatusUpdated = () => {
  fetchPendingCount();
};

const fetchSupportUnreadCount = async () => {
  try {
    const result = await getSupportUnreadCount();
    supportUnreadCount.value = result.count || 0;
  } catch (err) {
    console.error('Failed to fetch support unread count:', err);
  }
};

const handleClickOutside = (e: MouseEvent) => {
  const target = e.target as HTMLElement;
  if (!target.closest('.user-menu-wrapper')) {
    showUserMenu.value = false;
  }
};

onMounted(() => {
  fetchPendingCount();
  fetchSupportUnreadCount();
  // 每30秒刷新一次待审核数量
  refreshInterval = window.setInterval(fetchPendingCount, 30000);
  // 每5秒刷新一次客服未读消息
  supportRefreshInterval = window.setInterval(fetchSupportUnreadCount, 5000);
  // 监听充值状态更新事件
  window.addEventListener('recharge-status-updated', handleRechargeStatusUpdated);
  // 监听点击外部区域关闭下拉菜单
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  if (refreshInterval !== null) {
    clearInterval(refreshInterval);
  }
  if (supportRefreshInterval !== null) {
    clearInterval(supportRefreshInterval);
  }
  window.removeEventListener('recharge-status-updated', handleRechargeStatusUpdated);
  document.removeEventListener('click', handleClickOutside);
});

const handleLogout = () => {
  authStore.logout();
  router.push('/login');
};

const toggleUserMenu = () => {
  showUserMenu.value = !showUserMenu.value;
};

const goFinance = (type: 'recharge' | 'withdraw') => {
  if (type === 'recharge') {
    router.push('/finance/recharge');
  } else {
    router.push('/finance/withdraw');
  }
};

const goToProducts = () => {
  router.push('/data/products');
};

const menuItems = computed(() => {
  const user = authStore.user;
  const isSubUser = user?.isSubUser || false;

  // 子用户只能看到会员列表、充值、取款
  if (isSubUser) {
    return [
      {
        title: '会员管理',
        icon: '👥',
        children: [
          { path: '/members', label: '会员列表', active: route.path.startsWith('/members') },
        ],
      },
      {
        title: '财务管理',
        icon: '💰',
        children: [
          { path: '/finance/recharge', label: '充值管理', active: route.path.startsWith('/finance/recharge') },
          { path: '/finance/withdraw', label: '取款管理', active: route.path.startsWith('/finance/withdraw') },
        ],
      },
    ];
  }

  // Admin用户看到完整菜单
  return [
    {
      title: '会员管理',
      icon: '👥',
      children: [
        { path: '/members', label: '会员列表', active: route.path.startsWith('/members') },
        { path: '/finance/recharge/manage', label: '充值地址管理', active: route.path.startsWith('/finance/recharge/manage') },
      ],
    },
    {
      title: '数据管理',
      icon: '📊',
      children: [
        { path: '/data/commission-rate', label: '佣金比例管理', active: route.path.startsWith('/data/commission-rate') },
        { path: '/data/product-price', label: '商品价格管理', active: route.path.startsWith('/data/product-price') },
        { path: '/data/products', label: '商品管理', active: route.path.startsWith('/data/products') },
      ],
    },
    {
      title: '系统管理',
      icon: '⚙️',
      children: [
        { path: '/support', label: '在线客服', active: route.path.startsWith('/support'), badge: supportUnreadCount.value },
        { path: '/sub-users', label: '子用户管理', active: route.path.startsWith('/sub-users') },
      ],
    },
    {
      title: '查看列表',
      icon: '📋',
      children: [],
    },
    {
      title: '查看代码',
      icon: '💻',
      children: [],
    },
  ];
});
</script>

<template>
  <div class="layout">
    <!-- 顶部导航栏 -->
    <header class="top-header">
      <div class="header-left">
        <h1 class="logo">Tiktok V1.0</h1>
        <nav class="top-nav">
          <a href="#" class="nav-link">后台黄页</a>
          <a href="#" class="nav-link">A角色</a>
          <a href="#" class="nav-link">交易</a>
        </nav>
      </div>
      <div class="header-right">
        <span class="time">当地时间:美国东部 {{ currentTime }}</span>
        <button class="finance-btn recharge" @click="goFinance('recharge')">
          充值
          <span v-if="pendingCount > 0" class="badge">{{ pendingCount }}</span>
        </button>
        <button class="finance-btn withdraw" @click="goFinance('withdraw')">取款</button>
        <button class="finance-btn products" @click="goToProducts" title="商品管理">
          📦 商品管理
        </button>
        <div class="user-menu-wrapper" @click.stop>
          <div class="user-menu" @click="toggleUserMenu">
            <span class="user-name">{{ authStore.user?.account || 'Admin' }}</span>
            <span class="dropdown-arrow">▼</span>
          </div>
          <div v-if="showUserMenu" class="user-dropdown">
            <div class="dropdown-item" @click="handleLogout">
              <span class="dropdown-icon">🚪</span>
              <span>退出系统</span>
            </div>
          </div>
        </div>
      </div>
    </header>

    <div class="main-container">
      <!-- 左侧菜单 -->
      <aside class="sidebar" :class="{ collapsed: sidebarCollapsed }">
        <nav class="sidebar-nav">
          <div
            v-for="(item, index) in menuItems"
            :key="index"
            class="menu-group"
            :class="{ active: item.children.some((c) => c.active) }"
          >
            <div class="menu-title" @click="toggleMenu(index)">
              <span class="menu-icon">{{ item.icon }}</span>
              <span class="menu-text">{{ item.title }}</span>
              <span v-if="item.title === '系统管理' && supportUnreadCount > 0" class="support-badge support-badge--menu">
                {{ supportUnreadCount }}
              </span>
              <span v-if="item.children.length > 0" class="menu-arrow">
                {{ expandedMenus.includes(index) ? '▼' : '▶' }}
              </span>
            </div>
            <div v-if="expandedMenus.includes(index) && item.children.length > 0" class="menu-children">
              <router-link
                v-for="child in item.children"
                :key="child.path"
                :to="child.path"
                class="menu-item"
                :class="{ active: child.active }"
              >
                <span>{{ child.label }}</span>
                <span v-if="child.badge && child.badge > 0" class="support-badge support-badge--child">
                  {{ child.badge }}
                </span>
              </router-link>
            </div>
          </div>
        </nav>
      </aside>

      <!-- 主内容区 -->
      <main class="main-content">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<style scoped>
.layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f6fa;
}

.top-header {
  height: 60px;
  background: #fff;
  border-bottom: 1px solid #e9ecef;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 32px;
}

.logo {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #1b1d22;
}

.top-nav {
  display: flex;
  gap: 24px;
}

.nav-link {
  color: #495057;
  text-decoration: none;
  font-size: 14px;
  transition: color 0.2s;
}

.nav-link:hover {
  color: #667eea;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}
.finance-btn {
  border: none;
  padding: 6px 14px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  cursor: pointer;
  transition: transform 0.1s, box-shadow 0.2s;
  box-shadow: 0 10px 20px rgba(239, 68, 68, 0.25);
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.finance-btn .badge {
  background: #fff;
  color: #f43f5e;
  border-radius: 10px;
  padding: 2px 6px;
  font-size: 11px;
  font-weight: 700;
  min-width: 18px;
  text-align: center;
  line-height: 1.2;
}

.support-badge {
  background: #ef4444;
  color: #fff;
  border-radius: 999px;
  padding: 2px 8px;
  font-size: 12px;
  font-weight: 700;
  min-width: 20px;
  text-align: center;
  line-height: 1.2;
}

.support-badge--menu {
  margin-left: 8px;
}

.support-badge--child {
  margin-left: auto;
}

.finance-btn.recharge {
  background: linear-gradient(135deg, #fb7185, #f43f5e);
}

.finance-btn.withdraw {
  background: linear-gradient(135deg, #f97316, #ea580c);
}

.finance-btn.products {
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
}

.finance-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 12px 24px rgba(239, 68, 68, 0.35);
}

.finance-btn.products:hover {
  box-shadow: 0 12px 24px rgba(139, 92, 246, 0.35);
}

.finance-btn:active {
  transform: translateY(0);
}


.time {
  font-size: 13px;
  color: #6c757d;
}

.icon-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 18px;
  border-radius: 4px;
  transition: background 0.2s;
}

.icon-btn:hover {
  background: #f8f9fa;
}

.user-menu-wrapper {
  position: relative;
}

.user-menu {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
}

.user-menu:hover {
  background: #f8f9fa;
}

.user-name {
  font-size: 14px;
  color: #495057;
}

.dropdown-arrow {
  font-size: 10px;
  color: #6c757d;
  transition: transform 0.2s;
}

.user-menu-wrapper:hover .dropdown-arrow,
.user-menu-wrapper:has(.user-dropdown:not([style*="display: none"])) .dropdown-arrow {
  transform: rotate(180deg);
}

.user-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  background: #fff;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  min-width: 140px;
  z-index: 1000;
  overflow: hidden;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  cursor: pointer;
  transition: background 0.2s;
  color: #495057;
  font-size: 14px;
}

.dropdown-item:hover {
  background: #f8f9fa;
}

.dropdown-icon {
  font-size: 16px;
}

.add-member-btn {
  padding: 8px 20px;
  background: #ff6b35;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
}

.add-member-btn:hover {
  opacity: 0.9;
}

.main-container {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.sidebar {
  width: 220px;
  background: #fff;
  border-right: 1px solid #e9ecef;
  overflow-y: auto;
  transition: width 0.3s;
}

.sidebar.collapsed {
  width: 60px;
}

.sidebar-nav {
  padding: 16px 0;
}

.menu-group {
  margin-bottom: 4px;
}

.menu-title {
  display: flex;
  align-items: center;
  padding: 12px 20px;
  cursor: pointer;
  transition: background 0.2s;
  user-select: none;
}

.menu-title:hover {
  background: #f8f9fa;
}

.menu-group.active > .menu-title {
  background: #e7f5ff;
  color: #667eea;
  font-weight: 600;
}

.menu-icon {
  font-size: 18px;
  margin-right: 12px;
  width: 20px;
  text-align: center;
}

.menu-text {
  flex: 1;
  font-size: 14px;
}

.menu-arrow {
  font-size: 10px;
  color: #6c757d;
}

.sidebar.collapsed .menu-text,
.sidebar.collapsed .menu-arrow {
  display: none;
}

.menu-children {
  padding-left: 52px;
}

.menu-item {
  display: block;
  padding: 10px 20px;
  color: #495057;
  text-decoration: none;
  font-size: 14px;
  transition: all 0.2s;
  border-left: 3px solid transparent;
}

.menu-item:hover {
  background: #f8f9fa;
  color: #667eea;
}

.menu-item.active {
  background: #e7f5ff;
  color: #667eea;
  border-left-color: #667eea;
  font-weight: 600;
}

.main-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}
</style>

