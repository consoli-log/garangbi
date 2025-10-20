import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'pixel-blue': '#4cc9f0',
        'pixel-red': '#f72585',
        'pixel-yellow': '#f9c74f',
        'pixel-green': '#90be6d',
        'pixel-purple': '#9d4edd',
        'pixel-dark': '#1d1f2a',
      },
      boxShadow: {
        'pixel-sm': '4px 4px 0 0 rgba(0,0,0,0.45)',
        'pixel-md': '6px 6px 0 0 rgba(0,0,0,0.55)',
        'pixel-lg': '8px 8px 0 0 rgba(0,0,0,0.65)',
      },
      borderRadius: {
        pixel: '0.375rem',
      },
    },
  },
  plugins: [],
};

export default config;
