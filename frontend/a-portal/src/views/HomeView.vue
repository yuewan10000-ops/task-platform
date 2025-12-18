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

const goInvite = () => {
  router.push('/invite');
};
</script>

<template>
  <div class="dashboard">
    <!-- Header -->
    <header class="header">
      <div class="user-info">
        <span class="user-greeting">Hi, {{ authStore.user?.account }} Lv1</span>
      </div>
      <div class="tiktok-logo">
        <div class="phone-icon">📱</div>
        <span>Tik Tok</span>
      </div>
    </header>

    <!-- Financial Summary -->
    <section class="financial-section">
      <div class="balance-card">
        <h3 class="balance-label">Account balance</h3>
        <p class="balance-amount">
          {{ userInfo ? formatCurrency(userInfo.user.balance) : '$0.00' }}
        </p>
      </div>
      <div class="commission-info">
        <div class="commission-item">
          <span class="commission-value">
            {{ userInfo ? formatCurrency(userInfo.todayCommission) : '$0.00' }}
          </span>
          <span class="commission-label">Today's commission</span>
        </div>
        <div class="commission-item">
          <span class="commission-value">
            {{ userInfo ? formatCurrency(userInfo.totalCommission) : '$0.00' }}
          </span>
          <span class="commission-label">Total commission</span>
        </div>
      </div>
    </section>

    <!-- Action Buttons -->
    <section class="action-buttons">
      <button class="action-btn recharge" aria-label="Recharge" @click="router.push('/recharge')">
        <div class="btn-icon">
          <svg viewBox="0 0 64 64" aria-hidden="true">
            <circle cx="32" cy="32" r="27" fill="none" stroke="#ff2f68" stroke-width="4" />
            <path
              d="M36.5 18.5c-1.7-.9-3.3-1.2-5.3-1.1-4.2.2-7.3 2.8-7.3 6.2 0 3.5 2.7 5 7.2 6l2.6.6c3.6.8 5.5 2.2 5.5 5 0 3.2-2.8 5.6-6.5 5.7-2.2.1-4.3-.4-6.4-1.6"
              fill="none"
              stroke="#ff2f68"
              stroke-width="4"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <line x1="32" y1="14" x2="32" y2="50" stroke="#ff2f68" stroke-width="4" stroke-linecap="round" />
          </svg>
        </div>
        <span class="btn-label">Recharge</span>
      </button>
      <button class="action-btn withdraw" aria-label="Withdraw" @click="router.push('/withdraw')">
        <div class="btn-icon">
          <svg viewBox="0 0 64 64" aria-hidden="true">
            <circle cx="32" cy="32" r="27" fill="none" stroke="#ff2f68" stroke-width="4" />
            <path
              d="M36 22l8 10-8 10M48 32H24c-5 0-9-4-9-9"
              fill="none"
              stroke="#ff2f68"
              stroke-width="4"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </div>
        <span class="btn-label">Withdraw</span>
      </button>
      <button class="action-btn invite" aria-label="Invite friends" @click="goInvite">
        <div class="btn-icon">
          <svg viewBox="0 0 64 64" aria-hidden="true">
            <circle cx="32" cy="32" r="27" fill="none" stroke="#ff2f68" stroke-width="4" />
            <path
              d="M39 24 23 29.5M23 34.2l15.5 4.3"
              fill="none"
              stroke="#ff2f68"
              stroke-width="4"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <circle cx="40" cy="20" r="6" fill="none" stroke="#ff2f68" stroke-width="4" />
            <circle cx="20" cy="32" r="6" fill="none" stroke="#ff2f68" stroke-width="4" />
            <circle cx="40" cy="44" r="6" fill="none" stroke="#ff2f68" stroke-width="4" />
          </svg>
        </div>
        <span class="btn-label">Invite friends</span>
      </button>
    </section>

    <!-- Order Section -->
    <section class="order-section">
      <div class="order-image">
        <img src="/tiktok-shop-main-element.png" alt="TikTok Shop" />
      </div>
    </section>

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
.dashboard {
  min-height: 100vh;
  color: #fff;
  padding: 20px;
  padding-bottom: 80px; /* 为底部导航留出空间 */
  position: relative;
  overflow-x: hidden;
  background-image: url('/home-bg-DHK5U4-9.jpg');
  background-size: 100% 100%; /* 左右拉伸填充整个容器 */
  background-position: center center;
  background-repeat: no-repeat;
  background-attachment: scroll;
  background-color: #0a0a0a;
}

/* 移除遮罩层，确保背景图清晰显示 */
.dashboard > * {
  position: relative;
  z-index: 1;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding: 0 10px;
}

.user-info {
  position: relative;
}

.user-greeting {
  font-size: 18px;
  font-weight: 600;
  color: #fff;
}

.tiktok-logo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
}

.phone-icon {
  font-size: 24px;
}

.financial-section {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 24px;
  /* 移除 backdrop-filter 以确保背景图清晰显示 */
}

.balance-card {
  margin-bottom: 20px;
}

.balance-label {
  font-size: 14px;
  color: #aaa;
  margin: 0 0 8px 0;
  font-weight: 500;
}

.balance-amount {
  font-size: 32px;
  font-weight: 700;
  color: #fff;
  margin: 0;
}

.commission-info {
  display: flex;
  justify-content: space-between;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.commission-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.commission-value {
  font-size: 20px;
  font-weight: 600;
  color: #fff;
}

.commission-label {
  font-size: 12px;
  color: #aaa;
}

.action-buttons {
  display: flex;
  justify-content: space-around;
  align-items: center;
  gap: 22px;
  margin: 20px auto 30px;
  padding: 6px 12px;
  width: 100%;
  max-width: 900px;
}

.action-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 72px;
  height: 72px;
  border-radius: 20px;
  border: none;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 26px;
  color: #ff2f68;
  font-weight: 600;
  background: radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.18), transparent 55%),
    linear-gradient(165deg, rgba(43, 25, 48, 0.95), rgba(105, 60, 90, 0.9));
  box-shadow: 0 8px 22px rgba(0, 0, 0, 0.35);
}

.action-btn:hover {
  transform: translateY(-3px);
  box-shadow: 0 12px 26px rgba(0, 0, 0, 0.4);
  color: #ff4a7a;
}

.action-btn:active {
  transform: translateY(0) scale(0.98);
}

.btn-icon {
  font-size: 28px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-icon svg {
  width: 30px;
  height: 30px;
}

.btn-label {
  font-size: 12px;
  margin-top: 0;
  text-align: center;
  line-height: 1.2;
  white-space: normal;
  color: #f8f8f8;
}

.order-section {
  margin-bottom: 40px;
}

.order-image {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 16px 38px rgba(0, 0, 0, 0.45);
}

.order-image img {
  display: block;
  width: 100%;
  height: auto;
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

@media (max-width: 640px) {
  .action-buttons {
    gap: 16px;
  }

  .action-btn {
    width: 70px;
    height: 70px;
    font-size: 20px;
  }

  .tiktok-shop-cards {
    flex-direction: column;
    align-items: center;
  }

  .shop-card {
    width: 100%;
    max-width: 200px;
  }
}
</style>

