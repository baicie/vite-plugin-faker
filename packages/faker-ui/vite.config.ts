import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import postcss from 'rollup-plugin-postcss'

export default defineConfig({
  plugins: [
    vue(),
    vueJsx(),
    postcss({
      extract: 'index.css',
      minimize: true,
    }),
  ],
})
