<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import dayjs from 'dayjs';
import { listWithdraws, updateWithdrawStatus, type WithdrawRequest } from '../api/withdraws';

const loading = ref(false);
const savingId = ref<number | null>(null);
const rows = ref<WithdrawRequest[]>([]);
const error = ref('');

// Reject modal state
const showRejectModal = ref(false);
const rejectId = ref<number | null>(null);
const rejectNote = ref('');

const fetchData = async () => {
  loading.value = true;
  error.value = '';
  try {
    rows.value = await listWithdraws();
  } catch (err: any) {
    error.value = err?.message || '加载失败';
  } finally {
    loading.value = false;
  }
};

const approve = async (id: number) => {
  savingId.value = id;
  try {
    await updateWithdrawStatus(id, 'approved');
    await fetchData();
  } catch (err: any) {
    error.value = err?.message || '操作失败';
  } finally {
    savingId.value = null;
  }
};

const openRejectModal = (id: number) => {
  rejectId.value = id;
  rejectNote.value = '';
  showRejectModal.value = true;
};

const closeRejectModal = () => {
  if (savingId.value) return;
  showRejectModal.value = false;
  rejectId.value = null;
  rejectNote.value = '';
};

const submitReject = async () => {
  if (!rejectId.value) return;
  // 驳回理由可选，不强制要求
  savingId.value = rejectId.value;
  try {
    await updateWithdrawStatus(rejectId.value, 'rejected', rejectNote.value.trim());
    showRejectModal.value = false;
    rejectId.value = null;
    rejectNote.value = '';
    await fetchData();
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

onMounted(fetchData);
</script>

<template>
  <div class="page">
    <header class="page-header">
      <div>
        <h2>取款管理</h2>
        <p class="subtitle">审核A端提交的取款申请，通过或驳回。</p>
      </div>
      <button class="refresh" :disabled="loading" @click="fetchData">
        {{ loading ? '加载中...' : '刷新' }}
      </button>
    </header>

    <div class="summary">
      待审核: {{ totalPending }}
      <span v-if="error" class="error">{{ error }}</span>
    </div>

    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>用户</th>
            <th>金额</th>
            <th>钱包地址</th>
            <th>状态</th>
            <th>申请时间</th>
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
            <td>{{ row.walletAddress || row.user?.walletAddress || '-' }}</td>
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
                @click="openRejectModal(row.id)"
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

    <!-- 驳回理由弹窗 -->
    <div v-if="showRejectModal" class="modal-overlay" @click="closeRejectModal">
      <div class="modal" @click.stop>
        <h3 class="modal-title">驳回理由</h3>
        <textarea
          v-model="rejectNote"
          class="modal-textarea"
          rows="4"
          placeholder="请输入驳回理由（可选）"
        />
        <div class="modal-actions">
          <button class="btn cancel" :disabled="savingId !== null" @click="closeRejectModal">
            取消
          </button>
          <button class="btn confirm" :disabled="savingId !== null" @click="submitReject">
            {{ savingId ? '提交中...' : '确认' }}
          </button>
        </div>
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
th,
td {
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
.approve,
.reject {
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
.empty {
  text-align: center;
  color: #9ca3af;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  width: 360px;
  max-width: 90%;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.2);
}

.modal-title {
  margin: 0 0 12px;
  font-size: 16px;
  font-weight: 600;
}

.modal-textarea {
  width: 100%;
  border-radius: 8px;
  border: 1px solid #d1d5db;
  padding: 8px;
  resize: vertical;
  font-size: 14px;
  box-sizing: border-box;
}

.modal-actions {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.btn {
  border: none;
  border-radius: 8px;
  padding: 8px 14px;
  cursor: pointer;
  font-size: 14px;
}

.btn.cancel {
  background: #e5e7eb;
  color: #374151;
}

.btn.confirm {
  background: #dc2626;
  color: #fff;
}
</style>


