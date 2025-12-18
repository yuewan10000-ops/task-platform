<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { getUserInfo, updateWalletAddress, type UserInfo } from '../api/user';

const router = useRouter();
const authStore = useAuthStore();

const type = ref('TRC-20');
const walletAddress = ref('');
const loading = ref(false);
const error = ref('');
const userInfo = ref<UserInfo | null>(null);

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
  if (!walletAddress.value.trim()) {
    window.alert('Please enter wallet address');
    return;
  }
  if (!authStore.user?.id) {
    window.alert('Please re-login');
    router.push('/login');
    return;
  }
  loading.value = true;
  updateWalletAddress(authStore.user.id, walletAddress.value.trim())
    .then(() => {
      window.alert('Wallet address saved successfully');
      router.back();
    })
    .catch((e: any) => {
      window.alert(e?.message || 'Save wallet address failed');
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
</script>

<template>
  <div class="add-method-page">
    <div class="form-container">
      <div class="form-field">
        <label class="label">Type</label>
        <input v-model="type" type="text" class="input-field" readonly />
      </div>

      <div class="form-field">
        <label class="label">Wallet address</label>
        <input
          v-model="walletAddress"
          type="text"
          class="input-field"
          placeholder=""
        />
      </div>

      <button class="submit-btn" :disabled="loading" @click="handleSubmit">
        Submit
      </button>
    </div>

    <div v-if="error" class="error">{{ error }}</div>
  </div>
</template>

<style scoped>
.add-method-page {
  height: 100vh;
  background: #050505;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  color: #fff;
}

.form-container {
  width: 100%;
  max-width: 400px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.label {
  font-size: 14px;
  color: #fff;
}

.input-field {
  width: 100%;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid #2a2f3a;
  background: #fff;
  color: #000;
  outline: none;
  font-size: 14px;
}

.input-field:read-only {
  background: #f0f0f0;
  cursor: not-allowed;
}

.submit-btn {
  width: 100%;
  border: none;
  border-radius: 8px;
  padding: 14px;
  background: #ff2f68;
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  margin-top: 10px;
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error {
  margin-top: 16px;
  font-size: 12px;
  color: #f87171;
  text-align: center;
}
</style>

