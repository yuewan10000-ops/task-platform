<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import dayjs from 'dayjs';
import { listRecharges, updateRechargeStatus, type RechargeRequest } from '../api/recharges';

const loading = ref(false);
const savingId = ref<number | null>(null);
const rows = ref<RechargeRequest[]>([]);
const error = ref('');
const viewingImage = ref<string | null>(null);

const fetchData = async () => {
  loading.value = true;
  error.value = '';
  try {
    rows.value = await listRecharges();
  } catch (err: any) {
    error.value = err?.message || '加载失败';
  } finally {
    loading.value = false;
  }
};

const approve = async (id: number) => {
  savingId.value = id;
  try {
    await updateRechargeStatus(id, 'approved');
    await fetchData();
    // 触发事件通知MainLayout刷新待审核数量
    window.dispatchEvent(new CustomEvent('recharge-status-updated'));
  } catch (err: any) {
    error.value = err?.message || '操作失败';
  } finally {
    savingId.value = null;
  }
};

const reject = async (id: number) => {
  savingId.value = id;
  try {
    await updateRechargeStatus(id, 'rejected');
    await fetchData();
    // 触发事件通知MainLayout刷新待审核数量
    window.dispatchEvent(new CustomEvent('recharge-status-updated'));
  } catch (err: any) {
    error.value = err?.message || '操作失败';
  } finally {
    savingId.value = null;
  }
};

const statusLabel = (status: string) => {
  if (status === 'approved') return '已通过';
  if (status === 'rejected') return '已驳回';
  return '待审核';
};

const statusClass = (status: string) => {
  if (status === 'approved') return 'tag success';
  if (status === 'rejected') return 'tag danger';
  return 'tag warning';
};

const totalPending = computed(() => rows.value.filter((r) => r.status === 'pending').length);

const viewImage = (image: string) => {
  viewingImage.value = image;
};

const closeImage = () => {
  viewingImage.value = null;
};

onMounted(fetchData);
</script>

<template>
  <div class="page">
    <header class="page-header">
      <div>
        <h2>充值管理</h2>
        <p class="subtitle">查看 A 端提交的充值请求，手动通过或驳回。</p>
      </div>
      <button class="refresh" :disabled="loading" @click="fetchData">
        {{ loading ? '刷新中' : '刷新' }}
      </button>
    </header>

    <div class="summary">
      待审核：{{ totalPending }} 条
      <span v-if="error" class="error">{{ error }}</span>
    </div>

    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>用户</th>
            <th>金额</th>
            <th>凭证</th>
            <th>状态</th>
            <th>提交时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.id">
            <td>{{ row.id }}</td>
            <td>
              <div class="user">
                <div class="account">{{ row.user?.account || '-' }}</div>
                <div class="sub">
                  {{ row.user?.name || '-' }} / 邀请码: {{ row.user?.myInviteCode || '-' }}
                </div>
              </div>
            </td>
            <td class="amount">${{ Number(row.amount).toFixed(2) }}</td>
            <td class="voucher">
              <div v-if="row.voucherImage" class="voucher-thumb" @click="viewImage(row.voucherImage!)">
                <img :src="row.voucherImage" alt="Voucher" />
                <span class="view-text">查看</span>
              </div>
              <span v-else class="no-voucher">-</span>
            </td>
            <td><span :class="statusClass(row.status)">{{ statusLabel(row.status) }}</span></td>
            <td>{{ dayjs(row.createdAt).format('YYYY-MM-DD HH:mm') }}</td>
            <td class="actions">
              <button
                class="approve"
                :disabled="savingId === row.id || row.status !== 'pending'"
                @click="approve(row.id)"
              >
                通过
              </button>
              <button
                class="reject"
                :disabled="savingId === row.id || row.status !== 'pending'"
                @click="reject(row.id)"
              >
                驳回
              </button>
            </td>
          </tr>
          <tr v-if="!loading && rows.length === 0">
            <td colspan="7" class="empty">暂无数据</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 图片查看模态框 -->
    <div v-if="viewingImage" class="image-modal" @click="closeImage">
      <div class="image-modal-content" @click.stop>
        <button class="close-btn" @click="closeImage">×</button>
        <img :src="viewingImage" alt="Recharge Voucher" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.page {
  max-width: 1200px;
  margin: 0 auto;
}
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
h2 {
  margin: 0;
  font-size: 22px;
}
.subtitle {
  margin: 4px 0 0;
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
.summary {
  margin-bottom: 12px;
  color: #374151;
}
.error {
  margin-left: 12px;
  color: #ef4444;
}
.table-wrapper {
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 16px 32px rgba(15, 23, 42, 0.08);
  overflow: hidden;
}
table {
  width: 100%;
  border-collapse: collapse;
}
th, td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #f1f5f9;
}
th {
  background: #f8fafc;
  font-weight: 700;
  color: #475569;
}
.user .account {
  font-weight: 600;
}
.user .sub {
  color: #6b7280;
  font-size: 12px;
}
.amount {
  font-weight: 700;
  color: #111827;
}
.tag {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
}
.tag.warning {
  background: #fff7ed;
  color: #ea580c;
}
.tag.success {
  background: #ecfdf3;
  color: #16a34a;
}
.tag.danger {
  background: #fef2f2;
  color: #dc2626;
}
.actions {
  display: flex;
  gap: 8px;
}
.approve, .reject {
  border: none;
  border-radius: 8px;
  padding: 8px 12px;
  cursor: pointer;
  color: #fff;
}
.approve {
  background: #16a34a;
}
.reject {
  background: #dc2626;
}
.approve:disabled, .reject:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.empty {
  text-align: center;
  color: #6b7280;
}
.voucher {
  text-align: center;
}
.voucher-thumb {
  position: relative;
  display: inline-block;
  width: 60px;
  height: 60px;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid #e5e7eb;
  transition: all 0.2s;
}
.voucher-thumb:hover {
  border-color: #3b82f6;
  transform: scale(1.05);
}
.voucher-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.voucher-thumb .view-text {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  font-size: 10px;
  text-align: center;
  padding: 2px;
}
.no-voucher {
  color: #9ca3af;
}
.image-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  cursor: pointer;
}
.image-modal-content {
  position: relative;
  max-width: 90vw;
  max-height: 90vh;
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  cursor: default;
}
.image-modal-content img {
  max-width: 100%;
  max-height: 80vh;
  display: block;
  border-radius: 8px;
}
.close-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 32px;
  height: 32px;
  border: none;
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  border-radius: 50%;
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}
.close-btn:hover {
  background: rgba(0, 0, 0, 0.7);
}
</style>

