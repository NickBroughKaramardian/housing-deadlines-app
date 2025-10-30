/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'theme-primary': 'var(--color-primary)',
        'theme-primary-hover': 'var(--color-primary-hover)',
        'theme-primary-light': 'var(--color-primary-light)',
        'theme-primary-dark': 'var(--color-primary-dark)',
        'theme-accent': 'var(--color-accent)',
        'theme-accent-hover': 'var(--color-accent-hover)',
        'theme-accent-light': 'var(--color-accent-light)',
        'theme-accent-dark': 'var(--color-accent-dark)',
        'theme-success': 'var(--color-success)',
        'theme-warning': 'var(--color-warning)',
        'theme-error': 'var(--color-error)',
        'theme-info': 'var(--color-info)',
      },
      backgroundColor: {
        'theme-background': 'var(--color-background)',
        'theme-surface': 'var(--color-surface)',
        'theme-surface-hover': 'var(--color-surface-hover)',
      },
      textColor: {
        'theme-text': 'var(--color-text)',
        'theme-text-secondary': 'var(--color-text-secondary)',
        'theme-text-muted': 'var(--color-text-muted)',
      },
      borderColor: {
        'theme-border': 'var(--color-border)',
      },
      boxShadow: {
        'theme': 'var(--color-shadow)',
        'theme-hover': 'var(--color-shadow-hover)',
      }
    },
  },
  plugins: [],
}
