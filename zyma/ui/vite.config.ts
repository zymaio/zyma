import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // 核心：确保在 Tauri Release 模式下资源路径正确
  server: {
    host: '0.0.0.0',
    port: 5188,
    strictPort: true,
  },
})