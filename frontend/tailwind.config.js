/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "#004D38",
          foreground: "#FFFFFF",
          50: "#E6F2EE",
          100: "#CCE5DE",
          200: "#99CBBD",
          300: "#66B19C",
          400: "#33977B",
          500: "#004D38",
          600: "#003E2D",
          700: "#002E22",
          800: "#001F17",
          900: "#000F0B",
        },
        secondary: {
          DEFAULT: "#C5A059",
          foreground: "#1A1A1A",
          50: "#FAF6ED",
          100: "#F5EDDB",
          200: "#EBDBB7",
          300: "#E1C993",
          400: "#D7B76F",
          500: "#C5A059",
          600: "#A68544",
          700: "#7D6333",
          800: "#544222",
          900: "#2B2111",
        },
        destructive: {
          DEFAULT: "#991B1B",
          foreground: "#FFFFFF",
        },
        muted: {
          DEFAULT: "#F0F0E8",
          foreground: "#64748B",
        },
        accent: {
          DEFAULT: "#E6D5B8",
          foreground: "#2C3E50",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      fontFamily: {
        cairo: ['Cairo', 'sans-serif'],
        tajawal: ['Tajawal', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(0, 77, 56, 0.05)',
        'glow': '0 0 15px rgba(197, 160, 89, 0.3)',
        'card': '0 2px 8px -2px rgba(0, 0, 0, 0.08)',
        'card-hover': '0 8px 24px -4px rgba(0, 0, 0, 0.12)',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
