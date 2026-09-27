/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        navy: {
          50: '#f0f4f8',
          100: '#d9e4ef',
          200: '#b3c9de',
          300: '#7fa3c4',
          400: '#4d7aa6',
          500: '#1b4f72',
          600: '#163f5c',
          700: '#12324a',
          800: '#0d2436',
          900: '#0b1f33',
          950: '#071421',
        },
        gold: {
          500: '#c9a227',
          600: '#a8861c',
        },
        teal: {
          500: '#0e7c7b',
          600: '#0b6362',
        },
      },
      boxShadow: {
        card: '0 1px 2px rgba(15, 23, 42, 0.06), 0 8px 24px rgba(15, 23, 42, 0.04)',
      },
    },
  },
  plugins: [],
}
