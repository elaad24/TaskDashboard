import type { Config } from 'tailwindcss';

const withAlpha = (variable: string) => `rgb(var(${variable}) / <alpha-value>)`;

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: {
          deep: withAlpha('--cc-bg-deep-rgb'),
          mid: withAlpha('--cc-bg-mid-rgb'),
          soft: withAlpha('--cc-bg-soft-rgb'),
          glass: withAlpha('--cc-bg-glass-rgb'),
        },
        cyan: {
          DEFAULT: withAlpha('--cc-cyan-rgb'),
          50: '#E6FBFF',
          100: withAlpha('--cc-cyan-100-rgb'),
          200: withAlpha('--cc-cyan-200-rgb'),
          300: withAlpha('--cc-cyan-300-rgb'),
          400: '#00D9FF',
          500: '#00B6D9',
          600: '#0091AB',
        },
        neon: {
          DEFAULT: withAlpha('--cc-neon-rgb'),
          50: '#E6FFF6',
          100: withAlpha('--cc-neon-100-rgb'),
          200: withAlpha('--cc-neon-200-rgb'),
          300: '#35FFB6',
          400: '#15E69E',
          500: '#0FBF82',
        },
        amber: {
          DEFAULT: '#FFB020',
          400: '#FFC557',
          500: '#FFB020',
          600: '#D98A00',
        },
        danger: {
          DEFAULT: '#FF4D6D',
          400: '#FF7891',
          500: '#FF4D6D',
          600: '#D93B58',
        },
        text: {
          main: withAlpha('--cc-text-main-rgb'),
          soft: withAlpha('--cc-text-soft-rgb'),
          muted: withAlpha('--cc-text-muted-rgb'),
        },
        border: {
          glow: 'var(--cc-border-glow)',
          subtle: 'var(--cc-border-subtle)',
          card: 'var(--cc-border-card)',
          pill: 'var(--cc-border-pill)',
          'pill-neon': 'var(--cc-border-pill-neon)',
          'pill-amber': 'var(--cc-border-pill-amber)',
          'pill-danger': 'var(--cc-border-pill-danger)',
          accent: 'var(--cc-border-accent)',
          'accent-strong': 'var(--cc-border-accent-strong)',
        },
      },
      boxShadow: {
        'glow-cyan': '0 0 24px rgb(var(--cc-cyan-rgb) / 0.18)',
        'glow-cyan-lg': '0 0 40px rgb(var(--cc-cyan-rgb) / 0.28)',
        'glow-neon': '0 0 24px rgb(var(--cc-neon-rgb) / 0.18)',
        'glow-amber': '0 0 24px rgba(255, 176, 32, 0.18)',
        'glow-danger': '0 0 24px rgba(255, 77, 109, 0.20)',
        glass: 'var(--cc-shadow-glass)',
        'glass-lg': 'var(--cc-shadow-glass-lg)',
        cockpit: 'var(--cc-shadow-cockpit)',
      },
      backgroundImage: {
        cockpit: 'var(--cc-bg-cockpit)',
        primary: 'linear-gradient(135deg, #00D9FF, #35FFB6)',
        'card-glass': 'var(--cc-bg-card-glass)',
      },
      backdropBlur: {
        glass: '16px',
      },
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
        display: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        glass: '18px',
      },
      animation: {
        'pulse-slow': 'pulseGlow 3.2s ease-in-out infinite',
        'fade-up': 'fadeUp 220ms ease-out both',
        shimmer: 'shimmer 1.6s linear infinite',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 0px rgb(var(--cc-cyan-rgb) / 0.35)' },
          '50%': { boxShadow: '0 0 32px rgb(var(--cc-cyan-rgb) / 0.55)' },
        },
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
