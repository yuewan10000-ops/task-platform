<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  getInjectionPlans,
  createInjectionPlan,
  updateInjectionPlan,
  deleteInjectionPlan,
  type InjectionPlan,
} from '../api/injectionPlans';
import { getUserById } from '../api/users';

const route = useRoute();
const router = useRouter();

const userId = ref<number>(0);
const userInfo = ref<any>(null);
const plans = ref<InjectionPlan[]>([]);
const loading = ref(false);
const saving = ref(false);
const error = ref('');
const message = ref('');

const showModal = ref(false);
const editingPlan = ref<InjectionPlan | null>(null);
const form = ref({
  orderSettingId: '',
  commissionRate: 0, // 订单佣金
  injectionAmount: 0, // 打针全额
  isActive: true,
});

const load = async () => {
  if (!userId.value) return;
  
  loading.value = true;
  error.value = '';
  message.value = '';
  try {
    const list = await getInjectionPlans(userId.value);
    // 按ID从小到大排序（1在上，2在下，以此类推）
    plans.value = list.slice().sort((a, b) => a.id - b.id);
  } catch (err: any) {
    error.value = err?.message || '加载失败';
  } finally {
    loading.value = false;
  }
};

const loadUserInfo = async () => {
  if (!userId.value) return;
  
  try {
    userInfo.value = { user: await getUserById(userId.value) };
  } catch (err: any) {
    console.error('加载用户信息失败:', err);
  }
};

const openAddModal = () => {
  editingPlan.value = null;
  form.value = {
    orderSettingId: '',
    commissionRate: 0,
    injectionAmount: 0,
    isActive: true,
  };
  showModal.value = true;
};

const openEditModal = (plan: InjectionPlan) => {
  editingPlan.value = plan;
  form.value = {
    orderSettingId: plan.orderSettingId?.toString() || '',
    commissionRate: Number(plan.commissionRate),
    injectionAmount: Number(plan.injectionAmount),
    isActive: plan.isActive,
  };
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
  editingPlan.value = null;
};

const save = async () => {
  if (!userId.value) return;

  saving.value = true;
  error.value = '';
  message.value = '';
  try {
    const payload = {
      userId: userId.value,
      orderSettingId: form.value.orderSettingId ? parseInt(form.value.orderSettingId) : undefined,
      commissionRate: form.value.commissionRate,
      injectionAmount: form.value.injectionAmount,
      isActive: form.value.isActive,
    };
    
    if (editingPlan.value) {
      await updateInjectionPlan(editingPlan.value.id, payload);
      message.value = '更新成功';
    } else {
      await createInjectionPlan(payload);
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
  if (!confirm('确定要删除这个打针计划吗？')) return;
  try {
    await deleteInjectionPlan(id);
    message.value = '删除成功';
    await load();
  } catch (err: any) {
    error.value = err?.message || '删除失败';
  }
};

onMounted(async () => {
  const userIdParam = route.params.userId;
  if (typeof userIdParam === 'string') {
    userId.value = parseInt(userIdParam);
    await loadUserInfo();
    await load();
  } else {
    error.value = '无效的用户ID';
  }
});
</script>

<template>
  <div class="injection-plan-page">
    <header class="page-header">
      <div class="breadcrumb">
        <span @click="router.push('/members')" class="breadcrumb-link">>></span>
        <span>UID:{{ userId }} 打针计划</span>
      </div>
      <button class="add-btn" @click="openAddModal">添加打针</button>
    </header>

    <div v-if="message" class="status success">{{ message }}</div>
    <div v-if="error" class="status error">{{ error }}</div>

    <div class="description-box">
      <p class="description-text">
        打针:就是在用户固定某个订单,增加全额。计算方式:订单佣金+打针全额=订单全额
      </p>
    </div>

    <div class="content-box">
      <div v-if="loading" class="empty-state">加载中...</div>
      <div v-else-if="plans.length === 0" class="empty-state">没有记录哦</div>
      <table v-else class="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>订单设置ID</th>
            <th>订单佣金</th>
            <th>打针全额</th>
            <th>状态</th>
            <th>创建时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="plan in plans" :key="plan.id">
            <td>{{ plan.id }}</td>
            <td>{{ plan.orderSettingId || '-' }}</td>
            <td>{{ Number(plan.commissionRate).toFixed(2) }}</td>
            <td>{{ Number(plan.injectionAmount).toFixed(2) }}</td>
            <td>
              <span
                v-if="plan.status === 'completed'"
                class="status-badge completed"
              >完成</span>
              <span
                v-else-if="plan.status === 'pending'"
                class="status-badge pending"
              >未完成</span>
              <span v-else class="status-badge inactive">-</span>
            </td>
            <td>{{ new Date(plan.createdAt).toLocaleString('zh-CN') }}</td>
            <td>
              <button class="btn-edit" @click="openEditModal(plan)">编辑</button>
              <button class="btn-delete" @click="handleDelete(plan.id)">删除</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 添加/编辑弹窗 -->
    <div v-if="showModal" class="modal-overlay" @click="closeModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>{{ editingPlan ? '编辑打针计划' : '添加打针计划' }}</h3>
          <button class="modal-close" @click="closeModal">×</button>
        </div>
        <div class="modal-body">
          <div class="field">
            <label>订单设置ID（可选）</label>
            <input 
              v-model="form.orderSettingId" 
              type="number" 
              placeholder="留空表示应用到所有订单" 
            />
            <small style="color: #6b7280; font-size: 12px; display: block; margin-top: 4px;">
              固定某个订单时填写，留空则应用到所有订单
            </small>
          </div>
          <div class="field">
            <label>打针全额 *</label>
            <input 
              v-model.number="form.injectionAmount" 
              type="number" 
              step="0.01"
              placeholder="例如：100.00" 
              required 
            />
            <small style="color: #6b7280; font-size: 12px; display: block; margin-top: 4px;">
              固定增加的金额
            </small>
          </div>
          <div class="field">
            <label>订单佣金 *</label>
            <input 
              v-model.number="form.commissionRate" 
              type="number" 
              step="0.01"
              placeholder="例如：100.00" 
              required 
            />
            <small style="color: #6b7280; font-size: 12px; display: block; margin-top: 4px;">
              订单的佣金金额
            </small>
          </div>
          <div class="field">
            <label>
              <input v-model="form.isActive" type="checkbox" />
              启用
            </label>
          </div>
          <div class="field" v-if="userInfo">
            <div class="calculation-preview">
              <h4>计算预览：</h4>
              <p>订单佣金: {{ form.commissionRate.toFixed(2) }}</p>
              <p>打针全额: {{ form.injectionAmount.toFixed(2) }}</p>
              <p class="result">
                订单全额 = {{ 
                  (form.commissionRate + form.injectionAmount).toFixed(2) 
                }}
              </p>
            </div>
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
.injection-plan-page {
  background: #fff;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.breadcrumb {
  font-size: 14px;
  color: #495057;
}

.breadcrumb-link {
  color: #667eea;
  cursor: pointer;
  margin-right: 8px;
}

.breadcrumb-link:hover {
  text-decoration: underline;
}

.add-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.1s;
}

.add-btn:hover {
  transform: translateY(-1px);
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

.description-box {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
}

.description-text {
  margin: 0;
  color: #495057;
  font-size: 14px;
  line-height: 1.6;
}

.content-box {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  min-height: 200px;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #6b7280;
  font-size: 14px;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.data-table th {
  background: #f8f9fa;
  padding: 12px;
  text-align: left;
  font-weight: 600;
  color: #495057;
  border-bottom: 2px solid #dee2e6;
}

.data-table td {
  padding: 12px;
  border-bottom: 1px solid #e9ecef;
  color: #212529;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.status-badge.completed {
  background: #d1fae5;
  color: #065f46;
}

.status-badge.pending {
  background: #fff7e6;
  color: #b45309;
}

.status-badge.inactive {
  background: #f1f5f9;
  color: #475569;
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
  max-width: 600px;
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
.field textarea {
  width: 100%;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 14px;
  box-sizing: border-box;
  font-family: inherit;
}

.field textarea {
  resize: vertical;
  min-height: 80px;
}

.field input[type="checkbox"] {
  margin-right: 8px;
}

.calculation-preview {
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 8px;
  padding: 16px;
}

.calculation-preview h4 {
  margin: 0 0 12px 0;
  color: #0369a1;
  font-size: 14px;
  font-weight: 600;
}

.calculation-preview p {
  margin: 6px 0;
  color: #0c4a6e;
  font-size: 13px;
}

.calculation-preview .result {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #bae6fd;
  font-weight: 700;
  font-size: 15px;
  color: #0369a1;
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

