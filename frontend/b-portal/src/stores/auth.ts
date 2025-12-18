import { defineStore } from 'pinia';

interface User {
  id: number;
  account: string;
  isSubUser?: boolean;
  parentAdminId?: number | null;
  myInviteCode?: string | null; // 子用户的邀请码
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: '',
    user: null as User | null,
  }),
  getters: {
    isAuthenticated: (state) => {
      const hasToken = !!state.token || !!localStorage.getItem('admin-token');
      return hasToken;
    },
  },
  actions: {
    setAuth(token: string, user: User) {
      console.log('设置认证信息:', { token, user });
      this.token = token;
      this.user = user;
      localStorage.setItem('admin-token', token);
      localStorage.setItem('admin-user', JSON.stringify(user));
      console.log('认证信息已保存到localStorage');
    },
    logout() {
      this.token = '';
      this.user = null;
      localStorage.removeItem('admin-token');
      localStorage.removeItem('admin-user');
    },
    initAuth() {
      const token = localStorage.getItem('admin-token');
      const userStr = localStorage.getItem('admin-user');
      if (token && userStr) {
        try {
          this.token = token;
          this.user = JSON.parse(userStr);
          console.log('从localStorage恢复认证信息:', { token, user: this.user });
        } catch (e) {
          console.error('解析用户信息失败:', e);
          this.logout();
        }
      }
    },
  },
});

