import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import { defineConfig } from 'rolldown'
import postcss from 'rollup-plugin-postcss'
import { visualizer } from 'rollup-plugin-visualizer'
import tailwindcss from '@tailwindcss/postcss'
import autoprefixer from 'autoprefixer'

const needAnalyze = process.env.ANALYZE === 'true'

export default defineConfig({
  input: 'src/index.ts',
  treeshake: true,
  output: {
    dir: 'dist',
    entryFileNames: 'index.js',
    format: 'esm',
    sourcemap: true,
    codeSplitting: true,
    manualChunks: undefined,
  },
  plugins: [
    vue(),
    vueJsx(),
    postcss({
      extract: 'index.css',
      minimize: false,
      plugins: [tailwindcss(), autoprefixer()],
    }),
    needAnalyze && visualizer({ open: true }),
  ],
  watch: {
    clearScreen: false,
  },
})
