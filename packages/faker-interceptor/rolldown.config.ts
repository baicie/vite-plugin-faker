import { defineConfig } from 'rolldown'
import workerLoaderPlugin from 'rollup-plugin-web-worker-loader'

const external = [...Object.keys({})]

const sharedConfig = defineConfig({
  input: 'src/index.ts',
  external,
})

const sharedWorkerConfig = defineConfig({
  input: 'src/worker/index.ts',
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
  plugins: [
    workerLoaderPlugin({
      targetPlatform: 'browser',
      inline: true,
      preserveSource: true,
      sourceMap: true,
    }),
  ],
})

const esmWorkerConfig = defineConfig({
  ...sharedWorkerConfig,
  output: {
    format: 'esm',
    dir: 'dist',
    entryFileNames: 'worker.js',
    sourcemap: true,
    extend: true,
  },
  treeshake: true,
  platform: 'browser',
  watch: {
    clearScreen: false,
  },
})

export default defineConfig([esmConfig, esmWorkerConfig])
