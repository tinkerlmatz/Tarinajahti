/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Tarinajahti brand palette
        night: "#0D1B2A", // tausta (tumma yö)
        ocean: "#1E3A5F", // kortit, navBar
        gold: {
          DEFAULT: "#F4B942", // napit, korostukset, XP, ikonit
          dark: "#d99e2b",
          light: "#f7ca6b",
        },
        cream: "#F8F9FA", // teksti (vaalea)
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 24px 0 rgba(244, 185, 66, 0.35)",
        "glow-lg": "0 0 48px 0 rgba(244, 185, 66, 0.45)",
      },
      keyframes: {
        twinkle: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.6", transform: "scale(0.85)" },
        },
        "float-slow": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
      },
      animation: {
        twinkle: "twinkle 2.5s ease-in-out infinite",
        "float-slow": "float-slow 6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
