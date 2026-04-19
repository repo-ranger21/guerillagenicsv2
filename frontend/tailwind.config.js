/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Background layers
        "bg-void":    "#080808",
        "bg-surface": "#0d0d0d",
        "bg-raised":  "#111111",
        "bg-overlay": "#161616",
        // Borders
        "border-default": "#1e1e1e",
        "border-dim":     "#141414",
        "border-active":  "#333333",
        // Text
        "text-primary":   "#e8e8e8",
        "text-secondary": "#999999",
        "text-muted":     "#555555",
        "text-ghost":     "#2a2a2a",
        // Signal tiers
        "signal-needle": "#84ff47",
        "signal-lock":   "#34d399",
        "signal-lean":   "#f59e0b",
        "signal-watch":  "#555555",
        "signal-fade":   "#ef4444",
        // Data
        "data-positive": "#84ff47",
        "data-negative": "#ef4444",
        // Brand
        "gg-green-400": "#a3ff6e",
        "gg-green-500": "#84ff47",
      },
      fontFamily: {
        display: ["Bebas Neue", "Impact", "sans-serif"],
        mono:    ["DM Mono", "Fira Code", "monospace"],
        sans:    ["Inter", "system-ui", "sans-serif"],
      },
      animation: {
        "needle-pulse": "needlePulse 2s ease-in-out infinite",
        "pulse-glow":   "pulseGlow 2s ease-in-out infinite",
        "fade-in":      "fadeIn 0.2s ease-out",
        "slide-up":     "slideUp 0.25s ease-out",
      },
      keyframes: {
        needlePulse: {
          "0%, 100%": { opacity: "1" },
          "50%":      { opacity: "0.3" },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 8px rgba(132,255,71,0.3)" },
          "50%":      { boxShadow: "0 0 24px rgba(132,255,71,0.7)" },
        },
        fadeIn: {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%":   { transform: "translateY(6px)", opacity: "0" },
          "100%": { transform: "translateY(0)",   opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
