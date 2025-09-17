import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@services': path.resolve(__dirname, '../../packages/services/src/'),
      '@stores': path.resolve(__dirname, './src/stores'),
      'apps/web/src/stores/authStore': path.resolve(
        __dirname,
        './src/stores/authStore.ts',
      ),
    },
  },
});