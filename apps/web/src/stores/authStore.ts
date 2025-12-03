import { create } from 'zustand';

const TOKEN_KEY = 'zzogaebook.accessToken';
const TOKEN_EXPIRY_KEY = 'zzogaebook.tokenExpiry';

type AuthState = {
  accessToken: string | null;
  expiresAt: number | null;
  initialized: boolean;
  setSession: (token: string, expiresInSeconds: number) => void;
  clearSession: () => void;
  hydrate: () => void;
};

const isBrowser = typeof window !== 'undefined';

const persist = (key: string, value: string | null) => {
  if (!isBrowser) return;
  if (value === null) {
    window.localStorage.removeItem(key);
    return;
  }
  window.localStorage.setItem(key, value);
};

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  expiresAt: null,
  initialized: false,
  setSession: (token: string, expiresInSeconds: number) => {
    const expiresAt = Date.now() + expiresInSeconds * 1000;
    persist(TOKEN_KEY, token);
    persist(TOKEN_EXPIRY_KEY, String(expiresAt));
    set({
      accessToken: token,
      expiresAt,
      initialized: true,
    });
  },
  clearSession: () => {
    persist(TOKEN_KEY, null);
    persist(TOKEN_EXPIRY_KEY, null);
    set({
      accessToken: null,
      expiresAt: null,
      initialized: true,
    });
  },
  hydrate: () => {
    if (!isBrowser || get().initialized) {
      return;
    }
    const storedToken = window.localStorage.getItem(TOKEN_KEY);
    const storedExpiry = window.localStorage.getItem(TOKEN_EXPIRY_KEY);
    if (!storedToken || !storedExpiry) {
      set({ initialized: true, accessToken: null, expiresAt: null });
      return;
    }
    const expiresAt = Number(storedExpiry);
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      get().clearSession();
      return;
    }
    set({
      accessToken: storedToken,
      expiresAt,
      initialized: true,
    });
  },
}));

export const authSelectors = {
  token: (state: AuthState) => state.accessToken,
  initialized: (state: AuthState) => state.initialized,
  isAuthenticated: (state: AuthState) => Boolean(state.accessToken),
};
