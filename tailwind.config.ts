import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        space: {
          DEFAULT: '#06080F',
          2: '#0A0F1E',
        },
        blue: {
          DEFAULT: '#3B82F6',
          bright: '#60A5FA',
          deep: '#1E3A8A',
        },
        pink: {
          DEFAULT: '#EC4899',
          bright: '#F472B6',
          hot: '#DB2777',
        },
        glass: {
          DEFAULT: 'rgba(255,255,255,0.05)',
          hover: 'rgba(255,255,255,0.09)',
          border: 'rgba(255,255,255,0.10)',
        },
        text: {
          primary: '#F8FAFC',
          muted: '#94A3B8',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'DM Sans', 'sans-serif'],
        body: ['var(--font-body)', 'DM Sans', 'sans-serif'],
        mono: ['var(--font-mono)', 'JetBrains Mono', 'monospace'],
      },
      fontSize: {
        xxs: '0.625rem',
      },
      boxShadow: {
        glass: '0 8px 40px rgba(0, 0, 0, 0.4)',
        'glow-blue': '0 0 40px rgba(59, 130, 246, 0.35)',
        'glow-pink': '0 0 40px rgba(236, 72, 153, 0.35)',
        'glow-mix': '0 0 60px rgba(59, 130, 246, 0.25), 0 0 80px rgba(236, 72, 153, 0.2)',
      },
      backgroundImage: {
        'ai-gradient': 'linear-gradient(135deg, #3B82F6 0%, #EC4899 100%)',
        'ai-gradient-soft': 'linear-gradient(135deg, rgba(59,130,246,0.15) 0%, rgba(236,72,153,0.15) 100%)',
        'space-gradient': 'radial-gradient(ellipse at top, #0A0F1E 0%, #06080F 60%)',
        'mesh-1': "radial-gradient(at 20% 10%, rgba(59,130,246,0.25) 0%, transparent 50%), radial-gradient(at 80% 20%, rgba(236,72,153,0.2) 0%, transparent 50%), radial-gradient(at 50% 80%, rgba(59,130,246,0.15) 0%, transparent 50%)",
      },
      animation: {
        'shimmer': 'shimmer 2.4s linear infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'spin-slow': 'spin 18s linear infinite',
        'glow': 'glow 3s ease-in-out infinite',
        'grain': 'grain 8s steps(10) infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        glow: {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
        grain: {
          '0%, 100%': { transform: 'translate(0,0)' },
          '10%': { transform: 'translate(-5%,-10%)' },
          '20%': { transform: 'translate(-15%,5%)' },
          '30%': { transform: 'translate(7%,-25%)' },
          '40%': { transform: 'translate(-5%,25%)' },
          '50%': { transform: 'translate(-15%,10%)' },
          '60%': { transform: 'translate(15%,0)' },
          '70%': { transform: 'translate(0,15%)' },
          '80%': { transform: 'translate(3%,35%)' },
          '90%': { transform: 'translate(-10%,10%)' },
        },
      },
      transitionTimingFunction: {
        'ease-out-strong': 'cubic-bezier(0.23, 1, 0.32, 1)',
        'ease-in-out-strong': 'cubic-bezier(0.77, 0, 0.175, 1)',
        'drawer': 'cubic-bezier(0.32, 0.72, 0, 1)',
      },
    },
  },
  plugins: [],
}

export default config
