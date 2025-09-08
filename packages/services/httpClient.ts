import axios from 'axios';

export const api = axios.create({
  baseURL: (import.meta as any)?.env?.VITE_API_URL ?? '/api',
  withCredentials: true
});

api.interceptors.response.use(
  (r) => r,
  (err) => Promise.reject(err)
);
