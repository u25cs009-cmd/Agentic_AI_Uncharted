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
        // Celestial Nebula & Aurora Theme Palette (Gemini + Copilot inspired)
        nebula: {
          bg: '#07090e',
          surface: '#0d1321',
          elevated: '#11192d',
          border: 'rgba(56, 189, 248, 0.14)',
          cyan: '#06b6d4',
          indigo: '#6366f1',
          violet: '#8b5cf6',
          emerald: '#10b981',
          rose: '#f43f5e',
          amber: '#f59e0b',
        },
        // Mapped legacy tokens for seamless backward compatibility with vibrant tones
        claude: {
          bg: '#07090e',
          sidebar: '#0a0e1a',
          surface: '#0d1321',
          elevated: '#11192d',
          border: 'rgba(56, 189, 248, 0.14)',
          'border-hi': 'rgba(56, 189, 248, 0.35)',
          fg: '#f8fafc',
          'fg-2': '#cbd5e1',
          'fg-3': '#94a3b8',
          accent: '#06b6d4',
          'accent-light': '#38bdf8',
          'accent-bg': 'rgba(6, 182, 212, 0.12)',
          'accent-border': 'rgba(6, 182, 212, 0.35)',
          success: '#10b981',
          'success-bg': 'rgba(16, 185, 129, 0.12)',
          danger: '#f43f5e',
          'danger-bg': 'rgba(244, 63, 94, 0.12)',
          info: '#6366f1',
          'info-bg': 'rgba(99, 102, 241, 0.12)',
          warning: '#f59e0b',
          'warning-bg': 'rgba(245, 158, 11, 0.12)',
        }
      },
      fontFamily: {
        sans: ['"Inter"', '"Outfit"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"ui-monospace"', 'monospace'],
      },
      borderRadius: {
        sm: '6px',
        DEFAULT: '8px',
        lg: '12px',
        xl: '16px',
        '2xl': '20px',
        '3xl': '24px',
      },
      boxShadow: {
        'glow-cyan': '0 0 25px rgba(6, 182, 212, 0.25)',
        'glow-indigo': '0 0 25px rgba(99, 102, 241, 0.25)',
        'glow-emerald': '0 0 25px rgba(16, 185, 129, 0.25)',
        'glow-rose': '0 0 25px rgba(244, 63, 94, 0.25)',
        'card': '0 8px 32px 0 rgba(0, 0, 0, 0.45)',
      },
    },
  },
  plugins: [],
}
