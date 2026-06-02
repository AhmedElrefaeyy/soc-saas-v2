import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Design tokens → CSS variables
        "bg-base":     "var(--bg-base)",
        "bg-surface":  "var(--bg-surface)",
        "bg-elevated": "var(--bg-elevated)",
        "bg-subtle":   "var(--bg-subtle)",
        "bg-overlay":  "var(--bg-overlay)",

        border:          "var(--border)",
        "border-strong": "var(--border-strong)",
        "border-subtle": "var(--border-subtle)",
        "border-active": "var(--border-active)",
        "border-cyan":   "var(--border-cyan)",

        "text-primary":   "var(--text-primary)",
        "text-secondary": "var(--text-secondary)",
        "text-muted":     "var(--text-muted)",

        accent:       "var(--accent)",
        "accent-hover": "var(--accent-hover)",

        severity: {
          critical: "var(--severity-critical)",
          high:     "var(--severity-high)",
          medium:   "var(--severity-medium)",
          low:      "var(--severity-low)",
          info:     "var(--severity-info)",
        },

        status: {
          online:   "var(--status-online)",
          offline:  "var(--status-offline)",
          degraded: "var(--status-degraded)",
          unknown:  "var(--status-unknown)",
        },

        // Neural Purple
        neural: {
          400: "#A78BFA",
          500: "#8B5CF6",
          600: "#7C3AED",
          900: "#1E1040",
        },

        // Cyber Cyan
        cyber: {
          400: "#22D3EE",
          500: "#06B6D4",
          900: "#0C2A30",
        },

        // Base blacks
        base: {
          950: "#04040A",
          900: "#080810",
          800: "#0E0E1C",
          700: "#161628",
        },
      },

      fontFamily: {
        sans:    ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["Space Grotesk", "Inter", "sans-serif"],
        mono:    ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },

      fontSize: {
        "2xs": ["0.625rem",  { lineHeight: "0.875rem" }],
        xs:    ["0.75rem",   { lineHeight: "1rem" }],
        sm:    ["0.8125rem", { lineHeight: "1.25rem" }],
        base:  ["0.875rem",  { lineHeight: "1.375rem" }],
        lg:    ["1rem",      { lineHeight: "1.5rem" }],
        xl:    ["1.125rem",  { lineHeight: "1.625rem" }],
        "2xl": ["1.25rem",   { lineHeight: "1.75rem" }],
        "3xl": ["1.5rem",    { lineHeight: "2rem" }],
        "4xl": ["1.75rem",   { lineHeight: "2.25rem" }],
      },

      borderRadius: {
        sm:      "0.25rem",
        DEFAULT: "0.375rem",
        md:      "0.375rem",
        lg:      "0.5rem",
        xl:      "0.75rem",
        "2xl":   "1rem",
      },

      animation: {
        "fade-in":        "fadeIn 0.15s ease-out",
        "slide-in-right": "slideInRight 0.2s ease-out",
        "slide-out-right":"slideOutRight 0.2s ease-in",
        "pulse-subtle":   "pulseSubtle 2s ease-in-out infinite",
        "neural-pulse":   "neural-pulse 3s ease-in-out infinite",
        "float":          "float 4s ease-in-out infinite",
        "pulse-dot":      "pulse-dot 2s infinite",
      },

      keyframes: {
        fadeIn:        { from: { opacity: "0" }, to: { opacity: "1" } },
        slideInRight:  { from: { transform: "translateX(100%)", opacity: "0" }, to: { transform: "translateX(0)", opacity: "1" } },
        slideOutRight: { from: { transform: "translateX(0)", opacity: "1" },    to: { transform: "translateX(100%)", opacity: "0" } },
        pulseSubtle:   { "0%, 100%": { opacity: "1" }, "50%": { opacity: "0.6" } },
        "neural-pulse":{ "0%, 100%": { opacity: "0.6", transform: "scale(1)" }, "50%": { opacity: "1", transform: "scale(1.05)" } },
        float:         { "0%, 100%": { transform: "translateY(0px)" }, "50%": { transform: "translateY(-6px)" } },
        "pulse-dot":   { "0%, 100%": { opacity: "1" }, "50%": { opacity: "0.4" } },
      },

      boxShadow: {
        card:            "0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.4)",
        elevated:        "0 4px 12px rgba(0,0,0,0.5)",
        panel:           "0 8px 32px rgba(0,0,0,0.6)",
        "glow-purple":   "0 0 20px rgba(139,92,246,0.3)",
        "glow-cyan":     "0 0 20px rgba(6,182,212,0.3)",
        "glow-danger":   "0 0 20px rgba(248,113,113,0.3)",
        "glow-accent":   "0 0 12px rgba(139,92,246,0.2)",
        "glow-critical": "0 0 12px rgba(248,113,113,0.2)",
      },
    },
  },
  plugins: [],
};

export default config;
