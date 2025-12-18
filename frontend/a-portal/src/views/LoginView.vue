<script setup lang="ts">
import { ref } from 'vue';
import { useRouter, RouterLink } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '../stores/auth';
import { login } from '../api/auth';

const router = useRouter();
const { t } = useI18n();
const authStore = useAuthStore();
const account = ref('');
const password = ref('');
const loading = ref(false);
const error = ref('');

const normalizeError = (msg?: string) => {
  if (!msg) return 'Login failed';
  const m = msg.toLowerCase();
  if (m.includes('账号或密码错误') || m.includes('invalid account or password')) {
    return 'Invalid account or password';
  }
  if (m.includes('账号已存在') || m.includes('account already exists')) {
    return 'Account already exists';
  }
  return msg;
};

const onSubmit = async () => {
  error.value = '';
  if (!account.value || !password.value) {
    error.value = t('login.errorRequired');
    return;
  }
  loading.value = true;
  try {
    const res = await login({ account: account.value, password: password.value });
      if (res && res.token && res.user) {
      authStore.setAuth(res.token, res.user);
      router.push('/home'); // 登录成功后跳转到首页
    } else {
      error.value = 'Invalid login response';
    }
  } catch (e: any) {
    error.value = normalizeError(e?.message);
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="page">
    <header class="lang">
      <RouterLink to="/lang">{{ t('lang.setting') }}</RouterLink>
    </header>
    <section class="card">
      <h1 class="title">{{ t('login.title') }}</h1>
      <div class="form-item">
        <label>{{ t('login.phone') }}</label>
        <input v-model="account" type="text" :placeholder="t('login.phonePlaceholder')" />
      </div>
      <div class="form-item">
        <label>{{ t('login.password') }}</label>
        <input v-model="password" type="password" :placeholder="t('login.passwordPlaceholder')" />
      </div>
      <p v-if="error" class="error">{{ error }}</p>
      <button class="btn" :disabled="loading" @click="onSubmit">
        {{ loading ? t('login.signingIn') : t('login.button') }}
      </button>
      <div class="footer">
        <RouterLink class="link" to="/register">{{ t('login.registerAccount') }}</RouterLink>
        <RouterLink class="link" to="/service">{{ t('login.service') }}</RouterLink>
      </div>
    </section>
  </div>
</template>

<style scoped>
.page {
  min-height: 100vh;
  width: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
  background-image: url('/alb-yhFmkscu.png');
  background-repeat: no-repeat;
  background-size: 100% 100%; /* 左右拉伸填充整个容器，随窗口大小变化 */
  background-position: center center; /* 居中显示 */
  background-attachment: scroll; /* 随页面滚动，响应窗口变化 */
  background-color: #0d0f14; /* 备用背景色 */
}
.lang {
  display: flex;
  justify-content: flex-end;
  padding: 16px 20px 0;
}
.lang a {
  color: #dfe3f0;
  font-size: 14px;
}
.card {
  width: min(860px, 92vw);
  margin: 80px auto;
  background: rgba(16, 18, 24, 0.92);
  border-radius: 14px;
  padding: 28px 24px 32px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.04);
}
.title {
  margin: 0 0 20px;
  font-size: 24px;
  font-weight: 700;
  color: #f7f8fb;
}
.form-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 18px;
}
label {
  color: #d0d7e2;
  font-size: 13px;
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
.footer {
  margin-top: 16px;
  display: flex;
  justify-content: space-between;
  color: #dfe3f0;
  font-size: 14px;
}
.link {
  color: #ff3b69;
  font-weight: 600;
}
@media (max-width: 640px) {
  .card {
    margin: 24px auto;
    padding: 24px 18px;
  }
}
</style>

