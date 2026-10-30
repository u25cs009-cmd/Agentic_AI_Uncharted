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
        // VS Code Dark Modern - Core UI
        vsc: {
          editor:    '#1E1E1E',   // Main editor / page background
          sidebar:   '#252526',   // Sidebar background
          actbar:    '#333333',   // Activity bar
          tabbar:    '#2D2D2D',   // Tab bar / header
          panel:     '#1E1E1E',   // Bottom panel
          border:    '#454545',   // Default border
          'border-focus': '#0078D4', // Focused border
          fg:        '#CCCCCC',   // Default text
          'fg-dim':  '#858585',   // Dimmed / disabled text
          'fg-hi':   '#FFFFFF',   // Highlighted / active text
          accent:    '#0078D4',   // Accent blue (buttons, links)
          'accent-hover': '#1184DB',
          success:   '#2EA043',   // Green success
          error:     '#F85149',   // Red error
          warning:   '#CCA700',   // Yellow warning
          selection: '#264F78',   // Text selection background
          highlight: '#2A2D2E',   // Hovered item background
          // Dark+ Syntax colours
          'syn-var':   '#9CDCFE',   // Variables / parameters
          'syn-fn':    '#DCDCAA',   // Functions / methods
          'syn-kw':    '#C586C0',   // Keywords
          'syn-str':   '#CE9178',   // Strings
          'syn-num':   '#B5CEA8',   // Numbers
          'syn-type':  '#4EC9B0',   // Types / classes
          'syn-const': '#4FC1FF',   // Constants / enums
        }
      },
      fontFamily: {
        ui:   ['"Segoe UI"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['Consolas', '"Cascadia Code"', '"Fira Code"', 'monospace'],
      },
      fontSize: {
        'xxs': '0.65rem',
        'xs':  '0.75rem',
        'sm':  '0.8125rem',
        'base':'0.875rem',
      },
    },
  },
  plugins: [],
}
