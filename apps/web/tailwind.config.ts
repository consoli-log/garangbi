import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#050316',
          secondary: '#5B21B6',
          accent: '#F97316',
        },
      },
      fontFamily: {
        sans: ['"Pretendard Variable"', 'Pretendard', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '8px 8px 0 rgba(5, 3, 22, 0.7)',
      },
    },
  },
  plugins: [],
};

export default config;
