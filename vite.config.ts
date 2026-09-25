import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // GitHub Pages serves this project from https://<user>.github.io/rollzilla/,
  // so assets must be referenced with that subpath in production builds.
  base: command === 'build' ? '/rollzilla/' : '/',
  plugins: [react()],
}))
