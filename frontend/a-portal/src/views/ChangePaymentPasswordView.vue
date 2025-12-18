<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { updatePaymentPassword } from '../api/user';

const router = useRouter();
const authStore = useAuthStore();

const oldPassword = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const loading = ref(false);
const error = ref('');

const handleSubmit = () => {
  error.value = '';
  
  if (!oldPassword.value) {
    error.value = 'Please enter old payment password';
    return;
  }
  
  if (!newPassword.value) {
    error.value = 'Please enter new payment password';
    return;
  }
  
  if (newPassword.value.length < 6) {
    error.value = 'New payment password must be at least 6 characters';
    return;
  }
  
  if (newPassword.value !== confirmPassword.value) {
    error.value = 'New passwords do not match';
    return;
  }
  
  if (!authStore.user?.id) {
    error.value = 'Please re-login';
    router.push('/login');
    return;
  }
  
  loading.value = true;
  updatePaymentPassword(authStore.user.id, oldPassword.value, newPassword.value)
    .then(() => {
      window.alert('Payment password updated successfully');
      router.back();
    })
    .catch((e: any) => {
      error.value = e?.message || 'Failed to update payment password';
    })
    .finally(() => {
      loading.value = false;
    });
};

onMounted(() => {
  authStore.initAuth();
  if (!authStore.isAuthenticated) {
    router.push('/login');
  }
});
</script>

<template>
  <div class="change-password-page">
    <header class="top-bar">
      <button class="back-btn" @click="router.back()">←</button>
      <h2>Change payment password</h2>
      <span class="placeholder" />
    </header>

    <div class="form-container">
      <div class="form-field">
        <label class="label">Old payment password</label>
        <input
          v-model="oldPassword"
          type="password"
          class="input-field"
          placeholder="Enter old payment password"
        />
      </div>

      <div class="form-field">
        <label class="label">New payment password</label>
        <input
          v-model="newPassword"
          type="password"
          class="input-field"
          placeholder="Enter new payment password (at least 6 characters)"
        />
      </div>

      <div class="form-field">
        <label class="label">Confirm new payment password</label>
        <input
          v-model="confirmPassword"
          type="password"
          class="input-field"
          placeholder="Confirm new payment password"
        />
      </div>

      <div v-if="error" class="error">{{ error }}</div>

      <button class="submit-btn" :disabled="loading" @click="handleSubmit">
        {{ loading ? 'Updating...' : 'Update payment password' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.change-password-page {
  min-height: 100vh;
  background: #050505;
  color: #fff;
  padding: 12px;
  padding-bottom: 80px;
}

.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 0 20px;
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

.form-container {
  max-width: 400px;
  margin: 0 auto;
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
  font-weight: 600;
}

.input-field {
  width: 100%;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid #2a2f3a;
  background: #0f1115;
  color: #fff;
  outline: none;
  font-size: 14px;
}

.input-field:focus {
  border-color: #ff4b81;
}

.error {
  color: #f87171;
  font-size: 12px;
  text-align: center;
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
</style>

