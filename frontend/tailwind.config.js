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
        // Deep Charcoal + Emerald — custom dark theme
        app: {
          bg:        '#0C0C0C',   // page background — near-black
          surface:   '#141414',   // sidebar, cards
          elevated:  '#1C1C1C',   // elevated panels, dropdowns
          panel:     '#111111',   // secondary panels
          border:    '#2A2A2A',   // subtle borders
          'border-hi': '#404040', // hover borders
          fg:        '#E5E5E5',   // primary text
          'fg-muted':'#737373',   // secondary / dimmed text
          'fg-faint':'#404040',   // very dim labels
          accent:    '#10B981',   // emerald green — primary accent
          'accent-hi':'#34D399',  // lighter emerald on hover
          'accent-bg':'#10B98115',// tinted bg for accent elements
          danger:    '#EF4444',   // red
          'danger-bg':'#EF444415',
          warning:   '#F59E0B',   // amber
          'warning-bg':'#F59E0B15',
          info:      '#6366F1',   // indigo for informational
          'info-bg': '#6366F115',
          success:   '#22C55E',
          'success-bg':'#22C55E15',
        }
      },
      fontFamily: {
        sans: ['"Inter"', '"Segoe UI"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'Consolas', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '6px',
        sm: '4px',
        lg: '8px',
        xl: '12px',
      },
      animation: {
        'fade-in': 'fadeIn 0.15s ease-out',
        'slide-up': 'slideUp 0.2s ease-out',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(4px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      }
    },
  },
  plugins: [],
}
