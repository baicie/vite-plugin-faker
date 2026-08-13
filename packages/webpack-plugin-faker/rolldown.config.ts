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
  transform: {
    target: 'es2015',
  },
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

const cjsConfig = defineConfig({
  ...sharedConfig,
  output: {
    format: 'cjs',
    dir: 'dist',
    entryFileNames: '[name].cjs',
    exports: 'named',
    sourcemap: true,
  },
  transform: {
    target: 'es2015',
    define: {
      'import.meta.url': '__filename',
    },
  },
  watch: {
    clearScreen: false,
  },
})

export default defineConfig([esmConfig, cjsConfig, dtsConfig])
