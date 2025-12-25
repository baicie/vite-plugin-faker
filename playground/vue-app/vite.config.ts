import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import faker from 'vite-plugin-faker'
import Inspect from 'vite-plugin-inspect'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    faker({
      loggerOptions: {
        level: 'info',
      },
    }),
    Inspect(),
  ],
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
    exclude: ['@baicie/faker-interceptor'],
  },
})
