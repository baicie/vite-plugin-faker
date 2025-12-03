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
})

export default defineConfig([esmConfig])
