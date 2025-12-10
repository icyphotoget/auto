/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./calculator.html",
    "./app.js"
  ],
  theme: {
    extend: {
      colors: {
        bg: "#020617",
        card: "#0f172a"
      }
    }
  },
  plugins: []
};
