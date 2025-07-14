import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import faker from 'vite-plugin-faker'
// https://vite.dev/config/
export default defineConfig(() => {
  return {
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
    optimizeDeps: {
      exclude: ['vite-plugin-faker'],
    },
  }
})
