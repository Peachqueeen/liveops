import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        peach: {
          50: "#fff5f0",
          100: "#ffe8d9",
          200: "#ffc9a8",
          300: "#ffa377",
          400: "#ff7a45",
          500: "#ff5722",
          600: "#e64a19",
          700: "#bf3c15",
          800: "#8c2c0f",
          900: "#591c0a",
        },
      },
    },
  },
  plugins: [],
};

export default config;
