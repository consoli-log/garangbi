import axios from 'axios';
import { notificationService } from './notification';

let useAuthStore: any;

import('apps/web/src/stores/authStore').then((module) => {
  useAuthStore = module.useAuthStore;
});

const httpClient = axios.create({
  baseURL: '/api',
});

httpClient.interceptors.request.use(
  (config) => {
    if (useAuthStore) {
      const { accessToken } = useAuthStore.getState();
      if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

httpClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && error.response.data && error.response.data.message) {
      notificationService.error(error.response.data.message);
    } else {
      notificationService.error('오류가 발생했습니다. 다시 시도해주세요.');
    }

    return Promise.reject(error);
  },
);

export default httpClient;