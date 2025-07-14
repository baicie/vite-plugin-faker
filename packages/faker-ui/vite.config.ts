import { findWorkspacePackages } from '@pnpm/find-workspace-packages'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import fse from 'fs-extra'
import path from 'node:path'
import { type Plugin, defineConfig } from 'vite'
import { rootPath } from './../path'

const { ensureDirSync, copySync } = fse
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
  plugins: [svelte(), buildEndPlugin],
  build: {
    lib: {
      entry: 'src/main.ts',
      name: 'faker-ui',
      fileName: () => 'faker-ui.js',
      formats: ['es'],
    },
    minify: true,
    sourcemap: true,
    rollupOptions: {},
  },
})
