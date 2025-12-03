import { create } from 'zustand';

const TOKEN_KEY = 'zzogaebook.accessToken';
const TOKEN_EXPIRY_KEY = 'zzogaebook.tokenExpiry';
const USER_KEY = 'zzogaebook.user';

type AuthUser = {
  id: string;
  email: string;
  nickname: string;
  status: string;
};

type AuthState = {
  accessToken: string | null;
  expiresAt: number | null;
  user: AuthUser | null;
  initialized: boolean;
  setSession: (token: string, expiresInSeconds: number, user: AuthUser) => void;
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
  user: null,
  initialized: false,
  setSession: (token: string, expiresInSeconds: number, user: AuthUser) => {
    const expiresAt = Date.now() + expiresInSeconds * 1000;
    persist(TOKEN_KEY, token);
    persist(TOKEN_EXPIRY_KEY, String(expiresAt));
    persist(USER_KEY, JSON.stringify(user));
    set({
      accessToken: token,
      expiresAt,
      user,
      initialized: true,
    });
  },
  clearSession: () => {
    persist(TOKEN_KEY, null);
    persist(TOKEN_EXPIRY_KEY, null);
    persist(USER_KEY, null);
    set({
      accessToken: null,
      expiresAt: null,
      user: null,
      initialized: true,
    });
  },
  hydrate: () => {
    if (!isBrowser || get().initialized) {
      return;
    }
    const storedToken = window.localStorage.getItem(TOKEN_KEY);
    const storedExpiry = window.localStorage.getItem(TOKEN_EXPIRY_KEY);
    const storedUser = window.localStorage.getItem(USER_KEY);
    if (!storedToken || !storedExpiry) {
      set({ initialized: true, accessToken: null, expiresAt: null, user: null });
      return;
    }
    const expiresAt = Number(storedExpiry);
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      get().clearSession();
      return;
    }
    let parsedUser: AuthUser | null = null;
    if (storedUser) {
      try {
        parsedUser = JSON.parse(storedUser) as AuthUser;
      } catch {
        parsedUser = null;
      }
    }
    set({
      accessToken: storedToken,
      expiresAt,
      user: parsedUser,
      initialized: true,
    });
  },
}));

export const authSelectors = {
  token: (state: AuthState) => state.accessToken,
  initialized: (state: AuthState) => state.initialized,
  isAuthenticated: (state: AuthState) => Boolean(state.accessToken),
  user: (state: AuthState) => state.user,
};
