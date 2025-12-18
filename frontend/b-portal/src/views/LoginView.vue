<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { login } from '../api/auth';

const router = useRouter();
const authStore = useAuthStore();

const account = ref('');
const password = ref('');
const loading = ref(false);
const error = ref('');
const showPassword = ref(false);

onMounted(() => {
  // 如果已登录，跳转到用户列表
  if (authStore.isAuthenticated) {
    router.push('/users');
  }
});

const onSubmit = async () => {
  error.value = '';
  if (!account.value || !password.value) {
    error.value = '请完整填写账号和密码';
    return;
  }
  loading.value = true;
  try {
    console.log('开始登录，账号:', account.value);
    const res = await login({
      account: account.value,
      password: password.value,
    });
    console.log('登录成功，返回数据:', res);
    if (res && res.token && res.user) {
      authStore.setAuth(res.token, res.user);
      console.log('认证信息已保存，准备跳转');
      router.push('/members');
    } else {
      error.value = '登录响应数据格式错误';
    }
  } catch (e: any) {
    console.error('登录错误:', e);
    error.value = e?.message || e?.response?.data?.message || '登录失败，请检查账号密码';
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="page">
    <div class="background-decoration">
      <div class="circle circle-1"></div>
      <div class="circle circle-2"></div>
      <div class="circle circle-3"></div>
    </div>
    <div class="container">
      <div class="header">
        <div class="logo">
          <div class="logo-icon">⚙️</div>
          <h1 class="title">系统管理</h1>
        </div>
        <p class="subtitle">System Management Platform</p>
      </div>
      <form @submit.prevent="onSubmit" class="form">
        <div class="form-item">
          <label class="label">登录账号</label>
          <div class="input-wrapper">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <input
              v-model="account"
              type="text"
              placeholder="请输入登录账号"
              class="input"
            />
          </div>
        </div>
        <div class="form-item">
          <label class="label">登录密码</label>
          <div class="input-wrapper">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <input
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              placeholder="请输入登录密码"
              class="input"
            />
            <button
              type="button"
              class="toggle-password"
              @click="showPassword = !showPassword"
            >
              <svg v-if="showPassword" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.906 5.09l-3.59-3.59" />
              </svg>
            </button>
          </div>
        </div>
        <div v-if="error" class="error-message">
          <svg class="error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{{ error }}</span>
        </div>
        <button type="submit" class="btn" :disabled="loading">
          <span v-if="loading" class="btn-loading">
            <svg class="spinner" viewBox="0 0 24 24">
              <circle class="spinner-circle" cx="12" cy="12" r="10" />
            </svg>
            <span>登录中...</span>
          </span>
          <span v-else>立即绑定</span>
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.page {
  min-height: 100vh;
  width: 100vw;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
  background-size: 100% 100%;
  background-position: center;
  background-repeat: no-repeat;
  padding: 20px;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
  margin: 0;
}

.background-decoration {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
  z-index: 0;
}

.circle {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  animation: float 20s infinite ease-in-out;
}

.circle-1 {
  width: 300px;
  height: 300px;
  top: -150px;
  right: -150px;
  animation-delay: 0s;
}

.circle-2 {
  width: 200px;
  height: 200px;
  bottom: -100px;
  left: -100px;
  animation-delay: 5s;
}

.circle-3 {
  width: 150px;
  height: 150px;
  top: 50%;
  left: 10%;
  animation-delay: 10s;
}

@keyframes float {
  0%, 100% {
    transform: translate(0, 0) scale(1);
  }
  33% {
    transform: translate(30px, -30px) scale(1.1);
  }
  66% {
    transform: translate(-20px, 20px) scale(0.9);
  }
}

.container {
  position: relative;
  z-index: 1;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(20px);
  border-radius: 24px;
  padding: 48px 40px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.5);
  width: 100%;
  max-width: 440px;
  animation: slideUp 0.5s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.header {
  text-align: center;
  margin-bottom: 40px;
}

.logo {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 8px;
}

.logo-icon {
  font-size: 32px;
  animation: rotate 3s linear infinite;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.title {
  margin: 0;
  font-size: 32px;
  font-weight: 700;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.subtitle {
  margin: 0;
  font-size: 14px;
  color: #999;
  font-weight: 500;
  letter-spacing: 1px;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.label {
  font-size: 14px;
  font-weight: 600;
  color: #495057;
  margin-left: 4px;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  background: #f8f9fa;
  border-radius: 12px;
  padding: 0 16px;
  border: 2px solid transparent;
  transition: all 0.3s ease;
  height: 52px;
}

.input-wrapper:hover {
  background: #fff;
  border-color: #e9ecef;
}

.input-wrapper:focus-within {
  background: #fff;
  border-color: #667eea;
  box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
}

.icon {
  width: 20px;
  height: 20px;
  margin-right: 12px;
  color: #6c757d;
  flex-shrink: 0;
}

.input-wrapper:focus-within .icon {
  color: #667eea;
}

.input {
  flex: 1;
  height: 100%;
  border: none;
  background: transparent;
  outline: none;
  font-size: 15px;
  color: #212529;
  font-weight: 500;
}

.input::placeholder {
  color: #adb5bd;
}

.toggle-password {
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  color: #6c757d;
  display: flex;
  align-items: center;
  transition: color 0.2s;
}

.toggle-password:hover {
  color: #667eea;
}

.toggle-password svg {
  width: 20px;
  height: 20px;
}

.captcha-wrapper {
  display: flex;
  gap: 12px;
  align-items: flex-end;
}

.captcha-input-wrapper {
  flex: 1;
}

.captcha-input {
  height: 52px;
}

.captcha-code {
  width: 120px;
  height: 52px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.captcha-code::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  transition: left 0.5s;
}

.captcha-code:hover::before {
  left: 100%;
}

.captcha-code:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
}

.captcha-code:active {
  transform: translateY(0);
}

.captcha-text {
  font-size: 22px;
  font-weight: 700;
  color: #fff;
  letter-spacing: 6px;
  font-family: 'Courier New', 'Monaco', monospace;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.captcha-text.loading-text {
  font-size: 14px;
  letter-spacing: 2px;
  opacity: 0.9;
}

.refresh-icon {
  width: 16px;
  height: 16px;
  color: rgba(255, 255, 255, 0.8);
  transition: transform 0.3s;
}

.captcha-code:hover .refresh-icon {
  transform: rotate(180deg);
}

.error-message {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #fff5f5;
  border: 1px solid #feb2b2;
  border-radius: 10px;
  color: #c53030;
  font-size: 14px;
  animation: shake 0.5s;
}

@keyframes shake {
  0%, 100% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-10px);
  }
  75% {
    transform: translateX(10px);
  }
}

.error-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.btn {
  width: 100%;
  height: 52px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: 8px;
  position: relative;
  overflow: hidden;
}

.btn::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  transform: translate(-50%, -50%);
  transition: width 0.6s, height 0.6s;
}

.btn:hover:not(:disabled)::before {
  width: 300px;
  height: 300px;
}

.btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 12px 24px rgba(102, 126, 234, 0.4);
}

.btn:active:not(:disabled) {
  transform: translateY(0);
}

.btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.btn-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.spinner {
  width: 20px;
  height: 20px;
  animation: spin 1s linear infinite;
}

.spinner-circle {
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-dasharray: 60;
  stroke-dashoffset: 60;
  stroke-linecap: round;
  animation: dash 1.5s ease-in-out infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes dash {
  0% {
    stroke-dasharray: 1, 200;
    stroke-dashoffset: 0;
  }
  50% {
    stroke-dasharray: 90, 200;
    stroke-dashoffset: -35;
  }
  100% {
    stroke-dashoffset: -125;
  }
}

@media (max-width: 480px) {
  .container {
    padding: 36px 28px;
    border-radius: 20px;
  }

  .title {
    font-size: 28px;
  }

  .captcha-wrapper {
    flex-direction: column;
    align-items: stretch;
  }

  .captcha-code {
    width: 100%;
  }
}
</style>


