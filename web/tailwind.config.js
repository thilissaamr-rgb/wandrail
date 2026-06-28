/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Palette Wandrail : violet SNCF Connect + neutres
        violet: {
          DEFAULT: '#7c3aed',
          dark: '#4c1d95',
          light: '#c4b5fd',
        },
        // Tokens semantiques pilotes par des variables CSS (voir index.css).
        // Basculent automatiquement en mode sombre.
        bg: 'rgb(var(--bg) / <alpha-value>)',
        card: 'rgb(var(--card) / <alpha-value>)',
        card2: 'rgb(var(--card2) / <alpha-value>)',
        ink: 'rgb(var(--text) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        line: 'var(--line)',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', '"Plus Jakarta Sans"', 'sans-serif'],
      },
      maxWidth: {
        page: '1280px',
      },
      boxShadow: {
        card: '0 1px 4px rgba(0,0,0,0.05)',
        cardHover: '0 14px 40px rgba(0,0,0,0.12)',
      },
    },
  },
  plugins: [],
}
