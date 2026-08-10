import tailwindcss from '@tailwindcss/postcss'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import autoprefixer from 'autoprefixer'
import { visualizer } from 'rollup-plugin-visualizer'
import { fileURLToPath } from 'node:url'

const needAnalyze = process.env.ANALYZE === 'true'

export default defineConfig(({ command }) => ({
  plugins: [vue(), vueJsx(), needAnalyze && visualizer({ open: true })],
  css: {
    postcss: {
      plugins: [tailwindcss(), autoprefixer()],
    },
  },
  define:
    command === 'serve'
      ? {
          'process.env.NODE_ENV': JSON.stringify('development'),
          __MOUNT_TARGET__: JSON.stringify('body'),
          __FAKER_WS_PORT__: JSON.stringify(''),
          __FAKER_LOGGER_OPTIONS__: JSON.stringify({}),
          __FAKER_UI_OPTIONS__: JSON.stringify({}),
        }
      : {
          'process.env.NODE_ENV': JSON.stringify('production'),
        },
  build: {
    lib: {
      entry: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
      formats: ['es'],
      fileName: 'index',
      cssFileName: 'index',
    },
    sourcemap: true,
  },
}))
