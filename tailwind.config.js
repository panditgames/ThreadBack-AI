/** @type {import('tailwindcss').Config} */
export default {
  content: ['./popup.html', './dashboard.html', './sidepanel.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: { extend: {
    colors: {
      dark: { bg: '#0b0d0e', card: '#151819', surface: '#1b2022', border: '#2c3335', muted: '#929c9f', accent: '#78d8c2' },
      brand: { teal: '#78d8c2' },
      slate: { 50: '#f7f8f8', 100: '#edf0f0', 200: '#dce1e1', 300: '#c0c9c9', 400: '#9da9a9', 500: '#7a8989', 600: '#546363', 700: '#354242', 800: '#222b2b', 900: '#161d1d', 950: '#0b1010' },
    },
    fontFamily: { sans: ['Inter', 'Segoe UI', 'system-ui', '-apple-system', 'sans-serif'], mono: ['SFMono-Regular', 'Consolas', 'monospace'] },
  } },
  plugins: [],
};
