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
    },
  },
  plugins: [],
}
