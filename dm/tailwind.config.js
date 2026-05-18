module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    './index.html',
    './admin.html'
  ],
  darkMode: ['data-theme', 'class'],
  theme: {
    extend: {
      colors: {
        primary: 'var(--theme-primary, #3b82f6)',
      }
    }
  },
  plugins: []
};
