<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import http from '../api/http';
import { getActiveCommissionRate, type CommissionRate } from '../api/commissionRate';

const route = useRoute();
const router = useRouter();

// 使用 computed 实时获取 userId
const userId = computed(() => {
  const pick = (v: unknown): number | null => {
    if (Array.isArray(v)) return pick(v[0]);
    if (typeof v === 'string' && v.trim() !== '') {
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    }
    if (typeof v === 'number') return Number.isFinite(v) ? v : null;
    return null;
  };
  
  const fromParams = pick(route.params.userId);
  const fromQuery = pick(route.query.userId);
  const fromPath = (() => {
    const matcher = /orders\/(\d+)\/add/;
    const m1 = route.fullPath.match(matcher);
    if (m1?.[1]) return Number(m1[1]);
    const m2 = route.path.match(matcher);
    if (m2?.[1]) return Number(m2[1]);
    return null;
  })();
  const candidates = [fromParams, fromQuery, fromPath].filter((n) => n !== null);
  
  console.log('解析 userId:', {
    params: route.params.userId,
    query: route.query.userId,
    fullPath: route.fullPath,
    resolved: candidates[0] || null,
  });
  
  return candidates.length ? (candidates[0] as number) : null;
});

const maxOrders = ref<number | null>(null);
const commissionRate = ref<number | null>(null);
const globalCommissionRate = ref<CommissionRate | null>(null);
const submitting = ref(false);
const error = ref('');
const loading = ref(false);

const submit = async () => {
  error.value = '';
  const currentUserId = userId.value;
  console.log('提交时 userId:', currentUserId);
  
  if (!currentUserId || !Number.isFinite(currentUserId)) {
    error.value = `用户ID无效，请返回重试。当前值: ${currentUserId}, 路径: ${route.fullPath}`;
    return;
  }
  if (maxOrders.value === null || commissionRate.value === null) {
    error.value = '请填写可做单数和佣金比例';
    return;
  }
  submitting.value = true;
  try {
    const payload = {
      userId: currentUserId,
      maxOrders: maxOrders.value,
      commissionRate: commissionRate.value,
      orderType: 'pre-order',
      amount: 0,
      status: 'enabled',
    };
    console.log('提交数据:', payload);
    await http.post('/orders/settings', payload);
    router.push(`/orders/${currentUserId}`);
  } catch (e: any) {
    error.value = e?.message || '提交失败';
  } finally {
    submitting.value = false;
  }
};

const cancel = () => {
  router.back();
};

// 获取全局佣金比例
const fetchGlobalCommissionRate = async () => {
  loading.value = true;
  try {
    globalCommissionRate.value = await getActiveCommissionRate();
  } catch (e: any) {
    console.error('获取全局佣金比例失败:', e);
    // 如果获取失败，使用默认值
    globalCommissionRate.value = null;
  } finally {
    loading.value = false;
  }
};

// 计算最终佣金比例（全局 + 用户个人）
const finalCommissionRate = computed(() => {
  const global = globalCommissionRate.value ? Number(globalCommissionRate.value.rate) : 0;
  const user = commissionRate.value || 0;
  return global + user;
});

onMounted(() => {
  fetchGlobalCommissionRate();
});
</script>

<template>
  <div class="add-setting-page">
    <div class="header">
      <h3>添加设置</h3>
      <button class="close-btn" @click="cancel">×</button>
    </div>

    <div class="form">
      <div class="form-item">
        <label>可做单数</label>
        <input
          v-model.number="maxOrders"
          type="number"
          min="0"
          placeholder="用户今日可以做多少单"
        />
      </div>

      <div class="form-item">
        <label>佣金比例</label>
        <div v-if="globalCommissionRate" class="global-rate-info">
          <span class="info-label">全局佣金比例：</span>
          <span class="info-value">{{ (Number(globalCommissionRate.rate) * 100).toFixed(2) }}%</span>
        </div>
        <div v-else class="global-rate-info">
          <span class="info-label">全局佣金比例：</span>
          <span class="info-value">未设置（默认 0%）</span>
        </div>
        <input
          v-model.number="commissionRate"
          type="number"
          min="0"
          step="0.01"
          placeholder="用户个人佣金比例（在全局基础上叠加），如 0.05 表示 5%"
        />
        <p class="hint">1 = 100%，0.01 = 1%，谨慎设置</p>
        <div v-if="commissionRate !== null && commissionRate !== undefined" class="final-rate-info">
          <span class="info-label">最终佣金比例：</span>
          <span class="info-value highlight">{{ (finalCommissionRate * 100).toFixed(2) }}%</span>
        </div>
      </div>

      <p v-if="error" class="error-text">{{ error }}</p>

      <div class="actions">
        <button class="btn submit" :disabled="submitting" @click="submit">
          {{ submitting ? '提交中...' : '提交' }}
        </button>
        <button class="btn cancel" :disabled="submitting" @click="cancel">取消</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.add-setting-page {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
  max-width: 720px;
  margin: 0 auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.close-btn {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 50%;
  background: #6c757d;
  color: #fff;
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
}

.form {
  background: #f8f9fa;
  padding: 16px;
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-item label {
  display: block;
  margin-bottom: 8px;
  color: #495057;
  font-weight: 500;
}

.form-item input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  font-size: 14px;
  background: #fff;
}

.hint {
  margin: 6px 0 0;
  color: #6c757d;
  font-size: 12px;
}

.global-rate-info {
  margin-bottom: 8px;
  padding: 8px 12px;
  background: #e7f3ff;
  border-radius: 4px;
  font-size: 13px;
}

.info-label {
  color: #495057;
  font-weight: 500;
}

.info-value {
  color: #17a2b8;
  font-weight: 600;
  margin-left: 8px;
}

.final-rate-info {
  margin-top: 8px;
  padding: 8px 12px;
  background: #d4edda;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 600;
}

.final-rate-info .info-value.highlight {
  color: #155724;
  font-size: 14px;
}

.error-text {
  color: #dc3545;
  margin: 0;
}

.actions {
  display: flex;
  gap: 12px;
  margin-top: 8px;
}

.btn {
  padding: 10px 18px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn.submit {
  background: #17a2b8;
  color: #fff;
}

.btn.submit:hover {
  background: #138496;
}

.btn.cancel {
  background: #f86c41;
  color: #fff;
}

.btn.cancel:hover {
  background: #e05a33;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>

