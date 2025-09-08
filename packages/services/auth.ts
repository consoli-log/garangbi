import { api } from './httpClient';

export async function register(email: string, nickname: string, password: string) {
  const res = await api.post('/auth/register', { email, nickname, password });
  return res.data as { id: string };
}

export async function login(email: string, password: string) {
  const res = await api.post('/auth/login', { email, password });
  return res.data as { accessToken: string; user: { id: string; email: string; nickname: string } };
}
