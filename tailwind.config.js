/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#07070b',
          900: '#0b0b12',
          850: '#0f0f18',
          800: '#14141e',
          750: '#191925',
          700: '#22222f',
          600: '#2e2e3d',
        },
        accent: {
          DEFAULT: '#8b5cf6',
          soft: '#a78bfa',
          deep: '#6d28d9',
          cyan: '#22d3ee',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 18px 40px -18px rgba(0, 0, 0, 0.9)',
        glow: '0 0 0 1px rgba(139, 92, 246, 0.35), 0 18px 50px -20px rgba(139, 92, 246, 0.55)',
      },
      backgroundImage: {
        'accent-gradient': 'linear-gradient(100deg, #8b5cf6 0%, #6366f1 45%, #22d3ee 100%)',
        'hero-fade':
          'linear-gradient(to top, #07070b 0%, rgba(7,7,11,0.85) 18%, rgba(7,7,11,0.35) 55%, rgba(7,7,11,0.15) 100%)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'rise-in': {
          from: { opacity: '0', transform: 'translateY(18px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        'pulse-ring': {
          '0%': { boxShadow: '0 0 0 0 rgba(139,92,246,0.45)' },
          '100%': { boxShadow: '0 0 0 14px rgba(139,92,246,0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.4s ease-out both',
        'rise-in': 'rise-in 0.5s cubic-bezier(0.22, 1, 0.36, 1) both',
        shimmer: 'shimmer 1.6s infinite',
        'pulse-ring': 'pulse-ring 1.8s ease-out infinite',
      },
      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
}
