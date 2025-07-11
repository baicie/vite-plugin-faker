import { type Plugin, defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { findWorkspacePackages } from '@pnpm/find-workspace-packages'

const buildEndPlugin: Plugin = {
  name: 'build-end-plugin',
  apply: 'build',
  async closeBundle() {
    const workspacePackages = await findWorkspacePackages()
    const vitePluginFaker = workspacePackages.find(
      pkg => pkg.name === 'vite-plugin-faker',
    )
    if (!vitePluginFaker) {
      throw new Error('vite-plugin-faker not found')
    }
    // copy faker-ui.js to vite-plugin-faker/dist/faker-ui.js
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
