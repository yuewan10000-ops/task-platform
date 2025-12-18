<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getUserTeam, type UserTeam } from '../api/users';

const route = useRoute();
const router = useRouter();

const loading = ref(false);
const error = ref('');
const team = ref<UserTeam | null>(null);

const loadTeam = async () => {
  const id = Number(route.params.userId);
  if (!id) {
    error.value = '无效的用户ID';
    return;
  }
  loading.value = true;
  error.value = '';
  try {
    team.value = await getUserTeam(id);
  } catch (e: any) {
    error.value = e?.message || '加载团队信息失败';
  } finally {
    loading.value = false;
  }
};

const goBack = () => {
  router.back();
};

// 格式化用户名，移除 "SubUser_" 前缀
const formatUserName = (name: string | null | undefined) => {
  if (!name) return '-';
  // 如果名称以 "SubUser_" 开头，则去掉前缀（兼容旧数据）
  if (name.startsWith('SubUser_')) {
    return name.replace(/^SubUser_/, '');
  }
  return name;
};

onMounted(loadTeam);
</script>

<template>
  <div class="team-page">
    <div class="page-header">
      <h2>团队关系</h2>
      <button class="btn-back" @click="goBack">返回</button>
    </div>

    <div v-if="loading" class="status-text">加载中...</div>
    <div v-else-if="error" class="status-text error">{{ error }}</div>
    <div v-else-if="!team" class="status-text">暂无数据</div>
    <div v-else class="team-content">
      <section class="card current-user">
        <h3>当前用户</h3>
        <p><strong>UID：</strong>{{ team.user.id }}</p>
        <p><strong>账号：</strong>{{ team.user.account || '-' }}</p>
        <p><strong>用户名：</strong>{{ team.user.name || '-' }}</p>
        <p><strong>自己的邀请码：</strong>{{ team.user.myInviteCode || '-' }}</p>
      </section>

      <section class="card parent-user">
        <h3>上级用户</h3>
        <div v-if="team.parent">
          <p><strong>UID：</strong>{{ team.parent.id }}</p>
          <p><strong>账号：</strong>{{ team.parent.account || '-' }}</p>
          <p><strong>用户名：</strong>{{ formatUserName(team.parent.name) }}</p>
          <p><strong>自己的邀请码：</strong>{{ team.parent.myInviteCode || '-' }}</p>
        </div>
        <div v-else class="status-text">无上级（顶级用户）</div>
      </section>

      <section class="card children-users">
        <h3>下级成员（直属）</h3>
        <div v-if="team.children.length === 0" class="status-text">暂无下级成员</div>
        <table v-else class="children-table">
          <thead>
            <tr>
              <th>UID</th>
              <th>账号</th>
              <th>用户名</th>
              <th>自己的邀请码</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in team.children" :key="c.id">
              <td>{{ c.id }}</td>
              <td>{{ c.account || '-' }}</td>
              <td>{{ c.name || '-' }}</td>
              <td>{{ c.myInviteCode || '-' }}</td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  </div>
</template>

<style scoped>
.team-page {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.btn-back {
  padding: 6px 16px;
  border: none;
  border-radius: 4px;
  background: #6c757d;
  color: #fff;
  cursor: pointer;
}

.status-text {
  margin-top: 16px;
  color: #666;
}

.status-text.error {
  color: #dc3545;
}

.team-content {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
}

.card {
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
}

.card h3 {
  margin-bottom: 8px;
  font-size: 16px;
}

.children-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 8px;
}

.children-table th,
.children-table td {
  border: 1px solid #e9ecef;
  padding: 6px 8px;
  text-align: left;
  font-size: 13px;
}

.children-table th {
  background: #f8f9fa;
}
</style>


