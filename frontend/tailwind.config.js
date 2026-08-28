/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    fontFamily: {
      sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
    },
    extend: {
      colors: {
        apex: {
          primary: '#2D3EFF',
          'primary-hover': '#2432CC',
          'primary-light': '#EEF0FF',
          heading: '#0F172A',
          body: '#64748B',
          surface: '#F8FAFC',
          border: '#E2E8F0',
          muted: '#94A3B8',
        },
        gym: {
          dark: '#F8FAFC',
          card: '#FFFFFF',
          border: '#E2E8F0',
          neon: '#2D3EFF',
          neonHover: '#2432CC',
          muted: '#64748B',
        },
      },
      borderRadius: {
        btn: '14px',
        card: '16px',
        pill: '9999px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(15, 23, 42, 0.06), 0 8px 24px rgba(15, 23, 42, 0.04)',
        'card-hover': '0 4px 12px rgba(45, 62, 255, 0.08), 0 16px 40px rgba(15, 23, 42, 0.06)',
        btn: '0 4px 14px rgba(45, 62, 255, 0.28)',
        'btn-hover': '0 8px 24px rgba(45, 62, 255, 0.35)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards',
        'fade-in-up': 'fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'float-slow': 'floatSlow 8s ease-in-out infinite',
        'float-slower': 'floatSlow 12s ease-in-out infinite reverse',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        floatSlow: {
          '0%, 100%': { transform: 'translateY(0) scale(1)' },
          '50%': { transform: 'translateY(-12px) scale(1.03)' },
        },
      },
    },
  },
  plugins: [],
};
