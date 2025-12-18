<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { getUserInfo, type UserInfo } from '../api/user';
import { createRechargeRequest } from '../api/rechargeConfig';

const router = useRouter();
const authStore = useAuthStore();

const amount = ref<string>('0');
const loading = ref(false);
const error = ref('');
const userInfo = ref<UserInfo | null>(null);

const quickAmounts = [100, 200, 500, 1000, 2000, 5000];

const fetchUserInfo = async () => {
  if (!authStore.user?.id) return;
  try {
    userInfo.value = await getUserInfo(authStore.user.id);
  } catch (e: any) {
    error.value = e?.message || '获取用户信息失败';
    console.error(e);
  }
};

const handleSelect = (val: number) => {
  amount.value = String(val);
};

const handleSubmit = async () => {
  const num = Number(amount.value);
  if (Number.isNaN(num) || num <= 0) {
    window.alert('Please enter a valid amount');
    return;
  }
  if (!authStore.user?.id) {
    window.alert('Please re-login');
    router.push('/login');
    return;
  }
  loading.value = true;
  try {
    await createRechargeRequest({ userId: authStore.user.id, amount: num });
    window.alert('Recharge submitted, pending review');
    router.push('/service');
  } catch (err: any) {
    window.alert(err?.message || 'Submit failed');
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
});
</script>

<template>
  <div class="recharge-page">
    <header class="top-bar">
      <button class="back-btn" @click="router.back()">←</button>
      <h2>Recharge balance</h2>
      <span class="placeholder" />
    </header>

    <section class="amount-card">
      <label class="label">Recharge amount</label>
      <div class="input-row">
        <input v-model="amount" type="number" min="0" step="0.01" />
        <span class="unit">$</span>
      </div>
      <div class="balance">
        Account balance :
        <strong>
          ${{ userInfo ? userInfo.user.balance.toFixed(2) : '0.00' }}
        </strong>
      </div>
    </section>

    <section class="quick-card">
      <div class="quick-title">
        <span class="quick-icon">💎</span>
        <span>Quick selection</span>
      </div>
      <div class="quick-grid">
        <button
          v-for="val in quickAmounts"
          :key="val"
          class="quick-btn"
          @click="handleSelect(val)"
        >
          {{ val }}
        </button>
      </div>
    </section>

    <div class="submit-bar">
      <button class="submit-btn" :disabled="loading" @click="handleSubmit">
        Recharge
      </button>
    </div>

    <div v-if="error" class="error">{{ error }}</div>
  </div>
</template>

<style scoped>
.recharge-page {
  height: 100vh;
  background: #0f1115;
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
.quick-card {
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
  color: #fff;
  margin-left: 4px;
}

.quick-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.quick-title {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #e11d48;
  font-weight: 700;
  font-size: 13px;
}

.quick-icon {
  font-size: 14px;
}

.quick-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.quick-btn {
  width: 100%;
  padding: 14px 0;
  background: #fff;
  color: #e11d48;
  font-weight: 700;
  font-size: 16px;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.18);
  transition: transform 0.1s, box-shadow 0.2s;
}

.quick-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 18px rgba(0, 0, 0, 0.24);
}

.quick-btn:active {
  transform: translateY(0);
}

.submit-bar {
  margin-top: 12px;
  padding: 0 0 4px;
}

.submit-btn {
  width: 100%;
  border: none;
  border-radius: 999px;
  padding: 14px;
  background: linear-gradient(135deg, #e11d48, #fb7185);
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.1s;
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.submit-btn:not(:disabled):hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

.submit-btn:not(:disabled):active {
  transform: translateY(0);
}

.error {
  color: #ef4444;
  font-size: 13px;
  text-align: center;
}

@media (max-width: 480px) {
  .quick-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>

