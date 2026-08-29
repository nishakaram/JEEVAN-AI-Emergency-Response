/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        emergency: {
          DEFAULT: "#dc2626", // red-600 — used for the main SOS button
          dark: "#991b1b",
        },
      },
    },
  },
  plugins: [],
}
