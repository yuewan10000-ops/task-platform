<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { getSubUserList, createSubUser, updateSubUser, deleteSubUser, generateInviteCodes, type SubUser, type CreateSubUserParams, type UpdateSubUserParams } from '../api/subUsers';

const loading = ref(false);
const subUsers = ref<SubUser[]>([]);
const error = ref('');

// 创建/编辑模态框
const showModal = ref(false);
const modalMode = ref<'create' | 'edit'>('create');
const currentSubUser = ref<SubUser | null>(null);
const form = ref<CreateSubUserParams>({
  account: '',
  loginPassword: '',
  payPassword: '',
});
const saving = ref(false);

const loadSubUsers = async () => {
  loading.value = true;
  error.value = '';
  try {
    subUsers.value = await getSubUserList();
  } catch (e: any) {
    error.value = e?.message || '加载子用户列表失败';
  } finally {
    loading.value = false;
  }
};

const openCreateModal = () => {
  modalMode.value = 'create';
  currentSubUser.value = null;
  form.value = {
    account: '',
    loginPassword: '',
    payPassword: '',
  };
  showModal.value = true;
};

const openEditModal = (subUser: SubUser) => {
  modalMode.value = 'edit';
  currentSubUser.value = subUser;
  form.value = {
    account: subUser.account,
    loginPassword: '',
    payPassword: '',
  };
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
  form.value = {
    account: '',
    loginPassword: '',
    payPassword: '',
  };
  currentSubUser.value = null;
};

const handleSubmit = async () => {
  if (!form.value.account || !form.value.loginPassword || !form.value.payPassword) {
    window.alert('请完整填写所有字段');
    return;
  }

  if (form.value.account.length < 4) {
    window.alert('账号至少4位');
    return;
  }

  if (form.value.loginPassword.length < 6 || form.value.payPassword.length < 6) {
    window.alert('密码至少6位');
    return;
  }

  saving.value = true;
  try {
    if (modalMode.value === 'create') {
      await createSubUser(form.value);
      window.alert('创建成功');
    } else {
      if (!currentSubUser.value) return;
      const updateParams: UpdateSubUserParams = {};
      if (form.value.account !== currentSubUser.value.account) {
        updateParams.account = form.value.account;
      }
      if (form.value.loginPassword) {
        updateParams.loginPassword = form.value.loginPassword;
      }
      if (form.value.payPassword) {
        updateParams.payPassword = form.value.payPassword;
      }
      await updateSubUser(currentSubUser.value.id, updateParams);
      window.alert('更新成功');
    }
    closeModal();
    await loadSubUsers();
  } catch (e: any) {
    window.alert(e?.message || '操作失败');
  } finally {
    saving.value = false;
  }
};

const handleDelete = async (subUser: SubUser) => {
  if (!window.confirm(`确定要删除子用户 "${subUser.account}" 吗？`)) {
    return;
  }

  try {
    await deleteSubUser(subUser.id);
    window.alert('删除成功');
    await loadSubUsers();
  } catch (e: any) {
    window.alert(e?.message || '删除失败');
  }
};

const formatDate = (date: string | null) => {
  if (!date) return '-';
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
};

const handleGenerateInviteCodes = async () => {
  if (!window.confirm('确定要为所有没有邀请码的子用户生成邀请码吗？')) {
    return;
  }

  try {
    const result = await generateInviteCodes();
    window.alert(result.message || '邀请码生成完成');
    await loadSubUsers(); // 重新加载列表
  } catch (e: any) {
    window.alert(e?.message || '生成邀请码失败');
  }
};

onMounted(() => {
  loadSubUsers();
});
</script>

<template>
  <div class="sub-user-manage-page">
    <div class="page-header">
      <h2>子用户管理</h2>
      <div class="header-actions">
        <button class="btn-generate" @click="handleGenerateInviteCodes">为现有子用户生成邀请码</button>
        <button class="btn-create" @click="openCreateModal">创建子用户</button>
      </div>
    </div>

    <div v-if="error" class="error-message">{{ error }}</div>

    <div v-if="loading" class="loading">加载中...</div>

    <div v-else class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>账号</th>
            <th>邀请码</th>
            <th>所属Admin</th>
            <th>在线状态</th>
            <th>最后登录时间</th>
            <th>创建时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="subUsers.length === 0">
            <td colspan="8" class="empty-cell">暂无子用户</td>
          </tr>
          <tr v-else v-for="subUser in subUsers" :key="subUser.id">
            <td>{{ subUser.id }}</td>
            <td>{{ subUser.account }}</td>
            <td>
              <span v-if="subUser.myInviteCode" class="invite-code">{{ subUser.myInviteCode }}</span>
              <span v-else class="no-code">-</span>
            </td>
            <td>{{ subUser.parentAdmin?.account || '-' }}</td>
            <td>
              <span :class="['status-badge', subUser.isOnline ? 'online' : 'offline']">
                {{ subUser.isOnline ? '在线' : '离线' }}
              </span>
            </td>
            <td>{{ formatDate(subUser.lastLoginAt) }}</td>
            <td>{{ formatDate(subUser.createdAt) }}</td>
            <td class="action-cell">
              <button class="btn-edit" @click="openEditModal(subUser)">编辑</button>
              <button class="btn-delete" @click="handleDelete(subUser)">删除</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 创建/编辑模态框 -->
    <div v-if="showModal" class="modal-overlay" @click="closeModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>{{ modalMode === 'create' ? '创建子用户' : '编辑子用户' }}</h3>
          <button class="modal-close" @click="closeModal">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>账号：</label>
            <input v-model="form.account" type="text" placeholder="至少4位" />
          </div>
          <div class="form-group">
            <label>{{ modalMode === 'create' ? '登录密码：' : '新登录密码（留空不修改）：' }}</label>
            <input v-model="form.loginPassword" type="password" placeholder="至少6位" />
          </div>
          <div class="form-group">
            <label>{{ modalMode === 'create' ? '支付密码：' : '新支付密码（留空不修改）：' }}</label>
            <input v-model="form.payPassword" type="password" placeholder="至少6位" />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" @click="closeModal">取消</button>
          <button class="btn-submit" :disabled="saving" @click="handleSubmit">
            {{ saving ? '保存中...' : '保存' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sub-user-manage-page {
  padding: 24px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.page-header h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
}

.btn-create {
  padding: 10px 20px;
  background: #2563eb;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-create:hover {
  background: #1d4ed8;
}

.btn-generate {
  padding: 10px 20px;
  background: #10b981;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-generate:hover {
  background: #059669;
}

.error-message {
  padding: 12px;
  background: #fee2e2;
  color: #dc2626;
  border-radius: 6px;
  margin-bottom: 16px;
}

.loading {
  text-align: center;
  padding: 40px;
  color: #6b7280;
}

.table-container {
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table thead {
  background: #f9fafb;
}

.data-table th {
  padding: 12px 16px;
  text-align: left;
  font-weight: 600;
  font-size: 14px;
  color: #374151;
  border-bottom: 1px solid #e5e7eb;
}

.data-table td {
  padding: 12px 16px;
  font-size: 14px;
  color: #111827;
  border-bottom: 1px solid #f3f4f6;
}

.data-table tbody tr:hover {
  background: #f9fafb;
}

.empty-cell {
  text-align: center;
  color: #9ca3af;
  padding: 40px !important;
}

.status-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.status-badge.online {
  background: #d1fae5;
  color: #065f46;
}

.status-badge.offline {
  background: #f3f4f6;
  color: #6b7280;
}

.action-cell {
  display: flex;
  gap: 8px;
}

.btn-edit,
.btn-delete {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  transition: opacity 0.2s;
}

.btn-edit {
  background: #3b82f6;
  color: #fff;
}

.btn-edit:hover {
  opacity: 0.9;
}

.btn-delete {
  background: #ef4444;
  color: #fff;
}

.btn-delete:hover {
  opacity: 0.9;
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
  border-radius: 8px;
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
  font-size: 18px;
  font-weight: 600;
}

.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  color: #6b7280;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: background 0.2s;
}

.modal-close:hover {
  background: #f3f4f6;
}

.modal-body {
  padding: 24px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #374151;
}

.form-group input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.form-group input:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid #e5e7eb;
}

.btn-cancel,
.btn-submit {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
}

.btn-cancel {
  background: #f3f4f6;
  color: #374151;
}

.btn-cancel:hover {
  opacity: 0.9;
}

.btn-submit {
  background: #2563eb;
  color: #fff;
}

.btn-submit:hover:not(:disabled) {
  opacity: 0.9;
}

.btn-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.invite-code {
  font-family: 'Courier New', monospace;
  font-weight: 600;
  color: #2563eb;
  background: #eff6ff;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 13px;
  display: inline-block;
}

.no-code {
  color: #9ca3af;
}
</style>

