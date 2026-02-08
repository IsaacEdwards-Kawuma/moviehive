import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        netflix: {
          red: '#E50914',
          black: '#141414',
          'dark-gray': '#2F2F2F',
          gray: '#808080',
          white: '#FFFFFF',
        },
        stream: {
          bg: '#0a0a0a',
          'bg-secondary': '#000000',
          'text-primary': '#FFFFFF',
          'text-secondary': '#B3B3B3',
          accent: '#E50914',
          'dark-gray': '#1a1a2e',
          black: '#060609',
          gray: '#4a4a5a',
        },
        gold: '#d4a853',
      },
      fontFamily: {
        sans: ['var(--font-netflix)', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'hero-gradient': 'linear-gradient(to top, #0a0a0a 0%, rgba(10,10,10,0.6) 40%, transparent 100%)',
        'hero-vignette': 'radial-gradient(ellipse at center, transparent 50%, #0a0a0a 100%)',
        'card-shine': 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, transparent 50%, rgba(255,255,255,0.02) 100%)',
        'cinematic-fade': 'linear-gradient(180deg, transparent 0%, #0a0a0a 100%)',
      },
      boxShadow: {
        'glow-red': '0 0 20px rgba(229, 9, 20, 0.3), 0 0 60px rgba(229, 9, 20, 0.1)',
        'glow-white': '0 0 15px rgba(255, 255, 255, 0.1)',
        'card': '0 8px 32px rgba(0, 0, 0, 0.6)',
        'card-hover': '0 16px 48px rgba(0, 0, 0, 0.8), 0 0 20px rgba(229, 9, 20, 0.15)',
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out',
        'fade-in-up': 'fadeInUp 0.7s ease-out',
        'fade-in-down': 'fadeInDown 0.5s ease-out',
        'slide-in-left': 'slideInLeft 0.6s ease-out',
        'slide-in-right': 'slideInRight 0.6s ease-out',
        'scale-in': 'scaleIn 0.4s ease-out',
        'shimmer': 'shimmer 2s infinite linear',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'cinema-pan': 'cinemaPan 25s ease-in-out infinite alternate',
        'gradient-shift': 'gradientShift 8s ease-in-out infinite',
        'title-reveal': 'titleReveal 1s ease-out',
        'hero-zoom': 'heroZoom 30s ease-in-out infinite alternate',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInDown: {
          '0%': { opacity: '0', transform: 'translateY(-20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-40px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(40px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 5px rgba(229, 9, 20, 0.2)' },
          '50%': { boxShadow: '0 0 25px rgba(229, 9, 20, 0.5), 0 0 50px rgba(229, 9, 20, 0.2)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        cinemaPan: {
          '0%': { transform: 'scale(1.1) translateX(-2%)' },
          '100%': { transform: 'scale(1.1) translateX(2%)' },
        },
        gradientShift: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        titleReveal: {
          '0%': { opacity: '0', transform: 'translateY(20px)', letterSpacing: '0.2em' },
          '100%': { opacity: '1', transform: 'translateY(0)', letterSpacing: 'normal' },
        },
        heroZoom: {
          '0%': { transform: 'scale(1)' },
          '100%': { transform: 'scale(1.08)' },
        },
      },
      transitionDuration: {
        '400': '400ms',
        '600': '600ms',
      },
    },
  },
  plugins: [],
};

export default config;
