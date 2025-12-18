<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { getUserList, updateUserRemark, updateUserBalance, updateUserPassword, deleteUser, type User } from '../api/users';

const router = useRouter();
const authStore = useAuthStore();

const users = ref<User[]>([]);
const loading = ref(false);
const error = ref('');
const expandedRows = ref<Set<number>>(new Set()); // 存储展开的行ID

// 余额调整（行内）
const balanceRowId = ref<number | null>(null);
const balanceAmount = ref<number>(0);
const balanceSaving = ref(false);

// 编辑密码
const showEditModal = ref(false);
const editSaving = ref(false);
const editError = ref('');
const editForm = ref<{ userId: number | null; name: string; loginPassword: string; payPassword: string }>({
  userId: null,
  name: '',
  loginPassword: '',
  payPassword: '',
});

let refreshInterval: number | null = null;

// 筛选条件
const filters = ref({
  user: '',
  phone: '',
  inviteCode: '',
  ip: '',
  level: '全部级别',
  status: '所有状态',
  sort: '默认排序',
});

// 分页
const currentPage = ref(1);
const pageSize = ref(20);
const total = ref(0);

const totalPages = computed(() => Math.ceil(total.value / pageSize.value));

const loadUsers = async () => {
  loading.value = true;
  error.value = '';
  try {
    const data = await getUserList();
    console.log('[前端] 加载用户列表，用户数量:', data.length);
    // 调试：打印第一个用户的差额信息
    if (data.length > 0) {
      const firstUser = data[0];
      console.log('[前端] 第一个用户信息:', {
        id: firstUser.id,
        name: firstUser.name,
        difference: firstUser.difference,
        totalRecharged: firstUser.totalRecharged,
      });
    }
    users.value = data;
    total.value = data.length;
  } catch (e: any) {
    error.value = e?.message || '加载会员列表失败';
  } finally {
    loading.value = false;
  }
};

const resetFilters = () => {
  filters.value = {
    user: '',
    phone: '',
    inviteCode: '',
    ip: '',
    level: '全部级别',
    status: '所有状态',
    sort: '默认排序',
  };
};

const formatDate = (date: Date | string) => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${year}年${month}月${day}日 ${hours}:${minutes}:${seconds}`;
};

// 格式化上级用户名，移除 "SubUser_" 前缀
const formatParentName = (name: string | null | undefined, account: string | null | undefined) => {
  if (!name && !account) return '-';
  const displayName = name || account || '-';
  // 如果名称以 "SubUser_" 开头，则去掉前缀（兼容旧数据）
  if (displayName.startsWith('SubUser_')) {
    return displayName.replace(/^SubUser_/, '');
  }
  return displayName;
};

const paginatedUsers = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  const end = start + pageSize.value;
  return users.value.slice(start, end);
});

const toggleRow = (userId: number) => {
  if (expandedRows.value.has(userId)) {
    expandedRows.value.delete(userId);
  } else {
    expandedRows.value.add(userId);
  }
};

const closeRow = (userId: number) => {
  expandedRows.value.delete(userId);
};

// 保存备注
const saveRemark = async (userId: number, remark: string) => {
  try {
    await updateUserRemark(userId, remark.trim() || null);
    // 更新本地数据
    const user = users.value.find(u => u.id === userId);
    if (user) {
      user.remark = remark.trim() || null;
    }
  } catch (e: any) {
    console.error('保存备注失败:', e);
    // 可以添加错误提示
  }
};

// 处理备注输入框失焦事件
const handleRemarkBlur = (event: Event, userId: number) => {
  const input = event.target as HTMLInputElement;
  saveRemark(userId, input.value);
};

// 处理备注输入框回车事件
const handleRemarkKeydown = (event: KeyboardEvent, userId: number) => {
  if (event.key === 'Enter') {
    const input = event.target as HTMLInputElement;
    saveRemark(userId, input.value);
    input.blur(); // 失焦
  }
};

const openBalanceInline = (user: User) => {
  balanceRowId.value = user.id;
  balanceAmount.value = NaN;
};

const closeBalanceInline = () => {
  balanceRowId.value = null;
  balanceAmount.value = 0;
};

const submitBalanceInline = async () => {
  if (!balanceRowId.value) return;
  if (!balanceAmount.value || balanceAmount.value === 0) return;
  balanceSaving.value = true;
  try {
    await updateUserBalance(balanceRowId.value, balanceAmount.value);
    await loadUsers();
    closeBalanceInline();
  } catch (e) {
    console.error('余额更新失败', e);
  } finally {
    balanceSaving.value = false;
  }
};

const openEditModal = (user: User) => {
  const displayName = user.name === 'Test User' ? '八方来财' : (user.name || user.account || `UID:${user.id}`);
  editForm.value = {
    userId: user.id,
    name: displayName,
    loginPassword: '',
    payPassword: '',
  };
  editError.value = '';
  showEditModal.value = true;
};

const submitEdit = async () => {
  if (!editForm.value.userId) return;
  if (!editForm.value.loginPassword && !editForm.value.payPassword) {
    editError.value = '请输入登录密码或支付密码';
    return;
  }
  editSaving.value = true;
  editError.value = '';
  try {
    await updateUserPassword(editForm.value.userId, {
      loginPassword: editForm.value.loginPassword || undefined,
      payPassword: editForm.value.payPassword || undefined,
    });
    showEditModal.value = false;
  } catch (e: any) {
    editError.value = e?.message || '保存失败';
  } finally {
    editSaving.value = false;
  }
};

const handleRechargeStatusUpdated = () => {
  // 充值审核通过后，刷新用户列表以更新差额
  loadUsers();
};

// 删除用户
const handleDeleteUser = async (user: User) => {
  const displayName = user.name === 'Test User' ? '八方来财' : (user.name || user.account || `UID:${user.id}`);
  if (!window.confirm(`确定要删除用户 "${displayName}" 吗？此操作将删除该用户的所有数据，且无法恢复！`)) {
    return;
  }
  
  try {
    await deleteUser(user.id);
    window.alert('User deleted successfully');
    await loadUsers(); // 重新加载用户列表
  } catch (e: any) {
    window.alert(e?.message || 'Delete user failed');
    console.error('Delete user error:', e);
  }
};

onMounted(() => {
  authStore.initAuth(); // 初始化认证信息，确保能获取到子用户邀请码
  loadUsers();
  
  // 监听充值状态更新事件
  window.addEventListener('recharge-status-updated', handleRechargeStatusUpdated);
  
  // 可选：如果需要实时刷新，可以取消下面的注释
  // 每30秒自动刷新一次用户列表（实现实时交互）
  // refreshInterval = window.setInterval(() => {
  //   loadUsers();
  // }, 30000);
});

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
  // 移除事件监听器
  window.removeEventListener('recharge-status-updated', handleRechargeStatusUpdated);
});
</script>

<template>
  <div class="member-list-page">
    <div class="page-title-wrapper">
      <h2 class="page-title">会员列表</h2>
      <div v-if="authStore.user?.isSubUser && authStore.user?.myInviteCode" class="sub-user-invite-display">
        <span class="label">我的邀请码：</span>
        <span class="invite-code-value">{{ authStore.user.myInviteCode }}</span>
      </div>
    </div>

    <!-- 筛选区域 -->
    <div class="filter-section">
      <div class="filter-row">
        <select v-model="filters.level" class="filter-select">
          <option>全部级别</option>
          <option>VIP1</option>
          <option>VIP2</option>
          <option>VIP3</option>
        </select>
        <select v-model="filters.status" class="filter-select">
          <option>所有状态</option>
          <option>开启</option>
          <option>关闭</option>
        </select>
        <select v-model="filters.sort" class="filter-select">
          <option>默认排序</option>
          <option>注册时间</option>
          <option>最后登录</option>
        </select>
        <input v-model="filters.user" type="text" placeholder="用户" class="filter-input" />
        <input v-model="filters.phone" type="text" placeholder="手机号码" class="filter-input" />
        <input v-model="filters.inviteCode" type="text" placeholder="邀请码" class="filter-input" />
        <input v-model="filters.ip" type="text" placeholder="IP" class="filter-input" />
        <button class="search-btn">🔍</button>
        <button class="reset-btn" @click="resetFilters">重置</button>
        <button class="export-btn">导出列表</button>
      </div>
      <div class="filter-stats">
        <span>统计订单数: 0</span>
        <span>统计金币: 0</span>
      </div>
    </div>

    <!-- 数据表格 -->
    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>操作</th>
            <th>备注</th>
            <th>UID</th>
            <th>用户名</th>
            <th>手机号码</th>
            <th>余额</th>
            <th>总佣金</th>
            <th>差额</th>
            <th>上线</th>
            <th>邀请码</th>
            <th>状态</th>
            <th>上级</th>
            <th>累计订单数</th>
            <th>全部订单数</th>
            <th>完成订单数</th>
            <th>未完成订单数</th>
            <th>钱包地址</th>
            <th>注册时间</th>
            <th>最后登录时间</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="19" class="loading-cell">加载中...</td>
          </tr>
          <tr v-else-if="error">
            <td colspan="19" class="error-cell">{{ error }}</td>
          </tr>
          <tr v-else-if="paginatedUsers.length === 0">
            <td colspan="19" class="empty-cell">暂无数据</td>
          </tr>
          <tr v-else v-for="user in paginatedUsers" :key="user.id">
            <td class="action-cell">
              <div v-if="!expandedRows.has(user.id)" class="action-collapsed">
                <button class="action-btn-more" @click="toggleRow(user.id)">操作</button>
              </div>
              <div v-else class="action-expanded">
                <button class="action-close" @click="closeRow(user.id)">×</button>
                <div class="action-buttons">
                  <button class="action-btn inject" @click="router.push(`/injection-plan/${user.id}`)">打针</button>
                  <button class="action-btn order" @click="router.push(`/orders/${user.id}`)">做单</button>
                  <button class="action-btn balance" @click="openBalanceInline(user)">余额</button>
                  <button class="action-btn edit" @click="openEditModal(user)">编辑</button>
                  <button class="action-btn team" @click="router.push(`/team/${user.id}`)">查看团队</button>
                  <!-- 只有admin用户才能看到删除按钮，子用户不显示 -->
                  <button v-if="!authStore.user?.isSubUser" class="action-btn disable" @click="handleDeleteUser(user)">删除</button>
                </div>
                <div v-if="balanceRowId === user.id" class="balance-inline">
                  <input
                    type="number"
                    v-model.number="balanceAmount"
                    placeholder=""
                    step="0.01"
                  />
                  <button class="btn-save" :disabled="balanceSaving" @click="submitBalanceInline">
                    {{ balanceSaving ? '...' : '确定' }}
                  </button>
                  <button class="btn-cancel" :disabled="balanceSaving" @click="closeBalanceInline">取消</button>
                </div>
              </div>
            </td>
            <td class="remark-cell">
              <input 
                type="text" 
                class="remark-input" 
                :value="user.remark || ''"
                placeholder="备注" 
                @blur="handleRemarkBlur($event, user.id)"
                @keydown="handleRemarkKeydown($event, user.id)"
              />
            </td>
            <td>{{ user.id }}</td>
            <td>{{ user.name === 'Test User' ? '八方来财' : (user.name || '-') }}</td>
            <td>{{ user.account || '-' }}</td>
            <td>{{ user.balance ? Number(user.balance).toFixed(2) : '0.00' }}</td>
            <td>{{ user.orderStats?.totalCommission ? Number(user.orderStats.totalCommission).toFixed(2) : '0.00' }}</td>
            <td>{{ user.difference !== null && user.difference !== undefined ? Number(user.difference).toFixed(2) : '-' }}</td>
            <td>
              <span :class="['online-status', user.isOnline ? 'online' : 'offline']">
                {{ user.isOnline ? '在线' : '离线' }}
              </span>
            </td>
            <td>{{ user.myInviteCode || '-' }}</td>
            <td><button class="status-btn open">开启</button></td>
            <td>{{ user.parent ? (user.parent.name === 'Test User' ? '八方来财' : formatParentName(user.parent.name, user.parent.account)) : '-' }}</td>
            <td>{{ user.orderStats?.cumulative ?? 0 }}</td>
            <td>{{ user.orderStats?.total ?? 0 }}</td>
            <td>{{ user.orderStats?.completed ?? 0 }}</td>
            <td>{{ user.orderStats?.pending ?? 0 }}</td>
            <td>{{ user.walletAddress || '-' }}</td>
            <td>{{ formatDate(user.createdAt) }}</td>
            <td>{{ user.lastLoginAt ? formatDate(user.lastLoginAt) : '-' }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 分页 -->
    <div class="pagination">
      <div class="pagination-info">
        Total {{ total }} records, display {{ pageSize }} per page, total {{ totalPages }} page current display {{ currentPage }} page.
      </div>
      <div class="pagination-controls">
        <select v-model="pageSize" class="page-size-select">
          <option :value="20">20 per page</option>
          <option :value="50">50 per page</option>
          <option :value="100">100 per page</option>
        </select>
        <button class="page-btn" @click="currentPage = 1" :disabled="currentPage === 1"><<</button>
        <button class="page-btn" @click="currentPage--" :disabled="currentPage === 1"><</button>
        <button
          v-for="page in Math.min(8, totalPages)"
          :key="page"
          class="page-btn"
          :class="{ active: currentPage === page }"
          @click="currentPage = page"
        >
          {{ page }}
        </button>
        <button v-if="totalPages > 8" class="page-btn">...</button>
        <button
          v-if="totalPages > 8"
          class="page-btn"
          :class="{ active: currentPage === totalPages }"
          @click="currentPage = totalPages"
        >
          {{ totalPages }}
        </button>
        <button class="page-btn" @click="currentPage++" :disabled="currentPage === totalPages">></button>
        <button class="page-btn" @click="currentPage = totalPages" :disabled="currentPage === totalPages">>></button>
      </div>
    </div>
  </div>

  <!-- 编辑密码弹窗 -->
  <div v-if="showEditModal" class="modal-overlay" @click="showEditModal = false">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>编辑用户</h3>
        <button class="modal-close" @click="showEditModal = false">×</button>
      </div>
      <div class="modal-body">
        <div class="field">
          <label>用户</label>
          <input type="text" :value="editForm.name" disabled />
        </div>
        <div class="field">
          <label>登录密码</label>
          <input type="password" v-model="editForm.loginPassword" placeholder="不填则不修改" />
        </div>
        <div class="field">
          <label>支付密码</label>
          <input type="password" v-model="editForm.payPassword" placeholder="不填则不修改" />
        </div>
        <div v-if="editError" class="alert error">{{ editError }}</div>
      </div>
      <div class="modal-footer">
        <button class="btn-cancel" @click="showEditModal = false" :disabled="editSaving">取消</button>
        <button class="btn-save" @click="submitEdit" :disabled="editSaving">
          {{ editSaving ? '保存中...' : '保存' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.member-list-page {
  background: #fff;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.page-title-wrapper {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 24px;
}

.page-title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #1b1d22;
}

.sub-user-invite-display {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #eff6ff;
  border: 1px solid #2563eb;
  border-radius: 6px;
}

.sub-user-invite-display .label {
  font-size: 14px;
  color: #374151;
  font-weight: 500;
}

.sub-user-invite-display .invite-code-value {
  font-family: 'Courier New', monospace;
  font-size: 16px;
  font-weight: 700;
  color: #2563eb;
  letter-spacing: 1px;
}

.filter-section {
  margin-bottom: 20px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 6px;
}

.filter-row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.filter-select,
.filter-input {
  padding: 8px 12px;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  font-size: 14px;
  background: #fff;
}

.filter-input {
  min-width: 120px;
}

.search-btn,
.reset-btn,
.export-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  font-weight: 500;
}

.search-btn {
  background: #667eea;
  color: #fff;
}

.reset-btn {
  background: #6c757d;
  color: #fff;
}

.export-btn {
  background: #ff6b35;
  color: #fff;
}

.filter-stats {
  display: flex;
  gap: 24px;
  font-size: 14px;
  color: #495057;
}

.table-container {
  overflow-x: auto;
  margin-bottom: 20px;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  background: #fff;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  min-width: 100%;
  border: 1px solid #dee2e6;
}

.data-table th {
  background: linear-gradient(to bottom, #f8f9fa, #e9ecef);
  padding: 14px 10px;
  text-align: left;
  font-weight: 600;
  color: #495057;
  border: 1px solid #dee2e6;
  border-bottom: 2px solid #adb5bd;
  white-space: nowrap;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.data-table th:first-child {
  padding-left: 16px;
  border-left: none;
}

.data-table th:last-child {
  padding-right: 16px;
  border-right: none;
}

.data-table td {
  padding: 14px 10px;
  border: 1px solid #dee2e6;
  color: #212529;
  vertical-align: middle;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  background: #fff;
  max-width: 150px;
}

.data-table td:first-child {
  padding-left: 16px;
  border-left: none;
}

.data-table td:last-child {
  padding-right: 16px;
  border-right: none;
}

.data-table td.action-cell {
  overflow: visible;
  max-width: none;
  position: relative;
  z-index: 1;
}

.data-table tbody tr {
  transition: background-color 0.2s ease;
}

.data-table tbody tr:hover {
  background: #f8f9fa;
}

.data-table tbody tr:hover td {
  background: #f8f9fa;
}

.data-table tbody tr:last-child td {
  border-bottom: 1px solid #dee2e6;
}

.view-btn {
  padding: 4px 12px;
  background: #667eea;
  color: #fff;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
}

.status-btn {
  padding: 4px 12px;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
}

.status-btn.open {
  background: #ff6b35;
  color: #fff;
}

.status-btn.close {
  background: #667eea;
  color: #fff;
}

.remark-cell {
  overflow: visible !important;
  max-width: none !important;
  white-space: normal !important;
}

.remark-input {
  width: 200px;
  padding: 4px 8px;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  font-size: 12px;
  display: block;
  white-space: normal;
  word-wrap: break-word;
}


.loading-cell,
.error-cell,
.empty-cell {
  text-align: center;
  padding: 40px;
  color: #6c757d;
}

.error-cell {
  color: #dc3545;
}

.pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
  border-top: 1px solid #e9ecef;
}

.pagination-info {
  font-size: 14px;
  color: #6c757d;
}

.pagination-controls {
  display: flex;
  gap: 4px;
  align-items: center;
}

.page-size-select {
  padding: 6px 12px;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  font-size: 14px;
  margin-right: 8px;
}

.page-btn {
  min-width: 32px;
  height: 32px;
  padding: 0 8px;
  border: 1px solid #dee2e6;
  background: #fff;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.page-btn:hover:not(:disabled) {
  background: #f8f9fa;
  border-color: #667eea;
}

.page-btn.active {
  background: #667eea;
  color: #fff;
  border-color: #667eea;
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-cell {
  position: relative;
  padding: 4px;
  white-space: nowrap;
}

.action-collapsed {
  display: flex;
  justify-content: center;
  align-items: center;
}

.action-btn-more {
  padding: 6px 16px;
  background: #667eea;
  color: #fff;
  border: none;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.action-btn-more:hover {
  background: #5568d3;
}

.action-expanded {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #fff;
  padding: 6px 8px;
  border-radius: 4px;
  border: 1px solid #dee2e6;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  white-space: nowrap;
  z-index: 1000;
  flex-direction: row;
}

.action-buttons {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  flex-wrap: nowrap;
}

.action-btn {
  padding: 5px 10px;
  border: none;
  border-radius: 3px;
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
  min-width: auto;
  flex-shrink: 0;
}

.action-btn.inject {
  background: #ff6b35;
  color: #fff;
}

.action-btn.order {
  background: #667eea;
  color: #fff;
}

.action-btn.level {
  background: #ff6b35;
  color: #fff;
}

.action-btn.balance {
  background: #dc3545;
  color: #fff;
}

.action-btn.edit {
  background: #28a745;
  color: #fff;
}

.action-btn.team {
  background: #ff6b35;
  color: #fff;
}

.action-btn.ledger {
  background: #667eea;
  color: #fff;
}

.action-btn.disable {
  background: #dc3545;
  color: #fff;
}

.action-btn:hover {
  opacity: 0.85;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
}

.balance-inline {
  margin-top: 6px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.balance-inline input {
  width: 140px;
  padding: 4px 6px;
  border: 1px solid #ced4da;
  border-radius: 4px;
}

.action-close {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #6c757d;
  color: #fff;
  border: none;
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s;
  margin-right: 4px;
}

.action-close:hover {
  background: #5a6268;
  transform: scale(1.1);
}

.online-status {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.online-status.online {
  background: #28a745;
  color: #fff;
}

.online-status.offline {
  background: #6c757d;
  color: #fff;
}
</style>

