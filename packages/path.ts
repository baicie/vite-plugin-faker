import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export const rootPath = path.resolve(__dirname, '..')
export const packagesPath = path.resolve(rootPath, 'packages')
export const fakerUiPath = path.resolve(packagesPath, 'faker-ui')
export const vitePluginFakerPath = path.resolve(
  packagesPath,
  'vite-plugin-faker',
)
