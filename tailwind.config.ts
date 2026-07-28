import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1d1d1f",      // Apple near-black
        subtle: "#86868b",   // secondary text
        hair: "#e8e8ed",     // hairline borders
        canvas: "#ffffff",
        mist: "#f5f5f7",     // soft gray sections
        accent: "#0A84FF",   // iOS blue
        accent2: "#5E5CE6",  // iOS indigo
        good: "#30D158",     // iOS green
        warn: "#FF9F0A",     // iOS amber
      },
      fontFamily: {
        sans: [
          "-apple-system", "BlinkMacSystemFont", '"SF Pro Display"',
          '"SF Pro Text"', "Inter", "system-ui", "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 1px 2px rgba(0,0,0,0.04), 0 12px 40px rgba(0,0,0,0.06)",
        float: "0 10px 70px rgba(0,0,0,0.09)",
        glow: "0 0 0 1px rgba(10,132,255,0.12), 0 10px 40px rgba(10,132,255,0.10)",
      },
      borderRadius: { "4xl": "2rem", "5xl": "2.5rem" },
      keyframes: {
        shimmer: { "100%": { transform: "translateX(100%)" } },
      },
      animation: { shimmer: "shimmer 1.6s infinite" },
    },
  },
  plugins: [],
};

export default config;
