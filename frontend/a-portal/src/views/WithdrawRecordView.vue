<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { getUserWithdrawRecords, type WithdrawRecord } from '../api/withdraws';

const router = useRouter();
const authStore = useAuthStore();

const loading = ref(false);
const records = ref<WithdrawRecord[]>([]);
const error = ref('');

const fetchRecords = async () => {
  if (!authStore.user?.id) {
    router.push('/login');
    return;
  }
  loading.value = true;
  error.value = '';
  try {
    records.value = await getUserWithdrawRecords(authStore.user.id);
  } catch (e: any) {
    error.value = e?.message || 'Failed to fetch withdraw records';
    console.error(e);
  } finally {
    loading.value = false;
  }
};

const formatCurrency = (amount: number) => {
  return `$${amount.toFixed(2)}`;
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleString();
};

const getStatusText = (status: string) => {
  switch (status) {
    case 'pending':
      return 'Pending';
    case 'approved':
      return 'Approved';
    case 'rejected':
      return 'Rejected';
    default:
      return status;
  }
};

const getStatusClass = (status: string) => {
  switch (status) {
    case 'pending':
      return 'status-pending';
    case 'approved':
      return 'status-approved';
    case 'rejected':
      return 'status-rejected';
    default:
      return '';
  }
};

onMounted(() => {
  authStore.initAuth();
  if (!authStore.isAuthenticated) {
    router.push('/login');
    return;
  }
  fetchRecords();
});
</script>

<template>
  <div class="record-page">
    <header class="top-bar">
      <button class="back-btn" @click="router.back()">←</button>
      <h2>Withdraw record</h2>
      <span class="placeholder" />
    </header>

    <div v-if="loading" class="loading">Loading...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else-if="records.length === 0" class="empty">No withdraw records</div>
    <div v-else class="records-list">
      <div v-for="record in records" :key="record.id" class="record-item">
        <div class="record-header">
          <div class="amount">{{ formatCurrency(Number(record.amount)) }}</div>
          <div :class="['status', getStatusClass(record.status)]">
            {{ getStatusText(record.status) }}
          </div>
        </div>
        <div class="record-info">
          <div v-if="record.walletAddress" class="wallet">
            Wallet: {{ record.walletAddress }}
          </div>
          <div class="date">{{ formatDate(record.createdAt) }}</div>
          <div v-if="record.note" class="note">{{ record.note }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.record-page {
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

.loading,
.error,
.empty {
  text-align: center;
  padding: 40px 20px;
  color: #cbd5e1;
}

.error {
  color: #f87171;
}

.records-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.record-item {
  background: #181b23;
  border-radius: 12px;
  padding: 16px;
}

.record-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.amount {
  font-size: 18px;
  font-weight: 700;
  color: #ff4b81;
}

.status {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.status-pending {
  background: #fbbf24;
  color: #000;
}

.status-approved {
  background: #10b981;
  color: #fff;
}

.status-rejected {
  background: #ef4444;
  color: #fff;
}

.record-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.wallet {
  font-size: 12px;
  color: #cbd5e1;
  word-break: break-all;
  margin-bottom: 4px;
}

.date {
  font-size: 12px;
  color: #cbd5e1;
}

.note {
  font-size: 12px;
  color: #94a3b8;
  margin-top: 4px;
}
</style>

