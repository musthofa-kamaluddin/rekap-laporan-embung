/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#09090b',
        surface: '#121214',
        border: '#27272a',
        'border-subtle': 'rgba(255, 255, 255, 0.08)',
        muted: '#71717a',
        foreground: '#fafafa',
        primary: {
          DEFAULT: '#3b82f6',
          hover: '#2563eb'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace']
      }
    },
  },
  plugins: [],
}
