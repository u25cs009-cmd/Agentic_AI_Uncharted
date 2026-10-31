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
        // Premium White SaaS Theme (Peech AI / Linear / Stripe inspired)
        nebula: {
          bg: '#f8fafc',
          surface: '#ffffff',
          elevated: '#ffffff',
          border: 'rgba(226, 232, 240, 0.85)',
          cyan: '#0284c7',
          indigo: '#4f46e5',
          violet: '#7c3aed',
          emerald: '#059669',
          rose: '#e11d48',
          amber: '#d97706',
        },
        // Mapped legacy tokens for seamless backward compatibility with crisp light tones
        claude: {
          bg: '#f8fafc',
          sidebar: '#ffffff',
          surface: '#ffffff',
          elevated: '#ffffff',
          border: '#e2e8f0',
          'border-hi': '#cbd5e1',
          fg: '#0f172a',
          'fg-2': '#334155',
          'fg-3': '#64748b',
          accent: '#4f46e5',
          'accent-light': '#6366f1',
          'accent-bg': '#eef2ff',
          'accent-border': '#c7d2fe',
          success: '#059669',
          'success-bg': '#ecfdf5',
          danger: '#e11d48',
          'danger-bg': '#fff1f2',
          info: '#0284c7',
          'info-bg': '#f0f9ff',
          warning: '#d97706',
          'warning-bg': '#fffbeb',
        }
      },
      fontFamily: {
        sans: ['"Inter"', '"Outfit"', 'system-ui', '-apple-system', 'sans-serif'],
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
        'glow-cyan': '0 4px 20px -2px rgba(2, 132, 199, 0.15)',
        'glow-indigo': '0 4px 20px -2px rgba(79, 70, 229, 0.15)',
        'glow-emerald': '0 4px 20px -2px rgba(5, 150, 105, 0.15)',
        'glow-rose': '0 4px 20px -2px rgba(225, 29, 72, 0.15)',
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 10px 25px -5px rgba(0, 0, 0, 0.03)',
        'elevated': '0 4px 20px -2px rgba(0, 0, 0, 0.06), 0 2px 6px -1px rgba(0, 0, 0, 0.02)',
      },
    },
  },
  plugins: [],
}
