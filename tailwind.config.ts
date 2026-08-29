import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

/**
 * Tailwind config for Focus-List (Material Design 3 redesign).
 *
 * The active design-token system lives in `src/app/globals.css` as a
 * Tailwind 4 CSS-first `@theme inline` block (color/shape/typography/motion/
 * elevation tokens) plus `:root` / `.dark` value declarations. This file keeps
 * the legacy config compatible so any code that references the classic
 * color/border-radius helpers continues to resolve to the MD3 tokens.
 */
const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Resolved via CSS custom properties defined in globals.css
        // (legacy shadcn token bridges → MD3 roles). Tokens are hex/rgb
        // values, NOT hsl channel tuples — wrap with var() directly.
        background: "var(--md-background)",
        foreground: "var(--md-on-background)",
        app: "var(--md-background)",
        "foreground-strong": "var(--md-on-background)",
        "foreground-muted": "var(--md-on-surface-variant)",
        card: {
          DEFAULT: "var(--md-surface-container-low)",
          foreground: "var(--md-on-surface)",
        },
        popover: {
          DEFAULT: "var(--md-surface-container-high)",
          foreground: "var(--md-on-surface)",
        },
        primary: {
          DEFAULT: "var(--md-primary)",
          foreground: "var(--md-on-primary)",
        },
        secondary: {
          DEFAULT: "var(--md-secondary-container)",
          foreground: "var(--md-on-secondary-container)",
        },
        muted: {
          DEFAULT: "var(--md-surface-container)",
          foreground: "var(--md-on-surface-variant)",
        },
        accent: {
          DEFAULT: "var(--md-secondary-container)",
          foreground: "var(--md-on-secondary-container)",
        },
        destructive: {
          DEFAULT: "var(--md-error)",
          foreground: "var(--md-on-error)",
        },
        success: {
          DEFAULT: "var(--md-success)",
          foreground: "var(--md-on-success)",
        },
        warning: {
          DEFAULT: "var(--md-warning)",
          foreground: "var(--md-on-warning)",
        },
        info: {
          DEFAULT: "var(--md-info)",
          foreground: "var(--md-on-info)",
        },
        border: "var(--md-outline-variant)",
        input: "var(--md-outline-variant)",
        ring: "var(--md-primary)",
        chart: {
          "1": "var(--md-primary)",
          "2": "var(--md-success)",
          "3": "var(--md-warning)",
          "4": "var(--md-tertiary)",
          "5": "var(--md-error)",
        },
        sidebar: {
          DEFAULT: "var(--md-surface-container-low)",
          foreground: "var(--md-on-surface)",
          primary: "var(--md-primary)",
          "primary-foreground": "var(--md-on-primary)",
          accent: "var(--md-secondary-container)",
          "accent-foreground": "var(--md-on-secondary-container)",
          border: "var(--md-outline-variant)",
          ring: "var(--md-primary)",
        },
      },
      borderRadius: {
        // Derived from MD3 base radius (12px) — utilities: rounded-sm/md/lg/xl
        xs: "4px",
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "28px",
      },
      fontFamily: {
        sans: "var(--font-sans)",
        mono: "var(--font-mono)",
      },
      boxShadow: {
        // MD3 elevation 0..5 — utilities: shadow-e0..shadow-e5
        e0: "none",
        e1: "var(--shadow-e1)",
        e2: "var(--shadow-e2)",
        e3: "var(--shadow-e3)",
        e4: "var(--shadow-e4)",
        e5: "var(--shadow-e5)",
      },
      transitionTimingFunction: {
        "md-standard": "var(--ease-standard)",
        "md-emphasized": "var(--ease-emphasized)",
        "md-decelerated": "var(--ease-decelerated)",
      },
      transitionDuration: {
        "md-short": "var(--duration-short)",
        "md-medium": "var(--duration-medium)",
        "md-long": "var(--duration-long)",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};
export default config;
