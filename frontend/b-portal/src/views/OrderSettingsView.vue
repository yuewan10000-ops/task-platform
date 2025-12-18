<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import http from '../api/http';
import { getActiveCommissionRate, type CommissionRate } from '../api/commissionRate';

const route = useRoute();
const router = useRouter();

const userId = computed(() => {
  const param = route.params.userId;
  if (typeof param === 'string') {
    const id = parseInt(param);
    return Number.isFinite(id) ? id : NaN;
  }
  return NaN;
});
const userAccount = ref('');
const records = ref<any[]>([]);
const setting = ref<any | null>(null);
const settingHistory = ref<any[]>([]);
const loading = ref(false);
const error = ref('');
const showEditModal = ref(false);
const editingItem = ref<any | null>(null);
const editForm = ref({
  maxOrders: 0,
  commissionRate: 0,
});
const submitting = ref(false);
const globalCommissionRate = ref<CommissionRate | null>(null);

const loadUserInfo = async () => {
  try {
    const user = await http.get(`/users/${userId.value}`);
    userAccount.value = user.account || `UID:${userId.value}`;
  } catch (e: any) {
    userAccount.value = `UID:${userId.value}`;
  }
};

const loadSetting = async () => {
  try {
    const data = await http.get(`/orders/settings/${userId.value}`);
    setting.value = data;
  } catch (e) {
    setting.value = null;
  }
};

const loadSettingHistory = async () => {
  try {
    const data = await http.get(`/orders/settings/${userId.value}/history`);
    settingHistory.value = Array.isArray(data) ? data : [];
  } catch (e) {
    settingHistory.value = [];
  }
};

const loadRecords = async () => {
  loading.value = true;
  error.value = '';
  try {
    const data = await http.get(`/orders/records/${userId.value}`);
    records.value = data;
  } catch (e: any) {
    error.value = e?.message || '加载做单记录失败';
  } finally {
    loading.value = false;
  }
};

// 获取全局佣金比例
const fetchGlobalCommissionRate = async () => {
  try {
    globalCommissionRate.value = await getActiveCommissionRate();
  } catch (e: any) {
    console.error('获取全局佣金比例失败:', e);
    globalCommissionRate.value = null;
  }
};

// 计算最终佣金比例（全局 + 用户个人）
const getFinalCommissionRate = (userRate: number | string) => {
  const global = globalCommissionRate.value ? Number(globalCommissionRate.value.rate) : 0;
  const user = Number(userRate || 0);
  return global + user;
};

const formatDate = (date: Date | string) => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

const handleAddSetting = () => {
  const id = userId.value;
  if (!Number.isFinite(id)) {
    console.error('无效的 userId:', id, 'route.params:', route.params);
    alert('Invalid user ID, please open from member list again');
    return;
  }
  router.push(`/orders/${id}/add`);
};

const formatAmount = (amount: number | string) => {
  return Number(amount).toFixed(2);
};

const openEditModal = (item: any) => {
  editingItem.value = item;
  editForm.value = {
    maxOrders: item.maxOrders,
    commissionRate: Number(item.commissionRate || 0),
  };
  showEditModal.value = true;
};

const closeEditModal = () => {
  showEditModal.value = false;
  editingItem.value = null;
};

const handleEdit = async () => {
  if (!editingItem.value) return;
  submitting.value = true;
  try {
    await http.put(`/orders/settings/${editingItem.value.id}`, {
      userId: userId.value,
      maxOrders: editForm.value.maxOrders,
      commissionRate: editForm.value.commissionRate,
    });
    closeEditModal();
    loadSetting();
    loadSettingHistory();
  } catch (e: any) {
    alert(e?.message || 'Update failed');
  } finally {
    submitting.value = false;
  }
};

const handleDelete = async (item: any) => {
  if (!confirm(`确定要删除这条设置吗？\n可做单数: ${item.maxOrders}\n佣金比例: ${Number(item.commissionRate || 0).toFixed(2)}`)) {
    return;
  }
  try {
    await http.delete(`/orders/settings/${item.id}`);
    loadSetting();
    loadSettingHistory();
  } catch (e: any) {
    alert(e?.message || 'Delete failed');
  }
};

onMounted(() => {
  loadUserInfo();
  loadSetting();
  loadSettingHistory();
  loadRecords();
  fetchGlobalCommissionRate();
});
</script>

<template>
  <div class="order-settings-page">
    <div class="page-header">
      <h2 class="page-title">>> {{ userAccount }} 做单设置</h2>
      <button class="add-btn" @click="handleAddSetting">添加设置</button>
    </div>

    <div class="info-message">
      如果用户加入了叠加组,设置无法生效
    </div>

    <div class="setting-summary" v-if="setting">
      <div>可做单数：{{ setting.maxOrders }}</div>
      <div>
        用户个人佣金比例：{{ Number(setting.commissionRate || 0).toFixed(4) }}
        <span v-if="globalCommissionRate" class="rate-info">
          (全局：{{ (Number(globalCommissionRate.rate) * 100).toFixed(2) }}%，
          最终：{{ (getFinalCommissionRate(setting.commissionRate) * 100).toFixed(2) }}%)
        </span>
      </div>
    </div>

    <div class="history-section">
      <h3 class="sub-title">开启记录</h3>
      <div v-if="settingHistory.length === 0" class="empty-state small">暂无历史记录</div>
      <table v-else class="records-table">
        <thead>
          <tr>
            <th>序号</th>
            <th>可做单数</th>
            <th>用户个人佣金比例</th>
            <th>最终佣金比例</th>
            <th>创建时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, index) in settingHistory" :key="item.id">
            <td>{{ index + 1 }}</td>
            <td>{{ item.maxOrders }}</td>
            <td>{{ Number(item.commissionRate || 0).toFixed(4) }}</td>
            <td>
              {{ (getFinalCommissionRate(item.commissionRate) * 100).toFixed(2) }}%
              <span v-if="globalCommissionRate" class="rate-hint">
                (全局：{{ (Number(globalCommissionRate.rate) * 100).toFixed(2) }}%)
              </span>
            </td>
            <td>{{ formatDate(item.createdAt) }}</td>
            <td>
              <button class="action-btn edit" @click="openEditModal(item)">编辑</button>
              <button class="action-btn delete" @click="handleDelete(item)">删除</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="records-container">
      <div v-if="loading" class="loading-state">加载中...</div>
      <div v-else-if="error" class="error-state">{{ error }}</div>
      <div v-else-if="records.length === 0" class="empty-state">没有记录哦</div>
      <table v-else class="records-table">
        <thead>
          <tr>
            <th>序号</th>
            <th>订单类型</th>
            <th>金额</th>
            <th>状态</th>
            <th>描述</th>
            <th>创建时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(record, index) in records" :key="record.id">
            <td>{{ index + 1 }}</td>
            <td>{{ record.orderType }}</td>
            <td>{{ formatAmount(record.amount) }}</td>
            <td>
              <span :class="['status-badge', `status-${record.status}`]">
                {{ record.status === 'pending' ? '待处理' : record.status === 'completed' ? '已完成' : '已取消' }}
              </span>
            </td>
            <td>{{ record.description || '-' }}</td>
            <td>{{ formatDate(record.createdAt) }}</td>
            <td>
              <button class="action-btn edit">编辑</button>
              <button class="action-btn delete">删除</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 编辑弹窗 -->
    <div v-if="showEditModal" class="modal-mask" @click.self="closeEditModal">
      <div class="modal">
        <div class="modal-header">
          <h3>编辑设置</h3>
          <button class="modal-close" @click="closeEditModal">×</button>
        </div>
        <div class="modal-body">
          <div class="form-item">
            <label>可做单数</label>
            <input
              v-model.number="editForm.maxOrders"
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
              v-model.number="editForm.commissionRate"
              type="number"
              min="0"
              step="0.01"
              placeholder="用户个人佣金比例（在全局基础上叠加），如 0.05 表示 5%"
            />
            <p class="hint">1 = 100%，0.01 = 1%，谨慎设置</p>
            <div v-if="editForm.commissionRate !== null && editForm.commissionRate !== undefined" class="final-rate-info">
              <span class="info-label">最终佣金比例：</span>
              <span class="info-value highlight">
                {{ ((globalCommissionRate ? Number(globalCommissionRate.rate) : 0) + editForm.commissionRate) * 100 }}%
              </span>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="modal-btn cancel" @click="closeEditModal">取消</button>
          <button class="modal-btn primary" :disabled="submitting" @click="handleEdit">
            {{ submitting ? '保存中...' : '保存' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.order-settings-page {
  background: #fff;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  min-height: 500px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e9ecef;
}

.page-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #1b1d22;
}

.add-btn {
  padding: 8px 16px;
  background: #667eea;
  color: #fff;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.add-btn:hover {
  background: #5568d3;
}

.info-message {
  text-align: center;
  color: #6c757d;
  font-size: 14px;
  margin-bottom: 20px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 4px;
}

.records-container {
  min-height: 300px;
  background: #f8f9fa;
  border-radius: 6px;
  padding: 20px;
}

.setting-summary {
  display: flex;
  gap: 24px;
  padding: 12px 16px;
  margin-bottom: 16px;
  background: #eef2ff;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  color: #495057;
  font-size: 14px;
}

.history-section {
  margin-bottom: 16px;
}

.sub-title {
  margin: 0 0 10px 0;
  font-size: 16px;
  font-weight: 600;
  color: #1b1d22;
}

.empty-state.small {
  padding: 20px;
  font-size: 13px;
}

.loading-state,
.error-state,
.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #6c757d;
  font-size: 16px;
}

.error-state {
  color: #dc3545;
}

.records-table {
  width: 100%;
  border-collapse: collapse;
  background: #fff;
  border-radius: 4px;
  overflow: hidden;
}

.records-table th {
  background: #f8f9fa;
  padding: 12px;
  text-align: left;
  font-weight: 600;
  color: #495057;
  border-bottom: 2px solid #dee2e6;
  font-size: 13px;
}

.records-table td {
  padding: 12px;
  border-bottom: 1px solid #e9ecef;
  color: #212529;
  font-size: 13px;
}

.records-table tbody tr:hover {
  background: #f8f9fa;
}

.status-badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.status-pending {
  background: #fff3cd;
  color: #856404;
}

.status-completed {
  background: #d4edda;
  color: #155724;
}

.status-cancelled {
  background: #f8d7da;
  color: #721c24;
}

.action-btn {
  padding: 4px 12px;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  margin-right: 6px;
  transition: all 0.2s;
}

.action-btn.edit {
  background: #667eea;
  color: #fff;
}

.action-btn.delete {
  background: #dc3545;
  color: #fff;
}

.action-btn:hover {
  opacity: 0.85;
  transform: translateY(-1px);
}

.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.modal {
  background: #fff;
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e9ecef;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.modal-close {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 50%;
  background: #6c757d;
  color: #fff;
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-close:hover {
  background: #5a6268;
}

.modal-body {
  padding: 20px;
}

.form-item {
  margin-bottom: 16px;
}

.form-item label {
  display: block;
  margin-bottom: 8px;
  color: #495057;
  font-weight: 500;
  font-size: 14px;
}

.form-item input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  font-size: 14px;
  background: #fff;
  box-sizing: border-box;
}

.form-item input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.hint {
  margin: 6px 0 0;
  color: #6c757d;
  font-size: 12px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid #e9ecef;
}

.modal-btn {
  padding: 10px 18px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.modal-btn.primary {
  background: #17a2b8;
  color: #fff;
}

.modal-btn.primary:hover:not(:disabled) {
  background: #138496;
}

.modal-btn.cancel {
  background: #6c757d;
  color: #fff;
}

.modal-btn.cancel:hover {
  background: #5a6268;
}

.modal-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.rate-info {
  color: #6c757d;
  font-size: 12px;
  margin-left: 8px;
}

.rate-hint {
  color: #6c757d;
  font-size: 11px;
  margin-left: 4px;
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
</style>

