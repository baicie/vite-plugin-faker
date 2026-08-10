import { defineConfig } from 'rolldown'
import { dts } from 'rolldown-plugin-dts'

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

const dtsConfig = defineConfig({
  ...sharedConfig,
  output: {
    format: 'esm',
    dir: 'dist',
  },
  plugins: [dts({ emitDtsOnly: true })],
})

export default defineConfig([esmConfig, dtsConfig])
