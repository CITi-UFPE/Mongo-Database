import path from "path"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 3000,
    open: true,
    // Se seu backend roda em http://localhost:5000:
    // proxy: {
    //   '/api': 'http://localhost:5000'
    // }
  },
  build: {
    outDir: 'build'
  }
})