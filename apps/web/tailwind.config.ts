import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'pixel-blue': '#3a86ff',
        'pixel-red': '#ff006e',
        'pixel-yellow': '#ffd60a',
        'pixel-green': '#1dd3b0',
        'pixel-purple': '#8338ec',
        'pixel-dark': '#f2f4f8',
        'pixel-ink': '#101828',
      },
      boxShadow: {
        'pixel-sm': '8px 8px 0 0 rgba(16, 24, 40, 0.72)',
        'pixel-md': '12px 12px 0 0 rgba(16, 24, 40, 0.76)',
        'pixel-lg': '16px 16px 0 0 rgba(16, 24, 40, 0.82)',
      },
      borderRadius: {
        pixel: '1.5rem',
      },
    },
  },
  plugins: [],
};

export default config;
