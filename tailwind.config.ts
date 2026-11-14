import type { Config } from "tailwindcss";

const CINZEL_STACK = ['"Cinzel"', "Georgia", "serif"];
const SORA_STACK = [
  '"Sora Variable"',
  '"Sora"',
  "system-ui",
  "-apple-system",
  "sans-serif",
];

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        space: {
          start: "var(--bg-space-start)",
          mid: "var(--bg-space-mid)",
          end: "var(--bg-space-end)",
        },
        pastel: {
          lavender: "var(--accent-lavender)",
          peach: "var(--accent-peach)",
          mint: "var(--accent-mint)",
          sky: "var(--accent-sky)",
          pink: "var(--accent-pink)",
        },
        infrared: {
          start: "var(--ir-start)",
          end: "var(--ir-end)",
        },
        cosmic: {
          text: "var(--text-main)",
          muted: "var(--text-muted)",
        },
      },
      fontFamily: {
        sans: SORA_STACK,
        serif: CINZEL_STACK,
        heading: CINZEL_STACK,
        display: CINZEL_STACK,
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          '"Liberation Mono"',
          '"Courier New"',
          "monospace",
        ],
      },
      fontSize: {
        xs: ["0.875rem", { lineHeight: "1.45" }],
        sm: ["0.9375rem", { lineHeight: "1.5" }],
        base: ["1.125rem", { lineHeight: "1.6" }],
      },
      backgroundImage: {
        "deep-space":
          "linear-gradient(135deg, var(--bg-space-start) 0%, var(--bg-space-mid) 50%, var(--bg-space-end) 100%)",
        "infrared-gradient":
          "linear-gradient(90deg, var(--ir-start) 0%, var(--ir-end) 100%)",
        "pastel-gradient":
          "linear-gradient(90deg, var(--accent-lavender) 0%, var(--accent-peach) 50%, var(--accent-sky) 100%)",
      },
      boxShadow: {
        "glass-glow":
          "0 8px 32px -4px rgba(195, 177, 225, 0.16), 0 0 24px -6px rgba(162, 210, 255, 0.18)",
        "infrared-glow": "0 8px 30px -4px rgba(255, 138, 101, 0.28)",
      },
    },
  },
  plugins: [],
};

export default config;
