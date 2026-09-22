/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#eef2f9',
          100: '#d6e0f0',
          500: '#2b4c7e',
          600: '#1f3a63',
          700: '#152b4a',
          900: '#0b1830',
        },
      },
    },
  },
  plugins: [],
};
