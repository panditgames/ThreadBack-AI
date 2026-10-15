/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./popup.html",
    "./dashboard.html",
    "./sidepanel.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#090d16',
          card: '#0f172a',
          surface: '#131e36',
          border: '#1e293b',
          muted: '#64748b',
          accent: '#38bdf8',
        },
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
        },
        brand: {
          cyan: '#06b6d4',
          indigo: '#6366f1',
          purple: '#8b5cf6',
          emerald: '#10b981',
          amber: '#f59e0b',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace']
      }
    },
  },
  plugins: [],
}
