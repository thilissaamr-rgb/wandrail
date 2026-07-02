/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Palette Wandrail v2 : navy + vert eco (tourisme durable)
        // Compat: on garde violet.* comme alias vers eco.* pour ne rien casser
        eco: {
          DEFAULT: '#2A9D8F',
          dark: '#1B263B',
          light: '#52B788',
          soft: '#E9F5F2',
        },
        navy: {
          DEFAULT: '#0D1B2A',
          light: '#1B263B',
        },
        accent: '#E76F51',
        // Alias : les classes bg-violet, text-violet, etc. utilisent la nouvelle palette
        violet: {
          DEFAULT: '#2A9D8F',
          dark: '#1B263B',
          light: '#52B788',
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
        sans: ['Poppins', 'Inter', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'Inter', 'sans-serif'],
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
