/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#faf7f2',
          100: '#f0ead5',
          400: '#c9a84c',
          600: '#a07c28',
          900: '#3d2e08',
        },
        sage: {
          400: '#4a6741',
          600: '#2e4a28',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}