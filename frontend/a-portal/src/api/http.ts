import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE ?? 'http://localhost:3000';

export const http = axios.create({
  baseURL,
  timeout: 10000,
});

// 请求拦截器：添加token
http.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('user-token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// 响应拦截器：处理错误
http.interceptors.response.use(
  (resp) => resp.data,
  (error) => {
    const message = error?.response?.data?.message ?? error.message ?? '请求失败';
    return Promise.reject(new Error(message));
  },
);

