import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Montserrat",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      colors: {
        v12: {
          // Brand primary (from portal)
          orange: "#F3701E",
          "orange-dark": "#D9620E",
          "orange-darker": "#B84F09",
          "orange-light": "#FFE8D5",
          "orange-soft": "#FFF4EA",
          navy: "#173B61",
          "navy-dark": "#0F2942",
          "navy-darker": "#091729",
          "navy-light": "#2C5A86",
          "navy-soft": "#E9EEF4",
          beige: "#E8D8C9",
          "beige-soft": "#F4ECE3",

          // Neutrals
          ink: "#0B1020",
          "ink-soft": "#1F2937",
          muted: "#64748B",
          "muted-light": "#94A3B8",
          line: "#E5E7EB",
          "line-soft": "#F1F3F5",
          bg: "#F8F9FB",
          "bg-tint": "#F2F4F7",
          surface: "#FFFFFF",

          // Semantic
          "good-bg": "#ECFDF5",
          good: "#059669",
          "good-dark": "#047857",
          "warn-bg": "#FFFBEB",
          warn: "#B45309",
          "bad-bg": "#FEF2F2",
          bad: "#B91C1C",
          "info-bg": "#EFF6FF",
          info: "#1D4ED8",
        },
      },
      backgroundImage: {
        "brand-gradient":
          "linear-gradient(135deg, #173B61 0%, #F3701E 100%)",
        "brand-gradient-soft":
          "linear-gradient(135deg, rgba(23,59,97,0.04) 0%, rgba(243,112,30,0.06) 100%)",
        "navy-gradient":
          "linear-gradient(135deg, #173B61 0%, #2C5A86 100%)",
        "orange-gradient":
          "linear-gradient(135deg, #F3701E 0%, #D9620E 100%)",
        "dot-grid":
          "radial-gradient(circle at 1px 1px, rgba(15,41,66,0.08) 1px, transparent 0)",
      },
      boxShadow: {
        card: "0 1px 2px rgb(15 41 66 / 0.04), 0 1px 3px rgb(15 41 66 / 0.05)",
        "card-hover":
          "0 2px 4px rgb(15 41 66 / 0.06), 0 6px 16px -4px rgb(15 41 66 / 0.12)",
        pop: "0 10px 30px -12px rgb(23 59 97 / 0.25)",
        "glow-orange":
          "0 0 0 3px rgba(243,112,30,0.12), 0 4px 14px -2px rgba(243,112,30,0.28)",
        "glow-navy":
          "0 0 0 3px rgba(23,59,97,0.12), 0 4px 14px -2px rgba(23,59,97,0.28)",
        inset: "inset 0 1px 0 rgb(255 255 255 / 0.08)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pop-in": {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "slide-in-right": {
          "0%": { opacity: "0", transform: "translateX(24px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        glow: {
          "0%, 100%": { boxShadow: "0 0 8px rgba(243,112,30,.15)" },
          "50%": { boxShadow: "0 0 20px rgba(243,112,30,.35)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "fade-in": "fade-in 160ms ease-out",
        "fade-up": "fade-up 220ms cubic-bezier(0.16, 1, 0.3, 1)",
        "pop-in": "pop-in 180ms cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-in-right":
          "slide-in-right 260ms cubic-bezier(0.16, 1, 0.3, 1)",
        glow: "glow 2s ease-in-out infinite",
        shimmer: "shimmer 1.8s linear infinite",
      },
      transitionTimingFunction: {
        "v12-out": "cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
