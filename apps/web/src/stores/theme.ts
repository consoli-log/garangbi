import { create } from 'zustand';

type Mode = 'light' | 'dark';
type ThemeState = { mode: Mode; toggle: () => void };

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light',
  toggle: () => set({ mode: get().mode === 'dark' ? 'light' : 'dark' })
}));
