/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        eg: { paper: '#F4F6F4', ink: '#10211F', muted: '#465956', line: '#D6DFDC', teal: '#14625C', 'teal-dark': '#0E4743', tint: '#E3EEEB', sos: '#B42318' },
        elder: { bg: '#0F172A', primary: '#0284C7', accent: '#F59E0B', emergency: '#EF4444' },
        caregiver: { bg: '#064E3B', primary: '#10B981', accent: '#34D399' },
        doctor: { bg: '#1E3A8A', primary: '#2563EB', accent: '#06B6D4' },
        hospital: { bg: '#4C1D95', primary: '#7C3AED', accent: '#F59E0B' },
        pharmacy: { bg: '#78350F', primary: '#D97706', accent: '#FBBF24' }
      },
    },
  },
  plugins: [],
}
