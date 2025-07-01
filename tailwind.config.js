/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      animation: {
        'spin-slow': 'spin 3s linear infinite',
      },
      fontFamily: {
        'sans': ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'Noto Sans', 'sans-serif'],
        'inter': ['Inter', 'sans-serif'],
      },
      colors: {
        gray: {
          850: '#1f2937',
          950: '#0f172a',
        },
        'gaming-dark': '#0f0f23',
        'gaming-darker': '#0a0a1a',
        'gaming-card': '#1a1a2e',
        'gaming-accent': '#6366f1',
        'gaming-gold': '#fbbf24',
        'gaming-gradient': 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 100%)',
        'card-gradient': 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      },
      backgroundImage: {
        'gaming-gradient': 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 100%)',
        'card-gradient': 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      }
    },
  },
  plugins: [],
};