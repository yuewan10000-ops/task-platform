<script setup lang="ts">
import { onMounted, ref } from 'vue';
import {
  getCommissionRates,
  createCommissionRate,
  updateCommissionRate,
  deleteCommissionRate,
  type CommissionRate,
} from '../api/commissionRate';

const rates = ref<CommissionRate[]>([]);
const loading = ref(false);
const saving = ref(false);
const error = ref('');
const message = ref('');

const showModal = ref(false);
const editingRate = ref<CommissionRate | null>(null);
const form = ref({
  rate: 0.1, // 小数形式（0.1 = 10%）
  ratePercent: 10, // 百分比形式（用于滑块显示）
  isActive: true,
  description: '',
});

const load = async () => {
  loading.value = true;
  error.value = '';
  message.value = '';
  try {
    rates.value = await getCommissionRates();
  } catch (err: any) {
    error.value = err?.message || '加载失败';
  } finally {
    loading.value = false;
  }
};

const openAddModal = () => {
  editingRate.value = null;
  form.value = {
    rate: 0.1,
    ratePercent: 10,
    isActive: true,
    description: '',
  };
  showModal.value = true;
};

const openEditModal = (rate: CommissionRate) => {
  editingRate.value = rate;
  const rateValue = Number(rate.rate);
  form.value = {
    rate: rateValue,
    ratePercent: rateValue * 100, // 转换为百分比用于滑块
    isActive: rate.isActive,
    description: rate.description || '',
  };
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
  editingRate.value = null;
};

// 当滑块值改变时，同步更新小数形式
const updateRate = (percent: number) => {
  form.value.ratePercent = percent;
  form.value.rate = percent / 100; // 转换为小数
};

const save = async () => {
  saving.value = true;
  error.value = '';
  message.value = '';
  try {
    // 确保使用小数形式保存
    const payload = {
      rate: form.value.rate,
      isActive: form.value.isActive,
      description: form.value.description,
    };
    if (editingRate.value) {
      await updateCommissionRate(editingRate.value.id, payload);
      message.value = '更新成功';
    } else {
      await createCommissionRate(payload);
      message.value = '创建成功';
    }
    closeModal();
    await load();
  } catch (err: any) {
    error.value = err?.message || '保存失败';
  } finally {
    saving.value = false;
  }
};

const handleDelete = async (id: number) => {
  if (!confirm('确定要删除这条记录吗？')) return;
  try {
    await deleteCommissionRate(id);
    message.value = '删除成功';
    await load();
  } catch (err: any) {
    error.value = err?.message || '删除失败';
  }
};

onMounted(load);
</script>

<template>
  <div class="commission-rate-manage">
    <header class="page-header">
      <div>
        <h2>佣金比例管理</h2>
        <p class="subtitle">管理 A 端订单使用的佣金比例。</p>
      </div>
      <div class="header-actions">
        <button class="refresh" :disabled="loading" @click="load">
          {{ loading ? '刷新中' : '刷新' }}
        </button>
        <button class="primary" @click="openAddModal">添加佣金比例</button>
      </div>
    </header>

    <div v-if="message" class="status success">{{ message }}</div>
    <div v-if="error" class="status error">{{ error }}</div>

    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>佣金比例</th>
            <th>状态</th>
            <th>描述</th>
            <th>更新时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="6" class="loading-cell">加载中...</td>
          </tr>
          <tr v-else-if="rates.length === 0">
            <td colspan="6" class="empty-cell">暂无数据</td>
          </tr>
          <tr v-else v-for="rate in rates" :key="rate.id">
            <td>{{ rate.id }}</td>
            <td>{{ (Number(rate.rate) * 100).toFixed(2) }}%</td>
            <td>
              <span :class="['status-badge', rate.isActive ? 'active' : 'inactive']">
                {{ rate.isActive ? '启用' : '禁用' }}
              </span>
            </td>
            <td>{{ rate.description || '-' }}</td>
            <td>{{ new Date(rate.updatedAt).toLocaleString('zh-CN') }}</td>
            <td>
              <button class="btn-edit" @click="openEditModal(rate)">编辑</button>
              <button class="btn-delete" @click="handleDelete(rate.id)">删除</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 添加/编辑弹窗 -->
    <div v-if="showModal" class="modal-overlay" @click="closeModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>{{ editingRate ? '编辑佣金比例' : '添加佣金比例' }}</h3>
          <button class="modal-close" @click="closeModal">×</button>
        </div>
        <div class="modal-body">
          <div class="field">
            <label>佣金比例：{{ form.ratePercent.toFixed(1) }}%</label>
            <div class="slider-container">
              <input
                v-model.number="form.ratePercent"
                @input="updateRate(form.ratePercent)"
                type="range"
                min="0"
                max="100"
                step="0.1"
                class="slider"
              />
              <div class="slider-labels">
                <span>0%</span>
                <span>100%</span>
              </div>
            </div>
          </div>
          <div class="field">
            <label>
              <input
                v-model="form.isActive"
                type="checkbox"
              />
              启用（启用后会自动禁用其他记录）
            </label>
          </div>
          <div class="field">
            <label>描述</label>
            <input
              v-model="form.description"
              type="text"
              placeholder="可选描述"
            />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" @click="closeModal">取消</button>
          <button class="btn-save" :disabled="saving" @click="save">
            {{ saving ? '保存中...' : '保存' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.commission-rate-manage {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
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

.header-actions {
  display: flex;
  gap: 12px;
}

.refresh,
.primary {
  border: 1px solid #d1d5db;
  background: #fff;
  border-radius: 10px;
  padding: 8px 14px;
  cursor: pointer;
  font-size: 14px;
}

.primary {
  border: none;
  background: linear-gradient(135deg, #2563eb, #4f46e5);
  color: #fff;
  font-weight: 600;
}

.status {
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 16px;
  font-size: 14px;
}

.status.success {
  background: #d1fae5;
  color: #065f46;
}

.status.error {
  background: #fee2e2;
  color: #991b1b;
}

.table-wrapper {
  background: #fff;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 16px 32px rgba(15, 23, 42, 0.08);
}

table {
  width: 100%;
  border-collapse: collapse;
}

thead {
  background: #f9fafb;
}

th {
  padding: 16px;
  text-align: left;
  font-weight: 600;
  color: #374151;
  font-size: 14px;
  border-bottom: 1px solid #e5e7eb;
}

td {
  padding: 16px;
  border-bottom: 1px solid #e5e7eb;
  font-size: 14px;
  color: #1f2937;
}

.loading-cell,
.empty-cell {
  text-align: center;
  color: #6b7280;
  padding: 40px;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.status-badge.active {
  background: #d1fae5;
  color: #065f46;
}

.status-badge.inactive {
  background: #fee2e2;
  color: #991b1b;
}

.btn-edit,
.btn-delete {
  border: none;
  background: none;
  color: #2563eb;
  cursor: pointer;
  padding: 4px 8px;
  margin-right: 8px;
  font-size: 14px;
}

.btn-delete {
  color: #ef4444;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: #fff;
  border-radius: 16px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #1f2937;
}

.modal-close {
  border: none;
  background: none;
  font-size: 24px;
  cursor: pointer;
  color: #6b7280;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-body {
  padding: 24px;
}

.field {
  margin-bottom: 20px;
}

.field label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #374151;
  font-size: 14px;
}

.field input[type="number"],
.field input[type="text"] {
  width: 100%;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 14px;
  box-sizing: border-box;
}

.field input[type="checkbox"] {
  margin-right: 8px;
}

.slider-container {
  margin-top: 12px;
}

.slider {
  width: 100%;
  height: 8px;
  border-radius: 4px;
  background: #e5e7eb;
  outline: none;
  -webkit-appearance: none;
  appearance: none;
  cursor: pointer;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: linear-gradient(135deg, #2563eb, #4f46e5);
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  transition: all 0.2s;
}

.slider::-webkit-slider-thumb:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}

.slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: linear-gradient(135deg, #2563eb, #4f46e5);
  cursor: pointer;
  border: none;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  transition: all 0.2s;
}

.slider::-moz-range-thumb:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}

.slider-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  font-size: 12px;
  color: #6b7280;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid #e5e7eb;
}

.btn-cancel,
.btn-save {
  border: none;
  border-radius: 8px;
  padding: 10px 20px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
}

.btn-cancel {
  background: #f3f4f6;
  color: #374151;
}

.btn-save {
  background: linear-gradient(135deg, #2563eb, #4f46e5);
  color: #fff;
}

.btn-save:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>

