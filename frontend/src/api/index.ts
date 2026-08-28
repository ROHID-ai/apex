import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';

const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const requestUrl = String(error?.config?.url || '');

    if (status === 401 && !requestUrl.includes('/login')) {
      const currentPath = `${window.location.pathname}${window.location.search}`;
      if (currentPath && currentPath !== '/') {
        sessionStorage.setItem('post_login_redirect', currentPath);
      }

      useAuthStore.getState().logout();
      window.history.replaceState({}, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }

    return Promise.reject(error);
  }
);

export default api;
