/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        sage: '#7D9B76',
        terracotta: '#C2714F',
        charcoal: '#2C2C2C',
        cream: '#f8f7f3',
      },
      boxShadow: {
        card: '0 14px 30px -18px rgba(44,44,44,0.30)',
      },
    },
  },
  plugins: [],
}
