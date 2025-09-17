import { create } from 'zustand';
import { authService } from '@services/index';
import { LoginDto, User } from '@garangbi/types';

type AuthState = {
  accessToken: string | null;
  user: User | null;
  isAuthenticated: boolean;
  login: (credentials: LoginDto) => Promise<void>;
  logout: () => void;
  fetchUser: () => Promise<void>;
  setToken: (token: string) => void;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  user: null,
  isAuthenticated: false,

  setToken: (token: string) => {
    set({ accessToken: token, isAuthenticated: true });
  },

  login: async (credentials: LoginDto) => {
    const { accessToken } = await authService.login(credentials);
    get().setToken(accessToken);
    await get().fetchUser();
  },

  fetchUser: async () => {
    try {
      const user = await authService.getMe();
      set({ user });
    } catch (error) {
      get().logout();
    }
  },

  logout: () => {
    set({ accessToken: null, user: null, isAuthenticated: false });
  },
}));