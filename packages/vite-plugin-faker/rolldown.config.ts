import { defineConfig } from 'rolldown'
import { dts } from 'rolldown-plugin-dts'
import pkg from './package.json' with { type: 'json' }

const external = [
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.peerDependencies || {}),
  // Node.js 内置模块
  /^node:/,
]

const sharedConfig = defineConfig({
  input: 'src/index.ts',
  external,
  platform: 'node',
})

const esmConfig = defineConfig({
  ...sharedConfig,
  output: {
    format: 'esm',
    dir: 'dist',
    sourcemap: true,
  },
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
  watch: {
    clearScreen: false,
  },
})

export default defineConfig([esmConfig, dtsConfig])
