import { create } from 'zustand';
import { setAuthToken } from '@services/httpClient';

type User = { id: string; email: string; nickname: string };

type AuthState = {
  token: string | null;
  user: User | null;
  keep: boolean;
  login: (token: string, user: User, keep: boolean) => void;
  logout: () => void;
  hydrate: () => void;
};

const STORAGE_KEY = 'garangbi_auth';

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  keep: false,
  login: (token, user, keep) => {
    setAuthToken(token);
    set({ token, user, keep });
    if (keep) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user }));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  },
  logout: () => {
    setAuthToken(undefined);
    set({ token: null, user: null, keep: false });
    localStorage.removeItem(STORAGE_KEY);
  },
  hydrate: () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw) as { token: string; user: User };
      setAuthToken(data.token);
      set({ token: data.token, user: data.user, keep: true });
    } catch {
      // ignore
    }
  }
}));
