/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Primary brand colour: navy blue. Used for headers, primary
        // (non-emergency) buttons, headings and table headers.
        navy: {
          DEFAULT: "#14264a",
          50: "#f1f5fb",
          100: "#dde6f3",
          200: "#bccbe4",
          300: "#93a9cf",
          400: "#6482b4",
          500: "#3f5f96",
          600: "#2d4879",
          700: "#223a64",
          800: "#182c50",
          900: "#0f1f3d",
        },
        // Reserved for emergency actions only (SOS button, send request,
        // critical status). Unchanged from the original config.
        emergency: {
          DEFAULT: "#dc2626", // red-600 — used for the main SOS button
          dark: "#991b1b",
        },
      },
    },
  },
  plugins: [],
}