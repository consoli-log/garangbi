import { create } from 'zustand';
import { authService } from '@services/index';
import { LoginDto, User } from '@garangbi/types';

type AuthState = {
  accessToken: string | null;
  user: User | null;
  isAuthenticated: boolean;
  login: (credentials: LoginDto) => Promise<void>;
  logout: () => void;
  fetchUser: (token: string) => Promise<void>;
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
    await get().fetchUser(accessToken); 
  },

  fetchUser: async (token: string) => { 
    try {
      const user = await authService.getMe(token);
      set({ user });
    } catch (error) {
      get().logout();
      throw error;
    }
  },

  logout: () => {
    set({ accessToken: null, user: null, isAuthenticated: false });
  },
}));