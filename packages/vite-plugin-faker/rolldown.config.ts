import path from 'node:path'
import { defineConfig } from 'rolldown'
import { dts } from 'rolldown-plugin-dts'
import fsExtra, { ensureFileSync } from 'fs-extra'
import pkg from './package.json' with { type: 'json' }

const { copyFileSync, ensureDirSync } = fsExtra
const __dirname = path.resolve(import.meta.url, '..')

const fakerUiPath = path.resolve(__dirname, 'node_modules/faker-ui/dist')
const fakerUiJsPath = path.resolve(fakerUiPath, 'faker-ui.js')
const fakerUiCssPath = path.resolve(fakerUiPath, 'faker-ui.css')
ensureFileSync(fakerUiJsPath)
ensureFileSync(fakerUiCssPath)
ensureDirSync(path.resolve(__dirname, 'dist'))
copyFileSync(fakerUiJsPath, path.resolve(__dirname, 'dist/faker-ui.js'))
copyFileSync(fakerUiCssPath, path.resolve(__dirname, 'dist/faker-ui.css'))

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
