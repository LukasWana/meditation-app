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
      },
      fontSize: {
        'display': ['var(--font-size-display)', { lineHeight: 'var(--line-height-tight)', letterSpacing: 'var(--tracking-display)' }],
        'h1':      ['var(--font-size-h1)',      { lineHeight: 'var(--line-height-heading)', letterSpacing: 'var(--tracking-heading)' }],
        'h2':      ['var(--font-size-h2)',      { lineHeight: 'var(--line-height-heading)', letterSpacing: 'var(--tracking-heading)' }],
        'h3':      ['var(--font-size-h3)',      { lineHeight: 'var(--line-height-heading)' }],
        'body':    ['var(--font-size-body)',    { lineHeight: 'var(--line-height-body)' }],
        'small':   ['var(--font-size-small)',   { lineHeight: 'var(--line-height-body)' }],
        'caption': ['var(--font-size-caption)', { lineHeight: 'var(--line-height-body)', letterSpacing: 'var(--tracking-caption)' }],
      },
      transitionDuration: {
        'fast': 'var(--duration-fast)',
        'normal': 'var(--duration-normal)',
        'slow': 'var(--duration-slow)',
      },
      maxWidth: {
        'content': 'var(--content-max-width)',
      },
    },
  },
  plugins: [],
}
