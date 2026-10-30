/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Claude-inspired warm dark palette
        claude: {
          bg:        '#1a1a1a',   // Main background — warm near-black
          sidebar:   '#1e1e1e',   // Sidebar — slightly lighter
          surface:   '#262626',   // Cards / panels
          elevated:  '#2f2f2f',   // Elevated surfaces / hover
          border:    '#383838',   // Subtle border
          'border-hi':'#4a4a4a', // Highlighted border
          fg:        '#ececec',   // Primary text
          'fg-2':    '#b4b4b4',   // Secondary text
          'fg-3':    '#737373',   // Muted text
          accent:    '#cc8b3c',   // Warm amber/sand — Claude's signature
          'accent-light':'#e8a84e',
          'accent-bg':  'rgba(204,139,60,0.12)',
          'accent-border':'rgba(204,139,60,0.3)',
          success:   '#4caf7d',
          'success-bg':'rgba(76,175,125,0.12)',
          danger:    '#e05c5c',
          'danger-bg': 'rgba(224,92,92,0.12)',
          info:      '#7b9feb',
          'info-bg': 'rgba(123,159,235,0.12)',
          warning:   '#d4a843',
          'warning-bg':'rgba(212,168,67,0.12)',
        }
      },
      fontFamily: {
        sans: ['"Inter"', '"Söhne"', '"ui-sans-serif"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"ui-monospace"', 'SFMono-Regular', 'monospace'],
      },
      borderRadius: {
        sm:  '6px',
        DEFAULT: '8px',
        lg: '12px',
        xl: '16px',
        '2xl': '20px',
      },
      boxShadow: {
        'soft':   '0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)',
        'card':   '0 4px 16px rgba(0,0,0,0.35)',
        'accent': '0 0 0 2px rgba(204,139,60,0.4)',
      },
    },
  },
  plugins: [],
}
