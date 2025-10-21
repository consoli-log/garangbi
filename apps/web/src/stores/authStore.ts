import { create } from 'zustand';
import { authService } from '@services/index';
import { LoginDto, User } from '@garangbi/types';

const TOKEN_STORAGE_KEY = 'garangbi:accessToken';

const getStoredToken = () => {
  if (typeof window === 'undefined') {
    return { token: null as string | null, remember: false };
  }

  const localToken = window.localStorage.getItem(TOKEN_STORAGE_KEY);
  if (localToken) {
    return { token: localToken, remember: true };
  }

  const sessionToken = window.sessionStorage.getItem(TOKEN_STORAGE_KEY);
  if (sessionToken) {
    return { token: sessionToken, remember: false };
  }

  return { token: null as string | null, remember: false };
};

const persistToken = (token: string | null, remember: boolean) => {
  if (typeof window === 'undefined') {
    return;
  }

  if (!token) {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    window.sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    return;
  }

  if (remember) {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
    window.sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  } else {
    window.sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
};

type AuthState = {
  accessToken: string | null;
  user: User | null;
  isAuthenticated: boolean;
  rememberLogin: boolean;
  login: (credentials: LoginDto, remember: boolean) => Promise<User>;
  logout: () => void;
  fetchUser: (token?: string) => Promise<User>;
  setToken: (token: string, remember: boolean) => void;
  initialize: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set, get) => {
  const { token: initialToken, remember } = getStoredToken();

  return {
    accessToken: initialToken,
    user: null,
    isAuthenticated: Boolean(initialToken),
    rememberLogin: remember,

    setToken: (token: string, rememberLogin: boolean) => {
      persistToken(token, rememberLogin);
      set({
        accessToken: token,
        isAuthenticated: true,
        rememberLogin,
      });
    },

    login: async (credentials: LoginDto, rememberLogin: boolean) => {
      const { accessToken } = await authService.login(credentials);
      get().setToken(accessToken, rememberLogin);
      return get().fetchUser(accessToken);
    },

    fetchUser: async (token?: string) => {
      const authToken = token ?? get().accessToken;
      if (!authToken) {
        throw new Error('인증 토큰이 없습니다.');
      }

      try {
        const user = await authService.getMe(authToken);
        set({ user });
        return user;
      } catch (error) {
        persistToken(null, false);
        set({ accessToken: null, user: null, isAuthenticated: false });
        throw error;
      }
    },

    initialize: async () => {
      const { token, remember: persistedRemember } = getStoredToken();
      if (!token) {
        return;
      }

      set({
        accessToken: token,
        isAuthenticated: true,
        rememberLogin: persistedRemember,
      });

      try {
        const user = await authService.getMe(token);
        set({ user });
      } catch {
        persistToken(null, false);
        set({ accessToken: null, user: null, isAuthenticated: false });
      }
    },

    logout: () => {
      persistToken(null, false);
      set({ accessToken: null, user: null, isAuthenticated: false, rememberLogin: false });
    },
  };
});
