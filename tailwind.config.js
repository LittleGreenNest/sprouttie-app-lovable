module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      colors: {
        sprouttie: {
          green: {
            DEFAULT: 'hsl(168, 85%, 65%)',
            light: 'hsl(168, 85%, 85%)',
            dark: 'hsl(168, 85%, 45%)',
          },
          beige: {
            DEFAULT: 'hsl(40, 40%, 92%)',
            dark: 'hsl(40, 40%, 85%)',
          },
          coral: {
            DEFAULT: 'hsl(15, 85%, 75%)',
            light: 'hsl(15, 85%, 85%)',
            dark: 'hsl(15, 85%, 65%)',
          },
          cream: 'hsl(45, 60%, 97%)',
          mint: 'hsl(168, 60%, 95%)',
        },
        green: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
        },
      },
      animation: {
        'bounce-leaf': 'bounce-leaf 2s ease-in-out infinite',
        'wave': 'wave 1.5s ease-in-out infinite',
        'grow-sprout': 'grow-sprout 0.6s ease-out forwards',
        'slide-in': 'slide-in 0.5s ease-out',
        'fade-in': 'fade-in 0.5s ease-out',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
      },
      keyframes: {
        'bounce-leaf': {
          '0%, 100%': { transform: 'translateY(0) rotate(0deg)' },
          '50%': { transform: 'translateY(-10px) rotate(5deg)' },
        },
        'wave': {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '25%': { transform: 'rotate(15deg)' },
          '75%': { transform: 'rotate(-15deg)' },
        },
        'grow-sprout': {
          '0%': { transform: 'scale(0.8) translateY(10px)', opacity: '0' },
          '100%': { transform: 'scale(1) translateY(0)', opacity: '1' },
        },
        'slide-in': {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(168, 217, 197, 0.5)' },
          '50%': { boxShadow: '0 0 40px rgba(168, 217, 197, 0.8)' },
        },
      },
    },
  },
  plugins: [],
}
