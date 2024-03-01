/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    borderRadius: {
      none: "0",
      DEFAULT: "0",
      sm: "1px",
      md: "2px",
    },
    extend: {
      colors: {
        bg: "rgb(var(--bg) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        border: "rgb(var(--border) / <alpha-value>)",
        accent: "rgb(var(--accent) / <alpha-value>)",
        text: "rgb(var(--text) / <alpha-value>)",
        titlebar: "rgb(var(--titlebar) / <alpha-value>)",
      },
      fontFamily: {
        sans: ['"Segoe UI"', "Tahoma", "Geneva", "Verdana", "system-ui", "sans-serif"],
        mono: ['"Consolas"', '"Lucida Console"', "Menlo", "monospace"],
      },
      fontSize: {
        xxs: "0.6875rem",
      },
    },
  },
  plugins: [],
};
