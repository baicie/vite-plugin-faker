import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import path from 'node:path'

export default defineConfig({
  plugins: [svelte()],
  resolve: {
    alias: {
      $lib: path.resolve(__dirname, './src/lib'),
    },
  },
  define: {
    __MOUNT_TARGET__: JSON.stringify('body'),
    __FAKER_WS_PORT__: JSON.stringify(''),
    __FAKER_LOGGER_OPTIONS__: JSON.stringify({}),
    __FAKER_UI_OPTIONS__: JSON.stringify({}),
  },
})
