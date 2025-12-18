<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { getUserInfo, type UserInfo } from '../api/user';

const router = useRouter();
const authStore = useAuthStore();

const loading = ref(false);
const error = ref('');
const userInfo = ref<UserInfo | null>(null);

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

const handleBack = () => {
  router.back();
};

const copyInviteCode = async () => {
  const code = userInfo.value?.user.myInviteCode;
  if (!code) return;
  try {
    await navigator.clipboard.writeText(code);
    alert('Invite code copied');
  } catch {
    alert('Copy failed');
  }
};

const handleInvite = () => {
  // 这里可以扩展成分享链接，现在先复制邀请码
  copyInviteCode();
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
  <div class="invite-page">
    <header class="invite-header">
      <button class="back-btn" @click="handleBack">←</button>
      <h1>Invite friends</h1>
      <div class="header-placeholder" />
    </header>

    <main class="invite-main">
      <div class="illustration-wrapper">
        <img src="/fin.jpg" alt="Invite friends" />
      </div>

      <p class="invite-text">
        Invite friends, to
        <span class="highlight">get rewards</span>
      </p>

      <div class="code-wrapper">
        <input
          class="code-input"
          type="text"
          :value="userInfo?.user.myInviteCode || ''"
          readonly
        />
        <button class="copy-btn" @click="copyInviteCode">
          📋
        </button>
      </div>

      <button class="invite-btn" @click="handleInvite">
        Invite friends
      </button>

      <div v-if="loading" class="status-text">加载中...</div>
      <div v-if="error" class="status-text error">{{ error }}</div>
    </main>
  </div>
</template>

<style scoped>
.invite-page {
  min-height: 100vh;
  background: #050505;
  color: #fff;
  display: flex;
  flex-direction: column;
}

.invite-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  font-size: 16px;
  font-weight: 600;
}

.back-btn {
  width: 32px;
  height: 32px;
  border-radius: 16px;
  border: none;
  background: #2b2b2b;
  color: #fff;
  cursor: pointer;
}

.header-placeholder {
  width: 32px;
  height: 32px;
}

.invite-main {
  flex: 1;
  padding: 0 16px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.illustration-wrapper {
  margin-top: 8px;
  margin-bottom: 16px;
  width: 100%;
  max-width: 360px;
  border-radius: 16px;
  overflow: hidden;
  background: #111;
}

.illustration-wrapper img {
  width: 100%;
  display: block;
}

.invite-text {
  margin: 8px 0 24px;
  font-size: 16px;
  color: #ccc;
}

.highlight {
  color: #4b7cff;
  margin-left: 4px;
}

.code-wrapper {
  width: 100%;
  max-width: 420px;
  display: flex;
  align-items: center;
  background: #141414;
  border-radius: 999px;
  padding: 0 4px 0 16px;
  margin-bottom: 24px;
}

.code-input {
  flex: 1;
  height: 42px;
  border: none;
  background: transparent;
  color: #fff;
  font-size: 16px;
  outline: none;
}

.copy-btn {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: none;
  background: #ff6b35;
  color: #fff;
  cursor: pointer;
}

.invite-btn {
  width: 100%;
  max-width: 420px;
  height: 48px;
  border-radius: 999px;
  border: none;
  background: #ff6b35;
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 8px 16px rgba(255, 107, 53, 0.4);
}

.status-text {
  margin-top: 12px;
  font-size: 13px;
  color: #888;
}

.status-text.error {
  color: #ff4d4f;
}
</style>


