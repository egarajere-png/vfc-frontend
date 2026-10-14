/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Victory Faith Church brand colours
        gold: { DEFAULT: '#B1890C', 50: '#fbf6e5', 100: '#f5ebc4', 200: '#ead68c', 300: '#dcbd55', 400: '#c9a022', 500: '#B1890C', 600: '#9a760a', 700: '#7d5e08', 800: '#5f4706', 900: '#413104' },
        olive: { DEFAULT: '#779324', 50: '#f3f7e6', 100: '#e4edc6', 200: '#cbdc95', 300: '#adc460', 400: '#91ab3b', 500: '#779324', 600: '#667f1e', 700: '#516418', 800: '#3d4a14', 900: '#2b3410' },
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        display: ['ui-serif', 'Georgia', 'Cambria', 'Times New Roman', 'serif'],
      },
    },
  },
  plugins: [],
};
