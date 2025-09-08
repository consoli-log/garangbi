import { create } from 'zustand';
import { setAuthToken } from '@services/httpClient';

type User = { id: string; email: string; nickname: string };

type AuthState = {
  token: string | null;
  user: User | null;
  keep: boolean;
  hydrated: boolean;
  login: (token: string, user: User, keep: boolean) => void;
  logout: () => void;
  hydrate: () => void;
};

const STORAGE_KEY = 'garangbi_auth';

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  keep: false,
  hydrated: false,
  login: (token, user, keep) => {
    setAuthToken(token);
    set({ token, user, keep, hydrated: true });
    if (keep) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user }));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  },
  logout: () => {
    setAuthToken(undefined);
    set({ token: null, user: null, keep: false, hydrated: true });
    localStorage.removeItem(STORAGE_KEY);
  },
  hydrate: () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw) as { token: string; user: User };
        setAuthToken(data.token);
        set({ token: data.token, user: data.user, keep: true, hydrated: true });
        return;
      }
    } catch {
      // ignore
    }
    set({ hydrated: true });
  }
}));
