import type { Config } from "tailwindcss";

// POACH brand tokens.
// base #0A0A0B, ink #EDEDEF, muted #A1A1AA, accent #7C5CFF.
// Fonts: Space Grotesk (display) + DM Sans (body).
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        base: "#0A0A0B",
        ink: "#EDEDEF",
        muted: "#A1A1AA",
        accent: "#7C5CFF",
      },
      fontFamily: {
        display: ["var(--font-display)", "ui-sans-serif", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      borderRadius: {
        "2xl": "1rem",
      },
    },
  },
  plugins: [],
};

export default config;
