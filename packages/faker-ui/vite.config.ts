import { defineConfig } from 'vite'
import { visualizer } from 'rollup-plugin-visualizer'
import { fileURLToPath } from 'node:url'

const needAnalyze = process.env.ANALYZE === 'true'

export default defineConfig(({ command }) => ({
  plugins: [needAnalyze && visualizer({ open: true })],
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: '@zeus-js/zeus',
  },
  define:
    command === 'serve'
      ? {
          'process.env.NODE_ENV': JSON.stringify('development'),
          __MOUNT_TARGET__: JSON.stringify('body'),
          __FAKER_WS_PORT__: JSON.stringify(''),
          __FAKER_LOGGER_OPTIONS__: JSON.stringify({}),
          __FAKER_UI_OPTIONS__: JSON.stringify({}),
          __FAKER_HOT_CONTEXT__: 'undefined',
        }
      : {
          'process.env.NODE_ENV': JSON.stringify('production'),
        },
  resolve: {
    alias: {
      '@baicie/faker-shared/browser': fileURLToPath(
        new URL('../faker-shared/src/browser.ts', import.meta.url),
      ),
    },
  },
  build: {
    emptyOutDir: false,
    target: 'es2015',
    lib: {
      entry: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
      formats: ['es'],
      fileName: 'index',
      cssFileName: 'index',
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
    sourcemap: true,
  },
}))
