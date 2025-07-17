import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fse from 'fs-extra'
import { findWorkspacePackages } from '@pnpm/find-workspace-packages'
import { type Plugin, defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import autoprefixer from 'autoprefixer'
import prefixer from 'postcss-prefix-selector'
import { rootPath } from './../path'
import pkg from './package.json'

const { ensureDirSync, copySync } = fse
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const fakerUiPath = path.resolve(__dirname, 'dist')

const buildEndPlugin: Plugin = {
  name: 'build-end-plugin',
  apply: 'build',
  async closeBundle() {
    const workspacePackages = await findWorkspacePackages(rootPath)
    const vitePluginFaker = workspacePackages.find(
      pkg => pkg.manifest.name === 'vite-plugin-faker',
    )
    if (!vitePluginFaker) {
      throw new Error('vite-plugin-faker not found')
    }
    const targetPath = path.resolve(vitePluginFaker.dir, 'dist')
    // copy faker-ui.js to vite-plugin-faker/dist/faker-ui.js
    ensureDirSync(targetPath)
    copySync(fakerUiPath, targetPath, { overwrite: true })
  },
}
// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), vueJsx(), buildEndPlugin],
  build: {
    lib: {
      entry: 'src/main.ts',
      name: 'faker-ui',
      fileName: () => 'faker-ui.js',
      formats: ['es'],
    },
    // minify: true,
    sourcemap: true,
    rollupOptions: {},
  },
  css: {
    postcss: {
      plugins: [
        autoprefixer(),
        prefixer({
          prefix: `.${pkg.name}`,
          transform(prefix, selector, prefixedSelector, filePath, rule) {
            if (/^(?:html|body)/.test(selector)) {
              return selector.replace(/^(\S*)/, `$1 ${prefix}`)
            }

            if (/node_modules/.test(filePath)) {
              return selector // Do not prefix styles imported from node_modules
            }

            const annotation = rule.prev()
            if (
              annotation?.type === 'comment' &&
              annotation.text.trim() === 'no-prefix'
            ) {
              return selector // Do not prefix style rules that are preceded by: /* no-prefix */
            }

            return prefixedSelector
          },
        }),
      ],
    },
  },
})
