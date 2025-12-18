<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { getRechargeConfig, updateRechargeConfig } from '../api/rechargeConfig';

const trc20 = ref('');
const trx = ref('');
const loading = ref(false);
const saving = ref(false);
const message = ref('');
const error = ref('');

const load = async () => {
  loading.value = true;
  message.value = '';
  error.value = '';
  try {
    const data = await getRechargeConfig();
    trc20.value = data.trc20Address ?? '';
    trx.value = data.trxAddress ?? '';
  } catch (err: any) {
    error.value = err?.message || '加载失败';
  } finally {
    loading.value = false;
  }
};

const save = async () => {
  saving.value = true;
  message.value = '';
  error.value = '';
  try {
    await updateRechargeConfig({
      trc20Address: trc20.value.trim(),
      trxAddress: trx.value.trim(),
    });
    message.value = '已保存';
  } catch (err: any) {
    error.value = err?.message || '保存失败';
  } finally {
    saving.value = false;
  }
};

onMounted(load);
</script>

<template>
  <div class="recharge-manage">
    <header class="page-header">
      <div>
        <h2>充值地址管理</h2>
        <p class="subtitle">管理 A 端展示的 TRC20 / TRX 充值地址。</p>
      </div>
      <button class="refresh" :disabled="loading" @click="load">
        {{ loading ? '刷新中' : '刷新' }}
      </button>
    </header>

    <div class="card">
      <div class="field">
        <label>TRC20 地址</label>
        <input v-model="trc20" type="text" placeholder="输入 TRC20 充值地址" />
      </div>
      <div class="field">
        <label>TRX 地址</label>
        <input v-model="trx" type="text" placeholder="输入 TRX 充值地址" />
      </div>
      <div class="actions">
        <button class="primary" :disabled="saving" @click="save">
          {{ saving ? '保存中...' : '保存' }}
        </button>
        <span v-if="message" class="status success">{{ message }}</span>
        <span v-else-if="error" class="status error">{{ error }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.recharge-manage {
  max-width: 800px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: #1f2937;
}

.subtitle {
  margin: 6px 0 0;
  color: #6b7280;
  font-size: 14px;
}

.refresh {
  border: 1px solid #d1d5db;
  background: #fff;
  border-radius: 10px;
  padding: 8px 14px;
  cursor: pointer;
}

.card {
  background: #fff;
  border-radius: 14px;
  padding: 24px;
  box-shadow: 0 16px 32px rgba(15, 23, 42, 0.08);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

label {
  font-weight: 600;
  color: #111827;
}

input {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 12px;
  font-size: 14px;
}

.actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.primary {
  border: none;
  background: linear-gradient(135deg, #2563eb, #4f46e5);
  color: #fff;
  border-radius: 10px;
  padding: 10px 18px;
  cursor: pointer;
  font-weight: 700;
}

.status {
  font-size: 13px;
}

.status.success {
  color: #16a34a;
}

.status.error {
  color: #ef4444;
}
</style>
