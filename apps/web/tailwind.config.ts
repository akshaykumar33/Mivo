import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: {
          canvas: '#0B0E14',
          surface0: '#0F131C',
          surface1: '#151A26',
          surface2: '#1C2232',
          surface3: '#252D42',
        },
        accent: {
          primary: '#7C3AED',
          primaryHover: '#9061F9',
          cyan: '#06B6D4',
          emerald: '#10B981',
          amber: '#F59E0B',
          rose: '#F43F5E',
        },
        border: {
          subtle: '#1E293B',
          glass: 'rgba(255, 255, 255, 0.08)',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'system-ui',
          'sans-serif',
        ],
        display: [
          '"Plus Jakarta Sans"',
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'system-ui',
          'sans-serif',
        ],
        mono: [
          '"JetBrains Mono"',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          'monospace',
        ],
      },
      backdropBlur: {
        xs: '2px',
      },
      spacing: {
        '4.5': '1.125rem',
      },
    },
  },
  plugins: [],
};

export default config;
