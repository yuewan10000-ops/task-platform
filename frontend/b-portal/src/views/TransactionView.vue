<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getUserList, type User } from '../api/users';
import { createOrderRecord } from '../api/orders';

const route = useRoute();
const router = useRouter();

const mode = computed<'recharge' | 'withdraw'>(() => {
  const type = route.meta.transactionType;
  return (type === 'withdraw' ? 'withdraw' : 'recharge') as 'recharge' | 'withdraw';
});

const titleMap = {
  recharge: '余额充值',
  withdraw: '余额取款',
};

const users = ref<User[]>([]);
const loading = ref(false);
const submitting = ref(false);
const form = reactive({
  userId: '',
  amount: '',
  description: '',
});

const loadUsers = async () => {
  loading.value = true;
  try {
    users.value = await getUserList();
  } catch (error) {
    console.error('加载用户失败', error);
    window.alert((error as Error).message || 'Failed to load users');
  } finally {
    loading.value = false;
  }
};

const handleSubmit = async () => {
  if (!form.userId || !form.amount) {
    window.alert('Please select a user and enter amount');
    return;
  }
  const amountValue = Number(form.amount);
  if (Number.isNaN(amountValue) || amountValue <= 0) {
    window.alert('Please enter a valid amount');
    return;
  }

  submitting.value = true;
  try {
    await createOrderRecord({
      userId: Number(form.userId),
      orderType: mode.value,
      amount: amountValue,
      status: 'completed',
      description: form.description || `${titleMap[mode.value]}操作`,
    });
    window.alert(`${titleMap[mode.value]} submitted successfully`);
    router.push('/members');
  } catch (error) {
    console.error('提交失败', error);
    window.alert((error as Error).message || 'Submit failed');
  } finally {
    submitting.value = false;
  }
};

onMounted(() => {
  loadUsers();
});
</script>

<template>
  <div class="transaction-page">
    <header class="page-header">
      <div>
        <h2>{{ titleMap[mode] }}</h2>
        <p class="subtitle">
          请选择需要{{ mode === 'recharge' ? '充值' : '取款' }}的用户并填写金额，操作会立即记录到系统
        </p>
      </div>
      <button class="back-btn" @click="router.back()">返回</button>
    </header>

    <div class="form-card">
      <div class="form-group">
        <label>选择用户</label>
        <select v-model="form.userId" :disabled="loading || submitting">
          <option value="" disabled>请选择用户</option>
          <option v-for="user in users" :key="user.id" :value="user.id">
            {{ user.name || user.account || '未命名用户' }} (ID: {{ user.id }})
          </option>
        </select>
      </div>

      <div class="form-group">
        <label>金额 (USD)</label>
        <input
          v-model="form.amount"
          type="number"
          min="0"
          step="0.01"
          placeholder="请输入金额"
          :disabled="submitting"
        />
      </div>

      <div class="form-group">
        <label>备注</label>
        <textarea
          v-model="form.description"
          rows="3"
          placeholder="可填写本次{{ mode === 'recharge' ? '充值' : '取款' }}原因"
          :disabled="submitting"
        />
      </div>

      <button class="submit-btn" :disabled="submitting" @click="handleSubmit">
        {{ submitting ? '提交中...' : `确认${mode === 'recharge' ? '充值' : '取款'}` }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.transaction-page {
  max-width: 720px;
  margin: 0 auto;
  background: #fff;
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 20px 60px rgba(15, 23, 42, 0.12);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 28px;
}

.page-header h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: #1f2937;
}

.subtitle {
  margin: 4px 0 0;
  color: #6b7280;
  font-size: 14px;
}

.back-btn {
  border: none;
  background: #f3f4f6;
  color: #374151;
  padding: 8px 16px;
  border-radius: 999px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;
}

.back-btn:hover {
  background: #e5e7eb;
}

.form-card {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

label {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
}

select,
input,
textarea {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 12px 14px;
  font-size: 15px;
  transition: border 0.2s, box-shadow 0.2s;
  font-family: inherit;
  color: #111827;
}

select:focus,
input:focus,
textarea:focus {
  outline: none;
  border-color: #fb7185;
  box-shadow: 0 0 0 3px rgba(251, 113, 133, 0.2);
}

.submit-btn {
  margin-top: 8px;
  border: none;
  background: linear-gradient(135deg, #fb7185, #ec4899);
  color: #fff;
  padding: 14px 20px;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
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

@media (max-width: 640px) {
  .transaction-page {
    padding: 20px;
  }

  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>

