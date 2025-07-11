import { defineConfig } from 'rolldown'
import { dts } from 'rolldown-plugin-dts'
import pkg from './package.json' with { type: 'json' }
import fsExtra from 'fs-extra'
import path from 'node:path'

const { copyFileSync, ensureDirSync } = fsExtra

ensureDirSync(path.resolve(__dirname, 'dist'))
copyFileSync(
  path.resolve(__dirname, 'node_modules/faker-ui/dist/faker-ui.js'),
  path.resolve(__dirname, 'dist/faker-ui.js'),
)
copyFileSync(
  path.resolve(__dirname, 'node_modules/faker-ui/dist/faker-ui.css'),
  path.resolve(__dirname, 'dist/faker-ui.css'),
)

const external = [
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.peerDependencies || {}),
]

const sharedConfig = defineConfig({
  input: 'src/index.ts',
  external,
})

const esmConfig = defineConfig({
  ...sharedConfig,
  output: {
    format: 'esm',
    dir: 'dist',
    sourcemap: true,
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
