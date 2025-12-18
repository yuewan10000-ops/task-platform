<script setup lang="ts">
import { ref } from 'vue';
import { useRouter, RouterLink } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { register } from '../api/auth';

const router = useRouter();
const { t } = useI18n();
const account = ref('');
const loginPassword = ref('');
const payPassword = ref('');
const inviteCode = ref('');
const loading = ref(false);
const error = ref('');
const success = ref('');

const onSubmit = async () => {
  error.value = '';
  success.value = '';
  if (!account.value || !loginPassword.value || !payPassword.value || !inviteCode.value) {
    error.value = t('register.errorRequired');
    return;
  }
  if (account.value.length < 4) {
    error.value = 'Account must be at least 4 characters';
    return;
  }
  if (loginPassword.value.length < 6) {
    error.value = 'Login password must be at least 6 characters';
    return;
  }
  if (payPassword.value.length < 6) {
    error.value = 'Payment password must be at least 6 characters';
    return;
  }
  loading.value = true;
  try {
    await register({
      account: account.value,
      loginPassword: loginPassword.value,
      payPassword: payPassword.value,
      inviteCode: inviteCode.value,
    });
    success.value = t('register.success');
    setTimeout(() => router.push('/login'), 800);
  } catch (e: any) {
    const msg = e?.message || '';
    if (msg.includes('Account already exists')) {
      error.value = 'Account already exists';
    } else if (msg.includes('Invalid invitation code')) {
      error.value = 'Invalid invitation code';
    } else {
      error.value = 'Registration failed';
    }
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="page">
    <header class="bar">
      <RouterLink class="back" to="/login">←</RouterLink>
      <h1>{{ t('register.title') }}</h1>
    </header>
    <section class="card">
      <div class="form-item">
        <label>{{ t('register.phone') }}</label>
        <input v-model="account" type="text" :placeholder="t('register.phonePlaceholder')" />
      </div>
      <div class="form-item">
        <label>{{ t('register.password') }}</label>
        <input v-model="loginPassword" type="password" :placeholder="t('register.passwordPlaceholder')" />
      </div>
      <div class="form-item">
        <label>{{ t('register.paymentPassword') }}</label>
        <input v-model="payPassword" type="password" :placeholder="t('register.paymentPasswordPlaceholder')" />
      </div>
      <div class="form-item">
        <label>{{ t('register.invitationCode') }}</label>
        <input v-model="inviteCode" type="text" :placeholder="t('register.invitationCodePlaceholder')" />
      </div>
      <p v-if="error" class="error">{{ error }}</p>
      <p v-if="success" class="success">{{ success }}</p>
      <button class="btn" :disabled="loading" @click="onSubmit">
        {{ loading ? t('register.registering') : t('register.button') }}
      </button>
    </section>
  </div>
</template>

<style scoped>
.page {
  min-height: 100vh;
  width: 100%;
  color: #f7f8fb;
  background:
    linear-gradient(180deg, rgba(0, 0, 0, 0.35), rgba(0, 0, 0, 0.35)),
    url('/alb-yhFmkscu.png');
  background-repeat: no-repeat;
  background-size: cover; /* 填满容器，可能裁剪 */
  background-position: center;
  background-color: #0d0f14;
}
.bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 16px 8px;
}
.bar h1 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
}
.back {
  color: #f7f8fb;
  font-size: 20px;
  text-decoration: none;
  line-height: 1;
}
.card {
  background: rgba(16, 18, 24, 0.92);
  margin: 24px 12px 32px;
  padding: 18px 16px 24px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.04);
  box-shadow: 0 16px 34px rgba(0, 0, 0, 0.35);
}
.form-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}
label {
  font-size: 13px;
  color: #d0d7e2;
  font-weight: 600;
}
input {
  height: 44px;
  padding: 0 12px;
  border-radius: 10px;
  border: 1px solid #2c3039;
  background: #f5f6fa;
  color: #111;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}
input:focus {
  border-color: #ff3b69;
  box-shadow: 0 0 0 3px rgba(255, 59, 105, 0.25);
}
.btn {
  width: 100%;
  height: 46px;
  background: linear-gradient(90deg, #ff3b69, #ff2f55);
  color: #fff;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  font-weight: 700;
  letter-spacing: 0.2px;
  transition: transform 0.1s, opacity 0.2s;
}
.btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
.btn:not(:disabled):active {
  transform: translateY(1px);
}
.error {
  color: #ff6b6b;
  font-size: 13px;
  margin: 4px 0 12px;
}
.success {
  color: #0a8a4b;
  font-size: 13px;
  margin: 4px 0 12px;
}
@media (min-width: 720px) {
  .card {
    width: min(720px, 92vw);
    margin: 20px auto 40px;
    padding: 28px 24px 32px;
  }
  .bar {
    width: min(720px, 92vw);
    margin: 0 auto;
    padding-left: 4px;
  }
}
</style>

