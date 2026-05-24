/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        reya: {
          bg: '#09090b',
          surface: '#0f0f12',
          card: '#131316',
          'card-hover': '#18181c',
          border: '#27272a',
          'border-subtle': '#1c1c1f',
          accent: '#22c55e',
          'accent-dim': '#16a34a',
          green: '#22c55e',
          'green-dim': '#16a34a',
          'text-2': '#a1a1aa',
          cyan: '#38bdf8',
          red: '#ef4444',
          yellow: '#eab308',
          text: '#fafafa',
          'text-secondary': '#a1a1aa',
          muted: '#71717a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.65rem', { lineHeight: '1rem' }],
      },
      boxShadow: {
        panel: '0 1px 0 0 rgba(255,255,255,0.04) inset',
      },
    },
  },
  plugins: [],
}
