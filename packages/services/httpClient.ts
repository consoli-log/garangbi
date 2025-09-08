import axios from 'axios';

let authToken: string | null = null;

export function setAuthToken(token?: string) {
  authToken = token ?? null;
}

export const api = axios.create({
  baseURL: (import.meta as any)?.env?.VITE_API_URL ?? '/api',
  withCredentials: true
});

api.interceptors.request.use((config) => {
  if (authToken) {
    config.headers = config.headers ?? {};
    (config.headers as any).Authorization = `Bearer ${authToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => Promise.reject(err)
);
