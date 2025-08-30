/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}',
    './src/**/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          700: '#5A3E36', // cacao
          500: '#7B4A2E',
          300: '#D4A373', // caramelo
        },
        gold: '#C4A062',
        mint: '#A8D5BA',
        neutral: {
          900: '#111827',
          500: '#6B7280',
          50: '#F8F5F2',
        },
        success: '#16A34A',
        danger: '#DC2626',
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.25rem',
        'card': '14px',
      },
      boxShadow: {
        'soft': '0 1px 2px rgba(0,0,0,0.04), 0 6px 18px rgba(0,0,0,0.06)',
        'lg-soft': '0 8px 24px rgba(0,0,0,0.10)',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'ui-sans-serif', 'system-ui'],
        serif: ['var(--font-playfair)', 'Playfair Display', 'ui-serif'],
      },
      transitionDuration: {
        150: '150ms',
        200: '200ms',
      }
    },
  },
  plugins: [],
};
