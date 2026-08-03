/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'petrona': ['Petrona', 'serif'],
        'sans': ['Petrona', 'serif'],
      },
      borderRadius: {
        'theme-card': 'var(--radius-card)',
        'theme-inner': 'var(--radius-inner)',
        'theme-button': 'var(--radius-button)',
        'theme-full': 'var(--radius-full)',
      }
    },
  },
  plugins: [],
}
