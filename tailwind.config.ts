import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      fontFamily: {
        sans: ["IranYekan", "Shabnam", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "Noto Sans", "sans-serif"],
        serif: ["Shabnam", "Georgia", "Cambria", "Times New Roman", "Times", "serif"],
        mono: ["Shabnam", "Menlo", "Monaco", "Consolas", "Liberation Mono", "Courier New", "monospace"],
      },
    },
  },
  plugins: [
    require('tailwindcss-rtl')
  ],
}
export default config
