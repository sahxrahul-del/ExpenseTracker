/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx}", "./src/**/*.{js,jsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#14b8a6",
        "primary-dark": "#0d9488",
        income: "#10b981",
        expense: "#ef4444",
        warning: "#f59e0b",
        "text-dark": "#111827",
        "text-light": "#6b7280",
        "border-gray": "#e5e7eb",
        "card-bg": "#f9fafb",
      },
    },
  },
  plugins: [],
};
