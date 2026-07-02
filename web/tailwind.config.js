/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Palette Wandrail v2 : navy + vert eco (tourisme durable)
        // Compat: on garde violet.* comme alias vers eco.* pour ne rien casser
        // Palette SNCF Connect : vert institutionnel + bleu accent
        eco: {
          DEFAULT: '#0A5C36',
          dark: '#064023',
          light: '#22C55E',
          soft: '#ECFDF5',
        },
        navy: {
          DEFAULT: '#1C1C1C',
          light: '#374151',
        },
        accent: '#1F6FEB',
        // Alias : classes bg-violet/text-violet utilisent le vert SNCF
        violet: {
          DEFAULT: '#0A5C36',
          dark: '#064023',
          light: '#22C55E',
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
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
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
