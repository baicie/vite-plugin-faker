import { defineConfig } from 'rolldown'

const external = [...Object.keys({})]

const sharedConfig = defineConfig({
  input: 'src/index.ts',
  external,
})

const esmConfig = defineConfig({
  ...sharedConfig,
  output: {
    format: 'esm',
    dir: 'dist',
    entryFileNames: 'interceptor.js',
    sourcemap: true,
    extend: true,
  },
  treeshake: true,
  platform: 'browser',
  watch: {
    clearScreen: false,
  },
})

export default defineConfig([esmConfig])
