import { defineConfig } from 'vite'
import { sharedConfig } from './vite.config.mjs'
import { r } from './scripts/utils'
import packageJson from './package.json'

// bundling the content script using Vite
export default defineConfig(({ mode }) => {
  const isDevelopment = mode === 'development'

  return {
    ...sharedConfig,
    define: {
      __DEV__: isDevelopment,
      __NAME__: JSON.stringify(packageJson.name),
      // https://github.com/vitejs/vite/issues/9320
      // https://github.com/vitejs/vite/issues/9186
      'process.env.NODE_ENV': JSON.stringify(
        isDevelopment ? 'development' : 'production',
      ),
    },
    build: {
      watch: isDevelopment ? {} : undefined,
      outDir: r('extension/dist/background'),
      cssCodeSplit: false,
      emptyOutDir: false,
      sourcemap: isDevelopment ? 'inline' : false,
      lib: {
        entry: r('src/background/main.ts'),
        name: packageJson.name,
        formats: ['iife'],
      },
      rollupOptions: {
        output: {
          entryFileNames: 'index.mjs',
          extend: true,
        },
      },
    },
  }
})
