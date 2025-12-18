<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { getUserList, type User } from '../api/users';

const router = useRouter();
const authStore = useAuthStore();

const users = ref<User[]>([]);
const loading = ref(false);
const error = ref('');

const loadUsers = async () => {
  loading.value = true;
  error.value = '';
  try {
    users.value = await getUserList();
  } catch (e: any) {
    error.value = e?.message || '加载用户列表失败';
    if (e?.message?.includes('401') || e?.message?.includes('未授权')) {
      authStore.logout();
      router.push('/login');
    }
  } finally {
    loading.value = false;
  }
};

const handleLogout = () => {
  authStore.logout();
  router.push('/login');
};

onMounted(() => {
  loadUsers();
});

const formatDate = (date: Date | string) => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};
</script>

<template>
  <div class="page">
    <header class="header">
      <div class="header-left">
        <h1>用户管理</h1>
        <span class="user-info" v-if="authStore.user">
          当前用户: {{ authStore.user.account }}
        </span>
      </div>
      <div class="header-right">
        <button class="refresh-btn" @click="loadUsers" :disabled="loading">
          {{ loading ? '刷新中...' : '刷新' }}
        </button>
        <button class="logout-btn" @click="handleLogout">退出登录</button>
      </div>
    </header>
    <div class="content">
      <div v-if="loading && users.length === 0" class="loading">加载中...</div>
      <div v-else-if="error" class="error">{{ error }}</div>
      <div v-else-if="users.length === 0" class="empty">暂无注册用户</div>
      <table v-else class="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>账号</th>
            <th>邮箱</th>
            <th>姓名</th>
            <th>邀请码</th>
            <th>注册时间</th>
            <th>更新时间</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in users" :key="user.id">
            <td>{{ user.id }}</td>
            <td>{{ user.account || '-' }}</td>
            <td>{{ user.email || '-' }}</td>
            <td>{{ user.name || '-' }}</td>
            <td>{{ user.inviteCode || '-' }}</td>
            <td>{{ formatDate(user.createdAt) }}</td>
            <td>{{ formatDate(user.updatedAt) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.page {
  min-height: 100vh;
  background: #f5f6fa;
  padding: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  background: #fff;
  padding: 20px 24px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.header h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: #1b1d22;
}

.user-info {
  font-size: 14px;
  color: #666;
}

.header-right {
  display: flex;
  gap: 12px;
  align-items: center;
}

.refresh-btn,
.logout-btn {
  padding: 8px 16px;
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: opacity 0.2s;
}

.refresh-btn {
  background: #667eea;
}

.logout-btn {
  background: #ff6b6b;
}

.refresh-btn:hover:not(:disabled),
.logout-btn:hover {
  opacity: 0.9;
}

.refresh-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.content {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.loading,
.error,
.empty {
  padding: 40px;
  text-align: center;
  color: #666;
  font-size: 16px;
}

.error {
  color: #ff6b6b;
}

.table {
  width: 100%;
  border-collapse: collapse;
}

.table thead {
  background: #f8f9fa;
}

.table th {
  padding: 12px 16px;
  text-align: left;
  font-weight: 600;
  color: #495057;
  font-size: 14px;
  border-bottom: 2px solid #e9ecef;
}

.table td {
  padding: 12px 16px;
  border-bottom: 1px solid #e9ecef;
  color: #212529;
  font-size: 14px;
}

.table tbody tr:hover {
  background: #f8f9fa;
}

.table tbody tr:last-child td {
  border-bottom: none;
}

@media (max-width: 768px) {
  .page {
    padding: 12px;
  }

  .header {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }

  .table {
    font-size: 12px;
  }

  .table th,
  .table td {
    padding: 8px;
  }
}
</style>

