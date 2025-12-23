import { defineConfig } from 'rolldown'

export default defineConfig({
  input: 'index.ts',
  output: {
    format: 'esm',
    dir: './dist',
    sourcemap: true,
    extend: true,
  },
  treeshake: true,
  platform: 'browser',
  watch: {
    clearScreen: false,
  },
})
