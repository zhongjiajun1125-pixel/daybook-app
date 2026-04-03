import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "\"SF Pro Text\"",
          "\"Helvetica Neue\"",
          "sans-serif"
        ],
        serif: [
          "\"New York\"",
          "\"Songti SC\"",
          "\"Source Serif 4\"",
          "serif"
        ]
      },
      boxShadow: {
        shell: "0 18px 48px rgba(15, 23, 42, 0.08)",
        pane: "0 10px 24px rgba(15, 23, 42, 0.05)",
        dock: "0 16px 30px rgba(15, 23, 42, 0.08)"
      },
      borderRadius: {
        shell: "28px",
        pane: "24px",
        dock: "999px"
      },
      colors: {
        trace: {
          bg: "var(--trace-bg)",
          panel: "var(--trace-panel)",
          panelSoft: "var(--trace-panel-soft)",
          line: "var(--trace-line)",
          text: "var(--trace-text)",
          sub: "var(--trace-sub)",
          ghost: "var(--trace-ghost)",
          accent: "var(--trace-accent)"
        }
      },
      transitionTimingFunction: {
        trace: "cubic-bezier(0.16, 1, 0.3, 1)"
      }
    }
  },
  plugins: []
};

export default config;
