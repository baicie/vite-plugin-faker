import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import faker from 'vite-plugin-faker'
// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), faker()],
  server: {
    port: 3001,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
