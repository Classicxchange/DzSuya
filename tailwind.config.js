/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        coal: { 950: '#100C0A', 900: '#16110E', 800: '#1F1813', 700: '#2A211A', 600: '#3A2E25' },
        cream: { 50: '#FFF8EC', 100: '#F6EAD7', 200: '#E9D6B8', 300: '#C9B394' },
        ember: { 400: '#FF8A3D', 500: '#F26B1D', 600: '#D9540B', 700: '#B13F08' },
        chili: { 500: '#E2402A', 600: '#C22F1B' },
        gold: { 300: '#F2CE7B', 400: '#E8B04A', 500: '#D69A2D' },
        leaf: { 400: '#6FCF8E', 500: '#3FB26A' },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'ui-sans-serif', 'sans-serif'],
        sans: ['"DM Sans"', 'ui-sans-serif', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'Menlo', 'monospace'],
      },
      boxShadow: {
        glow: '0 10px 40px -10px rgba(242,107,29,0.55)',
        card: '0 1px 0 rgba(255,255,255,0.04) inset, 0 12px 30px -16px rgba(0,0,0,0.7)',
      },
      keyframes: {
        flicker: {
          '0%,100%': { transform: 'scaleY(1) rotate(-1deg)', opacity: '1' },
          '50%': { transform: 'scaleY(1.08) rotate(1deg)', opacity: '0.9' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        flicker: 'flicker 1.6s ease-in-out infinite',
        shimmer: 'shimmer 2.4s linear infinite',
      },
    },
  },
  plugins: [],
}
