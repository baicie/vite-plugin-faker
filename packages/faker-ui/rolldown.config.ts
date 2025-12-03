import postcss from 'rollup-plugin-postcss'
import { defineConfig } from 'rolldown'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vue from '@vitejs/plugin-vue'
import { visualizer } from 'rollup-plugin-visualizer'

const needAnalyze = process.env.ANALYZE === 'true'

export default defineConfig({
  input: 'src/index.ts',
  treeshake: true,
  output: {
    dir: 'dist',
    entryFileNames: 'index.js',
    format: 'esm',
    sourcemap: true,
    inlineDynamicImports: true,
    manualChunks: undefined,
  },
  plugins: [
    vue(),
    vueJsx(),
    postcss({
      extract: 'index.css',
      minimize: true,
    }),
    needAnalyze && visualizer({ open: true }),
  ],
  watch: {
    include: 'src/**',
  },
})
