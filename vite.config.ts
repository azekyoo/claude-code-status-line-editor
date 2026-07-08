import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // served at azekyo.com/claude-code-status-line-editor/ via GitHub Pages
  base: '/claude-code-status-line-editor/',
  plugins: [react()],
})
