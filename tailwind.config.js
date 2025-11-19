/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          light: '#0FA3A3',
          dark: '#0d8a8a',
        },
        destructive: {
          light: '#FF6B61',
          dark: '#e55a50',
        },
      },
    },
  },
  plugins: [],
}

