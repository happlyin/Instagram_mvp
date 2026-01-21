import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/client/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Instagram 브랜드 컬러
        'instagram-primary': '#E4405F',
        'instagram-blue': '#3897F0',
        'instagram-purple': '#833AB4',
        'instagram-gradient-start': '#FD1D1D',
        'instagram-gradient-end': '#833AB4',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
