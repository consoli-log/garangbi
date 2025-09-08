import { api } from './httpClient';

export async function me() {
  const res = await api.get('/users/me');
  return res.data as { id: string; email: string; nickname: string } | null;
}
