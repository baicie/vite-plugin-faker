import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'rolldown'
import { dts } from 'rolldown-plugin-dts'
import fsExtra from 'fs-extra'
import pkg from './package.json' with { type: 'json' }

const { copyFileSync, ensureDirSync, ensureFileSync } = fsExtra
const __filepath = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filepath)

const fakerUiPath = path.resolve(__dirname, '../faker-ui/dist')
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
