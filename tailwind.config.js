/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans:   ['Inter', 'system-ui', 'sans-serif'],
        cinzel: ['Cinzel', 'Georgia', 'serif'],
      },
      colors: {
        // Warm medieval brown palette
        stone: {
          950: '#0f0c09',   // body background
          900: '#1a1510',   // sidebar, surfaces
          800: '#241d14',   // cards, hover backgrounds
          700: '#312820',   // borders
          600: '#3e3226',   // lighter borders
          400: '#7a6a55',   // muted text
          300: '#a89880',   // secondary text
          200: '#d4c4a8',   // primary text
          100: '#f0e6d0',   // headings
        },
        gold: {
          DEFAULT: '#f0a820',
          dark:    '#c08010',
          light:   '#f8c848',
        },
      },
    },
  },
  plugins: [],
}
