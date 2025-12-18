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
      <button class="action-btn recharge">
        <div class="btn-icon">$</div>
        <span class="btn-label">Recharge</span>
      </button>
      <button class="action-btn withdraw">
        <div class="btn-icon">↻</div>
        <span class="btn-label">Withdraw</span>
      </button>
      <button class="action-btn invite">
        <div class="btn-icon">⋯</div>
        <span class="btn-label">Invite friends</span>
      </button>
    </section>

    <!-- Order Section -->
    <section class="order-section">
      <h2 class="order-title">Order</h2>
      <div class="tiktok-shop-cards">
        <div class="shop-card">
          <div class="shop-icon">🛍️</div>
          <div class="tiktok-logo-small">TikTok</div>
        </div>
        <div class="shop-card">
          <div class="tiktok-logo-small">TikTok</div>
          <div class="shop-text">SHOP</div>
          <div class="cart-icon">🛒</div>
        </div>
      </div>
    </section>

    <!-- Logout Button -->
    <button class="logout-btn" @click="handleLogout">退出登录</button>

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
  background: linear-gradient(180deg, #0a0a0a 0%, #1a1a1a 100%);
  color: #fff;
  padding: 20px;
  padding-bottom: 80px; /* 为底部导航留出空间 */
  position: relative;
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
  backdrop-filter: blur(10px);
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
  justify-content: center;
  gap: 24px;
  margin-bottom: 40px;
}

.action-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  transition: transform 0.2s, opacity 0.2s;
  font-size: 24px;
  color: #fff;
  font-weight: 600;
}

.action-btn:active {
  transform: scale(0.95);
}

.action-btn.recharge {
  background: linear-gradient(135deg, #ff3b69, #ff2f55);
}

.action-btn.withdraw {
  background: linear-gradient(135deg, #4caf50, #45a049);
}

.action-btn.invite {
  background: linear-gradient(135deg, #ff6b9d, #ff4d7a);
}

.btn-label {
  font-size: 12px;
  margin-top: 4px;
}

.order-section {
  margin-bottom: 40px;
}

.order-title {
  font-size: 28px;
  font-weight: 700;
  margin: 0 0 20px 0;
  text-shadow: 0 0 10px rgba(255, 59, 105, 0.5);
}

.tiktok-shop-cards {
  display: flex;
  gap: 16px;
  justify-content: center;
}

.shop-card {
  width: 150px;
  height: 150px;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.shop-icon {
  font-size: 48px;
}

.tiktok-logo-small {
  font-size: 14px;
  font-weight: 600;
}

.shop-text {
  font-size: 18px;
  font-weight: 700;
}

.cart-icon {
  font-size: 32px;
}

.logout-btn {
  position: fixed;
  bottom: 20px;
  right: 20px;
  padding: 12px 24px;
  background: rgba(255, 59, 105, 0.2);
  border: 1px solid rgba(255, 59, 105, 0.5);
  border-radius: 8px;
  color: #fff;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;
}

.logout-btn:hover {
  background: rgba(255, 59, 105, 0.3);
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

