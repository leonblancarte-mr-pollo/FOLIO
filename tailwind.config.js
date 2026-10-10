/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  // hover: solo en dispositivos con mouse (@media (hover: hover) and (pointer: fine)), para que en
  // celular no se queden "pegados" al tocar (PWA). 2026-10-10.
  future: {
    hoverOnlyWhenSupported: true,
  },
  theme: {
    extend: {},
  },
  plugins: [],
}
