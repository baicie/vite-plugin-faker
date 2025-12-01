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
    name: 'FakerInterceptor',
    extend: true,
  },
  treeshake: true,
  transform: {
    define: {
      'import.meta': '{}',
    },
  },
  platform: 'browser',
})

export default defineConfig([esmConfig])
