import type { Config } from 'tailwindcss';
const config: Config = {
  content: ['./app/**/*.{ts,tsx}','./components/**/*.{ts,tsx}'],
  theme: { extend: { fontFamily: { sans: ['Inter','ui-sans-serif','system-ui'], mono:['JetBrains Mono','ui-monospace','SFMono-Regular'] }, boxShadow: { soft:'0 20px 60px rgba(0,0,0,.18)' } } },
  plugins: []
};
export default config;
