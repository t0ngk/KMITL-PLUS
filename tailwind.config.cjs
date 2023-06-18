/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{html,js,svelte,ts}",
  ],
  theme: {
    extend: {},
    fontFamily: {
      prompt: ["Prompt", "sans-serif"],
    }
  },
  plugins: [],
}
