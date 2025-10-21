// tailwind.config.js
module.exports = {
  content: [
    "index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'dark-bg': '#0F1420',
        'gradient-start': '#00FFA3',
        'gradient-end': '#7B68EE',
      },
      backgroundImage: {
        'gradient-login': 'linear-gradient(to right, #00FFA3, #7B68EE)',
      },
    },
  },
  plugins: [],
}