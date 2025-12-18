<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { getOrderRecords, type OrderRecord } from '../api/orders';

const authStore = useAuthStore();
const router = useRouter();

const loading = ref(false);
const error = ref('');
const records = ref<OrderRecord[]>([]);

const sortedRecords = computed(() =>
  [...records.value].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  ),
);

const formatCurrency = (value: number | undefined) => `$${Number(value || 0).toFixed(2)}`;

const formatDate = (iso: string) => {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${y}-${m}-${day} ${hh}:${mm}:${ss}`;
};

const parseDesc = (desc?: string | null) => {
  if (!desc) return { productName: '', productImage: '', commission: null };
  try {
    const parsed = JSON.parse(desc);
    return {
      productName: parsed.productName || parsed.n || '',
      productImage: parsed.productImage || parsed.img || '',
      commission: parsed.commission ?? parsed.c ?? null,
    };
  } catch {
    return { productName: desc, productImage: '', commission: null };
  }
};

const getDesc = (item: OrderRecord) => parseDesc(item.description);

const load = async () => {
  if (!authStore.user?.id) {
    router.push('/login');
    return;
  }
  loading.value = true;
  error.value = '';
  try {
    records.value = await getOrderRecords(authStore.user.id);
  } catch (e: any) {
    error.value = e?.message || 'Failed to load orders';
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  load();
});
</script>

<template>
  <div class="order-view">
    <header class="page-header">
      <h2>Order</h2>
      <button class="refresh-btn" @click="load" :disabled="loading">
        {{ loading ? 'Loading...' : 'Refresh' }}
      </button>
    </header>

    <div v-if="error" class="alert error">{{ error }}</div>
    <div v-else-if="loading" class="alert info">Loading...</div>
    <div v-else-if="sortedRecords.length === 0" class="alert empty">No order records</div>
    <div v-else class="card-list">
      <div v-for="item in sortedRecords" :key="item.id" class="card">
        <div class="card-header">
          <span class="time">{{ formatDate(item.createdAt) }}</span>
          <span class="status completed">Completed</span>
        </div>
        <div class="card-body">
          <div class="thumb" v-if="getDesc(item).productImage">
            <img :src="getDesc(item).productImage" alt="product" />
          </div>
          <div class="thumb placeholder" v-else>IMG</div>
          <div class="info">
            <div class="title">
              {{ getDesc(item).productName || 'Pre-Order task' }}
            </div>
            <div class="price">{{ formatCurrency(item.amount) }}</div>
            <div class="commission">
              Commission:
              <span class="commission-value">
                {{ formatCurrency(getDesc(item).commission ?? 0) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.order-view {
  padding: 12px;
  min-height: calc(100vh - 60px);
  padding-bottom: 80px;
  background: #0f0f0f;
  color: #fff;
  box-sizing: border-box;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.page-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
}

.refresh-btn {
  border: none;
  background: #ef2f59;
  color: #fff;
  border-radius: 8px;
  padding: 8px 12px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
}

.refresh-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.alert {
  border-radius: 10px;
  padding: 12px;
  margin-top: 10px;
}
.alert.info {
  background: #111827;
  color: #e5e7eb;
}
.alert.error {
  background: #7f1d1d;
  color: #fecdd3;
}
.alert.empty {
  background: #111827;
  color: #9ca3af;
  text-align: center;
}

.card-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.card {
  background: #111111;
  border: 1px solid #1f2937;
  border-radius: 12px;
  padding: 10px 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #9ca3af;
  margin-bottom: 8px;
}

.card-body {
  display: flex;
  gap: 12px;
}

.thumb {
  width: 72px;
  height: 72px;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid #1f2937;
  flex-shrink: 0;
  background: #0f0f0f;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
  font-size: 12px;
}

.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.status {
  padding: 3px 8px;
  border-radius: 10px;
  font-size: 12px;
}
.status.completed {
  background: #d1fae5;
  color: #065f46;
}

.card-body .title {
  font-size: 14px;
  font-weight: 700;
  color: #d1d5db;
  margin-bottom: 6px;
}

.price {
  font-size: 18px;
  font-weight: 800;
  color: #f87171;
  margin-bottom: 4px;
}

.commission {
  font-size: 12px;
  color: #9ca3af;
}
.commission-value {
  color: #ef4444;
  font-weight: 700;
}
</style>

