/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'acic-primary': '#7F1618',
        'acic-accent': '#ECBD1E', 
        'acic-secondary': '#BE4A8B',
        'acic-bg': '#FAFAFB',
        'acic-border': '#E7D5D6',
        'text-strong': '#111827',
        'text-medium': '#4B5563',
        'text-light': '#6B7280',
      },
      fontFamily: {
        'inter': ['Inter', 'sans-serif'],
        'playfair': ['Playfair Display', 'serif'],
      },
    },
  },
  plugins: [],
}