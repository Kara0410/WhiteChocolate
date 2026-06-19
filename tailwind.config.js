/** @type {import('tailwindcss').Config} */
module.exports = {
  // Scan every source file so Tailwind only ships the classes that are actually used.
  content: ['./src/**/*.{js,jsx,ts,tsx}'],

  // NativeWind's preset wires Tailwind into React Native's style system.
  presets: [require('nativewind/preset')],

  theme: {
    extend: {
      colors: {
        // Legacy dark palette (kept for backward-compat with remaining dark screens)
        surface:  '#25292e',
        elevated: '#2d3238',
        sunken:   '#1e2227',
        gold:     '#ffd33d',
        // ParkMunich light palette
        pm: {
          bg:      '#F7F8FC',
          card:    '#FFFFFF',
          text:    '#101828',
          muted:   '#667085',
          border:  '#D9E0EA',
          accent:  '#007AFF',
          success: '#34C759',
          warning: '#FF9F0A',
          danger:  '#D92D20',
        },
      },
    },
  },

  plugins: [],
};
