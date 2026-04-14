import type { Config } from "tailwindcss"

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["-apple-system", "BlinkMacSystemFont", "\"SF Pro Text\"", "\"Helvetica Neue\"", "sans-serif"],
        serif: ["\"Iowan Old Style\"", "\"Source Serif 4\"", "\"Songti SC\"", "serif"]
      },
      boxShadow: {
        panel: "0 30px 80px rgba(3, 7, 18, 0.42)",
        soft: "0 18px 44px rgba(15, 23, 42, 0.18)"
      },
      borderRadius: {
        shell: "32px"
      },
      colors: {
        board: {
          bg: "var(--board-bg)",
          panel: "var(--board-panel)",
          panelSoft: "var(--board-panel-soft)",
          line: "var(--board-line)",
          text: "var(--board-text)",
          muted: "var(--board-muted)",
          accent: "var(--board-accent)",
          accentSoft: "var(--board-accent-soft)",
          warm: "var(--board-warm)"
        }
      }
    }
  },
  plugins: []
}

export default config

