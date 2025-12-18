<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { getUserInfo, type UserInfo } from '../api/user';
import { logout } from '../api/auth';

const router = useRouter();
const authStore = useAuthStore();

const loading = ref(false);
const error = ref('');
const userInfo = ref<UserInfo | null>(null);

let refreshInterval: number | null = null;

const fetchUserInfo = async () => {
  if (!authStore.user?.id) {
    router.push('/login');
    return;
  }

  loading.value = true;
  error.value = '';
  try {
    const data = await getUserInfo(authStore.user.id);
    userInfo.value = data;
  } catch (e: any) {
    error.value = e?.message || '获取用户信息失败';
    console.error('获取用户信息失败:', e);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  authStore.initAuth();
  if (!authStore.isAuthenticated) {
    router.push('/login');
    return;
  }

  fetchUserInfo();
  
  // 每5秒刷新一次数据（实现实时交互）
  refreshInterval = window.setInterval(() => {
    fetchUserInfo();
  }, 5000);
});

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
});

const formatCurrency = (amount: number) => {
  return `$${amount.toFixed(2)}`;
};

const handleLogout = async () => {
  if (authStore.user?.id) {
    try {
      // 调用后端API更新用户状态为离线
      await logout(authStore.user.id);
    } catch (e: any) {
      console.error('退出登录失败:', e);
      // 即使API调用失败，也继续执行退出流程
    }
  }
  authStore.clearAuth();
  router.push('/login');
};

const menuItems = [
  { icon: 'wallet', label: 'Recharge balance', action: () => router.push('/recharge') },
  { icon: 'money', label: 'Withdraw money', action: () => router.push('/withdraw') },
  { icon: 'wallet-arrow', label: 'Recharge record', action: () => router.push('/recharge-record') },
  { icon: 'money-arrow', label: 'Withdraw record', action: () => router.push('/withdraw-record') },
  { icon: 'lock', label: 'Change password', action: () => router.push('/change-password') },
  { icon: 'shield', label: 'Change payment password', action: () => router.push('/change-payment-password') },
  { icon: 'globe', label: 'Language setting', action: () => router.push('/lang') },
  { icon: 'bag', label: 'Online customer service', action: () => router.push('/chat-service') },
];
</script>

<template>
  <div class="mine-view">
    <!-- Top Section -->
    <header class="top-header">
      <div class="header-content">
        <div class="tiktok-brand">
          <svg class="tiktok-logo-icon" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
          </svg>
          <span class="tiktok-text">TikTok</span>
        </div>
        <div class="user-details">
          <div class="username">{{ authStore.user?.account || '-' }}</div>
          <div class="balance">{{ userInfo ? formatCurrency(userInfo.user.balance) : '$0.00' }}</div>
          <div class="invite-code">
            Invite friends: {{ userInfo?.user.myInviteCode || '-' }}
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <div class="content-wrapper">
      <!-- Left Menu -->
      <div class="menu-section">
        <div
          v-for="item in menuItems"
          :key="item.label"
          class="menu-item"
          @click="item.action()"
        >
          <div class="menu-icon">
            <!-- Wallet Icon -->
            <svg v-if="item.icon === 'wallet'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
              <line x1="1" y1="10" x2="23" y2="10"></line>
            </svg>
            <!-- Money/Bills Icon -->
            <svg v-else-if="item.icon === 'money'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="1" x2="12" y2="23"></line>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
            <!-- Bag Icon -->
            <svg v-else-if="item.icon === 'bag'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <path d="M16 10a4 4 0 0 1-8 0"></path>
            </svg>
            <!-- Wallet with Arrow Icon -->
            <svg v-else-if="item.icon === 'wallet-arrow'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
              <line x1="1" y1="10" x2="23" y2="10"></line>
              <circle cx="18" cy="14" r="3"></circle>
              <polyline points="16 12 18 14 20 12"></polyline>
            </svg>
            <!-- Money with Arrow Icon -->
            <svg v-else-if="item.icon === 'money-arrow'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="1" x2="12" y2="23"></line>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
              <polyline points="16 12 18 14 20 12"></polyline>
            </svg>
            <!-- Lock Icon -->
            <svg v-else-if="item.icon === 'lock'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            <!-- Shield Icon -->
            <svg v-else-if="item.icon === 'shield'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              <path d="M9 12l2 2 4-4"></path>
            </svg>
            <!-- Globe Icon -->
            <svg v-else-if="item.icon === 'globe'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="2" y1="12" x2="22" y2="12"></line>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
            </svg>
          </div>
          <span class="menu-label">{{ item.label }}</span>
          <svg class="arrow-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </div>
      </div>

      <!-- Right Illustration -->
      <div class="illustration-section">
        <div class="tiktok-shop-illustration">
          <div class="shop-title">TikTok Shop</div>
          <div class="illustration-content">
            <!-- 这里可以添加TikTok Shop的插图 -->
            <div class="shop-graphic">🛍️</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Sign Out Button -->
    <button class="sign-out-btn" @click="handleLogout">Sign out</button>

    <!-- Loading/Error States -->
    <div v-if="loading && !userInfo" class="loading-overlay">
      <p>加载中...</p>
    </div>
    <div v-if="error" class="error-message">
      {{ error }}
    </div>
  </div>
</template>

<style scoped>
.mine-view {
  min-height: 100vh;
  background: linear-gradient(180deg, #0a0a0a 0%, #1a1a1a 100%);
  color: #fff;
  padding: 20px;
  padding-bottom: 100px; /* 为底部导航和退出按钮留出空间 */
  position: relative;
}

.top-header {
  margin-bottom: 30px;
}

.header-content {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.tiktok-brand {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tiktok-logo-icon {
  width: 24px;
  height: 24px;
  color: #fff;
}

.tiktok-text {
  font-size: 18px;
  font-weight: 700;
  color: #fff;
}

.user-details {
  flex: 1;
}

.username {
  font-size: 16px;
  font-weight: 600;
  color: #fff;
  margin-bottom: 8px;
}

.balance {
  font-size: 20px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 8px;
}

.invite-code {
  font-size: 14px;
  color: #aaa;
}

.content-wrapper {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
}

.menu-section {
  flex: 1;
  max-width: 300px;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  margin-bottom: 12px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.menu-item:hover {
  background: rgba(255, 255, 255, 0.08);
  transform: translateX(4px);
}

.menu-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  color: #ef4444;
  flex-shrink: 0;
}

.menu-icon svg {
  width: 100%;
  height: 100%;
  stroke: currentColor;
}

.menu-label {
  flex: 1;
  font-size: 14px;
  color: #fff;
  font-weight: 500;
}

.arrow-icon {
  color: #666;
  flex-shrink: 0;
}

.illustration-section {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
}

.tiktok-shop-illustration {
  text-align: center;
}

.shop-title {
  font-size: 24px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 20px;
}

.illustration-content {
  display: flex;
  align-items: center;
  justify-content: center;
}

.shop-graphic {
  font-size: 120px;
  opacity: 0.3;
}

.sign-out-btn {
  position: fixed;
  bottom: 80px; /* 在底部导航上方 */
  left: 20px;
  right: 20px;
  padding: 16px;
  background: linear-gradient(135deg, #ff3b69, #ff2f55);
  color: #fff;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  z-index: 999;
}

.sign-out-btn:hover {
  background: linear-gradient(135deg, #ff2f55, #ff1f45);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255, 59, 105, 0.4);
}

.sign-out-btn:active {
  transform: translateY(0);
}

.loading-overlay {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.8);
  padding: 20px 40px;
  border-radius: 8px;
  color: #fff;
  z-index: 1000;
}

.error-message {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(255, 59, 105, 0.9);
  color: #fff;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 14px;
  z-index: 1000;
}

@media (max-width: 768px) {
  .content-wrapper {
    flex-direction: column;
  }

  .menu-section {
    max-width: 100%;
  }

  .illustration-section {
    min-height: 200px;
  }
}
</style>
