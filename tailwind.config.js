/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Fraunces"', 'serif'],
        sans: ['"Manrope"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      colors: {
        ink: '#0f172a',
        fog: '#94a3b8',
        blush: '#f4b2a9',
        tide: '#7dd3fc',
        moss: '#86efac',
      },
      boxShadow: {
        glow: '0 20px 60px -30px rgba(15, 23, 42, 0.6)',
        halo: '0 0 0 1px rgba(15, 23, 42, 0.08), 0 16px 40px -24px rgba(15, 23, 42, 0.5)',
      },
      keyframes: {
        floatIn: {
          '0%': { opacity: 0, transform: 'translateY(18px)' },
          '100%': { opacity: 1, transform: 'translateY(0px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '0% 50%' },
          '100%': { backgroundPosition: '100% 50%' },
        },
      },
      animation: {
        floatIn: 'floatIn 0.7s ease-out both',
        shimmer: 'shimmer 14s ease infinite',
      },
    },
  },
  plugins: [],
}
