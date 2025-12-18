<script setup lang="ts">
import { ref, onMounted, onActivated } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { getUserInfo, updateWalletAddress, type UserInfo } from '../api/user';
import { createWithdrawRequest } from '../api/withdraws';

const router = useRouter();
const authStore = useAuthStore();

const normalizeError = (msg: string) => {
  if (!msg) return 'Submit withdraw failed';
  if (msg.includes('支付密码错误')) return 'Payment password is incorrect';
  if (msg.includes('支付密码必填')) return 'Payment password is required';
  if (msg.includes('余额不足')) return 'Insufficient balance';
  if (msg.includes('无效的用户ID')) return 'Invalid user ID';
  return msg;
};

const amount = ref<string>('0');
const payPassword = ref('');
const loading = ref(false);
const error = ref('');
const userInfo = ref<UserInfo | null>(null);
const walletAddress = ref('');

const fetchUserInfo = async () => {
  if (!authStore.user?.id) return;
  try {
    userInfo.value = await getUserInfo(authStore.user.id);
    walletAddress.value = userInfo.value.user.walletAddress || '';
  } catch (e: any) {
    error.value = e?.message || '获取用户信息失败';
    console.error(e);
  }
};

const handleSubmit = () => {
  const num = Number(amount.value);
  if (Number.isNaN(num) || num < 10) {
    window.alert('Minimum withdrawal amount is 10');
    return;
  }
  if (!payPassword.value) {
    window.alert('Please enter payment password');
    return;
  }
  if (!walletAddress.value) {
    window.alert('Please enter wallet address');
    return;
  }
  if (!authStore.user?.id) {
    window.alert('Please re-login');
    router.push('/login');
    return;
  }
  loading.value = true;
  // 先保存钱包地址，再创建取款请求（后端会校验支付密码并扣减余额）
  updateWalletAddress(authStore.user.id, walletAddress.value)
    .then(() =>
      createWithdrawRequest({
        userId: authStore.user!.id,
        amount: Number(amount.value),
        walletAddress: walletAddress.value,
        payPassword: payPassword.value,
      }),
    )
    .then(() => {
      window.alert('Withdraw submitted, pending review');
      router.push('/home');
    })
    .catch((e: any) => {
      window.alert(normalizeError(e?.message || 'Submit withdraw failed'));
    })
    .finally(() => {
      loading.value = false;
    });
};

onMounted(() => {
  authStore.initAuth();
  if (!authStore.isAuthenticated) {
    router.push('/login');
    return;
  }
  fetchUserInfo();
});

onActivated(() => {
  // 从添加钱包地址页面返回时刷新钱包地址
  if (authStore.isAuthenticated) {
    fetchUserInfo();
  }
});
</script>

<template>
  <div class="withdraw-page">
    <header class="top-bar">
      <button class="back-btn" @click="router.back()">←</button>
      <h2>Withdraw money</h2>
      <span class="placeholder" />
    </header>

    <section class="amount-card">
      <label class="label">Withdrawal amount</label>
      <div class="input-row">
        <input v-model="amount" type="number" min="10" step="0.01" />
        <span class="unit">$</span>
      </div>
      <div class="balance">
        Account balance :
        <strong>${{ userInfo ? userInfo.user.balance.toFixed(2) : '0.00' }}</strong>
      </div>
    </section>

    <section class="method-card">
      <div v-if="!walletAddress" class="add-method-wrapper">
        <button class="add-method-btn" @click="router.push('/add-withdrawal-method')">
          Add withdrawal method
        </button>
      </div>
      <div v-else class="wallet-info">
        <div class="wallet-row">
          <span>Type</span>
          <span class="value">TRC-20</span>
        </div>
        <div class="wallet-row">
          <span>Wallet address</span>
          <span class="value">{{ walletAddress }}</span>
        </div>
      </div>
    </section>

    <section class="password-card">
      <div class="section-title">
        <span class="dot-icon">✖</span>
        <span>Payment password</span>
      </div>
      <input
        v-model="payPassword"
        type="password"
        class="password-input"
        placeholder=""
      />
    </section>

    <div class="submit-bar">
      <button class="submit-btn" :disabled="loading" @click="handleSubmit">
        Withdraw
      </button>
    </div>

    <div v-if="error" class="error">{{ error }}</div>
  </div>
</template>

<style scoped>
.withdraw-page {
  height: 100vh;
  background: #050505;
  padding: 12px 12px 8px;
  color: #fff;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow: hidden;
}

.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #fff;
  padding: 4px 0;
}

.back-btn {
  border: none;
  background: transparent;
  color: #fff;
  font-size: 20px;
  cursor: pointer;
}

.top-bar h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
}

.placeholder {
  width: 20px;
}

.amount-card,
.method-card,
.password-card {
  background: #181b23;
  border-radius: 12px;
  padding: 14px;
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.35);
}

.label {
  display: block;
  font-size: 12px;
  color: #cbd5e1;
  margin-bottom: 8px;
}

.input-row {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #0f1115;
  border: 1px solid #2a2f3a;
  border-radius: 10px;
  padding: 10px 12px;
}

.input-row input {
  flex: 1;
  background: transparent;
  border: none;
  color: #fff;
  font-size: 20px;
  font-weight: 600;
  outline: none;
}

.unit {
  color: #cbd5e1;
  font-size: 14px;
}

.balance {
  margin-top: 10px;
  font-size: 12px;
  color: #cbd5e1;
}

.balance strong {
  color: #ff4b81;
  margin-left: 4px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 700;
  color: #ff4b81;
  margin-bottom: 10px;
}

.dot-icon {
  font-size: 12px;
}

.add-method-btn {
  width: 100%;
  background: transparent;
  border: none;
  color: #ff4b81;
  font-size: 14px;
  font-weight: 600;
  text-decoration: underline;
  cursor: pointer;
  padding: 20px 0;
  text-align: center;
}

.wallet-info {
  margin-top: 10px;
}

.wallet-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  font-size: 13px;
  border-top: 1px solid #232632;
}

.wallet-row:first-of-type {
  border-top: none;
}

.value {
  color: #cbd5e1;
  word-break: break-all;
  text-align: right;
  max-width: 60%;
}

.password-input {
  width: 100%;
  margin-top: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid #2a2f3a;
  background: #0f1115;
  color: #fff;
  outline: none;
}

.submit-bar {
  margin-top: 32px;
  padding: 0 0 12px;
}

.submit-btn {
  width: 100%;
  border: none;
  border-radius: 999px;
  padding: 14px;
  background: #ff2f68;
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
}

.error {
  font-size: 12px;
  color: #f87171;
}
</style>


