import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

interface User {
  id: number;
  account: string;
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('user-token'));
  const user = ref<User | null>((() => {
    const stored = localStorage.getItem('user-info');
    return stored ? JSON.parse(stored) : null;
  })());

  const isAuthenticated = computed(() => !!token.value && !!user.value);

  function setAuth(newToken: string, newUser: User) {
    token.value = newToken;
    user.value = newUser;
    localStorage.setItem('user-token', newToken);
    localStorage.setItem('user-info', JSON.stringify(newUser));
  }

  function clearAuth() {
    token.value = null;
    user.value = null;
    localStorage.removeItem('user-token');
    localStorage.removeItem('user-info');
  }

  function initAuth() {
    const storedToken = localStorage.getItem('user-token');
    const storedUser = localStorage.getItem('user-info');
    if (storedToken && storedUser) {
      token.value = storedToken;
      user.value = JSON.parse(storedUser);
    } else {
      clearAuth();
    }
  }

  return {
    token,
    user,
    isAuthenticated,
    setAuth,
    clearAuth,
    initAuth,
  };
});

